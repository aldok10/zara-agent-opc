# WebAssembly Binary Format & JavaScript Deobfuscation

TL;DR: Wasm is a stack-based VM with structured control flow. Modules start with `\0asm` magic + version 1. Use wabt (wasm2wat, wasm-decompile) for analysis, Ghidra with wasm plugin for full RE. JS deobfuscation uses AST transforms via Babel to resolve string arrays, fold constants, and remove dead branches.

---

## Wasm Binary Format

### Preamble (8 bytes)

```
00 61 73 6d  = "\0asm" magic
01 00 00 00  = version 1
```

### Section IDs

| ID | Name | Content |
|----|------|---------|
| 0 | Custom | Vendor metadata (name section, producers) |
| 1 | Type | Function signatures |
| 2 | Import | Imported functions/memories/globals |
| 3 | Function | Function type index list |
| 5 | Memory | Linear memory declarations |
| 6 | Global | Global variables |
| 7 | Export | Exported items |
| 10 | Code | Function bodies (bytecode) |
| 11 | Data | Data segments (initial memory) |

Each section: `id(1B) | size(ULEB128) | content`

### LEB128 Encoding

Variable-length integers. MSB of each byte = continuation bit.

```python
def decode_uleb128(data, offset):
    result, shift = 0, 0
    while True:
        byte = data[offset]
        result |= (byte & 0x7F) << shift
        shift += 7; offset += 1
        if not (byte & 0x80): break
    return result, offset
```

---

## Key Opcodes

### Control Flow

| Byte | Instruction | Stack |
|------|-------------|-------|
| 0x02 | block bt | structured block |
| 0x03 | loop bt | loop (branch back) |
| 0x04 | if bt | [i32] -> conditional |
| 0x0C | br label | branch out |
| 0x0D | br_if label | [i32] conditional branch |
| 0x0E | br_table | [i32] switch-like |
| 0x10 | call funcidx | function call |
| 0x11 | call_indirect | indirect (via table) |

### Variables/Memory

| Byte | Instruction |
|------|-------------|
| 0x20 | local.get idx |
| 0x21 | local.set idx |
| 0x23 | global.get idx |
| 0x28 | i32.load |
| 0x36 | i32.store |
| 0x3F | memory.size |
| 0x40 | memory.grow |

### Numeric

| Byte | Instruction |
|------|-------------|
| 0x41 | i32.const (push literal) |
| 0x42 | i64.const |
| 0x6A | i32.add |
| 0x6C | i32.mul |
| 0x71 | i32.and |
| 0x74 | i32.shl |

---

## Name Section (Custom, name="name")

Maps function/local/global indices to human-readable names. Subsection IDs:
- 0: Module name
- 1: Function names (most useful)
- 2: Local variable names

---

## Decompilation Tools

| Tool | Output | Use |
|------|--------|-----|
| `wasm2wat` | WAT (S-expressions) | Spec-level text, full fidelity |
| `wasm-decompile` | C-like pseudo-code | Most readable for RE |
| `wasm2c` | Compilable C + header | Convert to native |
| `wasm-objdump -x` | Section dump | Quick inspection |
| Ghidra + wasm plugin | Decompiled C | Full static analysis |

```bash
wasm2wat module.wasm -o module.wat
wasm-decompile module.wasm -o module.dcmp
wasm-objdump -x module.wasm | head -50
```

---

## Wasm RE Workflow

1. **Triage**: `wasm-objdump -x` (imports, exports, sections)
2. **Imports reveal syscalls**: `env.__sys_open`, `wasi_snapshot_preview1.fd_write`
3. **Decompile**: `wasm-decompile` for readable output
4. **Memory layout** (Emscripten): stack grows down, static data mid-range, heap at `__heap_base`
5. **Stack pointer**: mutable global, function prologues subtract from it

### Emscripten Patterns

- JS glue: `Module._main()`, `Module.ccall()`, `HEAP8/HEAPU8` views
- Imports: `env.__stack_pointer`, `env.__memory_base`, `wasi_*` syscalls
- C functions exported as `_function_name`

---

## Wasm Obfuscation

| Technique | Pattern |
|-----------|---------|
| Name stripping | `wasm-strip` removes custom sections |
| Control-flow flattening | Single loop + br_table dispatcher |
| Dead code | Opaque if(false) + unreachable |
| Indirect call hiding | call_indirect via table instead of direct call |
| String encoding | XOR/custom decode in data segments |

---

## JavaScript Deobfuscation

### Identifying Obfuscators

| Obfuscator | Signature |
|------------|-----------|
| obfuscator.io | `_0x` prefix variables, string array rotation IIFE |
| Jscrambler | `v_` prefix, VM bytecode array, large handler functions |
| Jsfuck | Only `[]()!+` characters |
| UglifyJS/Terser | Short single-letter names, no string encoding |
| Webpack bundle | `__webpack_require__`, `webpackJsonp` |

### Deobfuscation Pipeline (Babel)

```javascript
babel.transformSync(code, {
    plugins: [
        stringArrayDecoder,   // resolve _0xNNNN('0xN') calls
        constantFolding,      // 1+2 -> 3
        deadCodeRemoval,      // if(true){a}else{b} -> a
        inlineFunctions,      // inline trivial wrappers
        renameIdentifiers,    // a,b,c -> meaningful names
    ]
});
```

### String Array Pattern

```javascript
var _0xabc = ['hello', 'log', 'console'];
(function(arr, n) { while(--n) arr.push(arr.shift()); })(_0xabc, 0x1b);
function _0xdecode(idx) { return _0xabc[parseInt(idx, 16)]; }
// Usage: _0xdecode('0x0') -> resolved string
```

**Fix**: Evaluate the rotation IIFE, then replace all decoder calls with resolved literals.

### Control-Flow Flattening

Original if/else becomes flat switch state machine:
```javascript
var state = 0;
while (true) {
    switch (state) {
        case 0: state = (cond) ? 1 : 2; break;
        case 1: action1(); state = 3; break;
        case 2: action2(); state = 3; break;
        case 3: return;
    }
}
```

### VM-Based Obfuscation (Jscrambler)

Custom bytecode + embedded JS VM. Deobfuscation approach:
1. Extract bytecode array
2. Proxy VM state object to trace operations
3. Map opcode indices to operations
4. Reconstruct JS from trace

---

## JS Anti-Debug Bypasses

| Technique | Bypass |
|-----------|--------|
| `debugger` statement loops | Conditional breakpoint with `false` |
| `console.log.toString()` check | Override toString to return native string |
| `performance.now()` timing | Patch Performance.prototype.now |
| Self-defending (source check) | Replace via MITM proxy before load |

---

## Webpack Bundle RE

```javascript
// Bundle structure:
(function(modules) {
    function __webpack_require__(id) { ... }
    return __webpack_require__(0);  // entry
})([/* module 0 */, /* module 1 */, ...]);
```

```bash
npx webcrack bundle.js -o output-dir          # extract + deobfuscate
npx unwebpack-sourcemap --sourcemap bundle.js.map -o src/  # if map exists
```

---

## Quick Reference Commands

```bash
# Wasm triage
file module.wasm && wasm-objdump -x module.wasm

# JS deobfuscation
npx webcrack obfuscated.js -o cleaned/

# Dynamic JS string capture
node -e "require('./instrumented.js')" 2>&1 | grep decode
```
