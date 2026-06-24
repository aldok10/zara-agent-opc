# Reversing WebAssembly & JavaScript Deobfuscation — Reference

Authorized-analysis knowledge base. Scope: reversing WebAssembly (Wasm) binary
modules and deobfuscating JavaScript. Use only on code you own or are authorized
to analyze.

---

## Part I: WebAssembly Binary Format & Reversing

### 1. Wasm Binary Format — Module Structure

A WebAssembly module is a binary container. Every module starts with an 8-byte
preamble followed by a sequence of sections. All integers are LEB128-encoded
(little-endian base 128 variable-length) [1](https://webassembly.github.io/spec/core/binary/values.html).

#### Preamble

```
Offset  Size  Value     Meaning
0x00    4     00 61 73 6d  Magic: "\0asm" (little-endian: 0x6d736100)
0x04    4     01 00 00 00  Version: 1
```

#### Section ID byte values

Sections appear in order. Custom sections (ID 0) can appear anywhere and multiple
times [2](https://danielmangum.com/posts/every-byte-wasm-module/).

| ID | Name         | Content                          |
|----|--------------|----------------------------------|
| 0  | Custom       | Vendor-specific metadata         |
| 1  | Type         | Function signatures              |
| 2  | Import       | Imported functions/memories/...  |
| 3  | Function     | Function type index list         |
| 4  | Table        | Table declarations               |
| 5  | Memory       | Linear memory declarations       |
| 6  | Global       | Global variables                 |
| 7  | Export       | Exported items                   |
| 8  | Start        | Start function index             |
| 9  | Element      | Table initialization             |
| 10 | Code         | Function bodies (bytecode)       |
| 11 | Data         | Data segments (initial memory)   |
| 12 | Data Count   | Number of data segments          |

Each section: `section_id (1 byte) | size (u32 LEB128) | content`.

#### LEB128 Encoding

LEB128 encodes integers in 7-bit groups. The MSB of each byte signals
continuation (1 = more bytes follow). Unsigned (ULEB128) and signed (SLEB128)
variants exist [3](https://en.wikipedia.org/wiki/LEB128).

```
Example: 624485 encoded as ULEB128

Binary:     10011000011101100101
7-bit grps: 0100110 0001110 1100101
With MSB:   00100110 10001110 11100101
Hex:        0x26 0x8E 0xE5
Output:     0xE5 0x8E 0x26   (little-endian byte order)
```

```python
# Python ULEB128 decode
def decode_uleb128(data, offset):
    result = 0
    shift = 0
    while True:
        byte = data[offset]
        result |= (byte & 0x7F) << shift
        shift += 7
        offset += 1
        if not (byte & 0x80):
            break
    return result, offset
```

---

### 2. Wasm Opcode Reference

WebAssembly is a stack-based virtual machine. Instructions consume operands
from the stack and push results [4](https://webassembly.github.io/spec/core/binary/instructions.html).

#### Control Flow Instructions

| Opcode | Byte | Instruction      | Stack signature             |
|--------|------|------------------|-----------------------------|
| 0x00   | 0    | unreachable      | [] → [] (trap)              |
| 0x01   | 1    | nop              | [] → []                     |
| 0x02   | 2    | block bt instr*  | [] → [bt]                   |
| 0x03   | 3    | loop bt instr*   | [] → [bt]                   |
| 0x04   | 4    | if bt instr* else instr* | [i32] → [bt]      |
| 0x05   | 5    | else             | (marks else branch)         |
| 0x0B   | 11   | end              | (ends block/loop/if/func)   |
| 0x0C   | 12   | br label         | [] → [] (branch out)        |
| 0x0D   | 13   | br_if label      | [i32] → []                  |
| 0x0E   | 14   | br_table N* label| [i32] → []                  |
| 0x0F   | 15   | return           | [] → []                     |
| 0x10   | 16   | call funcidx     | [args...] → [results...]    |
| 0x11   | 17   | call_indirect typeidx | [args...] → [results...]|

Block types are encoded as either `0x40` (empty), a single `valtype` byte,
or a signed LEB128 type index [5](https://webassemblyman.com/webassembly_control_flow.html).

#### Parametric / Variable Instructions

| Opcode | Byte | Instruction      | Stack signature      |
|--------|------|------------------|----------------------|
| 0x1A   | 26   | drop             | [t] → []             |
| 0x1B   | 27   | select           | [t t i32] → [t]     |
| 0x20   | 32   | local.get idx    | [] → [t]             |
| 0x21   | 33   | local.set idx    | [t] → []             |
| 0x22   | 34   | local.tee idx    | [t] → [t]            |
| 0x23   | 35   | global.get idx   | [] → [t]             |
| 0x24   | 36   | global.set idx   | [t] → []             |

#### Memory Instructions

Load/store opcodes include the alignment (encoded as `2^align`) and a
memory offset immediate [6](https://pengowray.github.io/wasm-ops).

| Opcode | Instruction      | Meaning                    |
|--------|------------------|----------------------------|
| 0x28   | i32.load         | Load i32 from memory       |
| 0x29   | i64.load         | Load i64 from memory       |
| 0x2A   | f32.load         | Load f32 from memory       |
| 0x2B   | f64.load         | Load f64 from memory       |
| 0x2C   | i32.load8_s      | Signed i8 load → i32       |
| 0x2D   | i32.load8_u      | Unsigned i8 load → i32     |
| 0x36   | i32.store        | Store i32 to memory        |
| 0x3F   | memory.size      | Current memory page count  |
| 0x40   | memory.grow      | Grow memory by N pages     |

#### Numeric Instructions (select examples)

| Opcode | Instruction | Meaning           |
|--------|-------------|-------------------|
| 0x41   | i32.const   | Push i32 literal  |
| 0x42   | i64.const   | Push i64 literal  |
| 0x43   | f32.const   | Push f32 literal  |
| 0x44   | f64.const   | Push f64 literal  |
| 0x46   | i32.eqz     | i32 == 0          |
| 0x47   | i32.eq      | i32 == i32        |
| 0x6A   | i32.add     | i32 + i32         |
| 0x6C   | i32.mul     | i32 * i32         |
| 0x71   | i32.and     | i32 & i32         |
| 0x74   | i32.shl     | i32 << i32        |
| 0x7C   | i64.add     | i64 + i64         |
| 0x93   | f32.sqrt    | f32 sqrt          |
| 0xA0   | f64.add     | f64 + f64         |
| 0xFC   | prefix      | Multi-byte opcodes (SIMD, reference types) |

Full opcode table available at Pengo Wray's interactive reference
[6](https://pengowray.github.io/wasm-ops).

---

### 3. Wasm Debug / Info Sections

#### Name Section (Custom Section ID 0, name "name")

The name section maps indices to human-readable strings. Its data is a sequence
of subsections [7](https://github.com/WebAssembly/extended-name-section/blob/main/document/core/appendix/custom.rst):

| Subsection ID | Name       | Maps                                     |
|---------------|------------|------------------------------------------|
| 0             | Module     | Module name                              |
| 1             | Function   | Function index → name                    |
| 2             | Local      | Function index → local index → name      |
| 3             | Label      | Block/loop labels                        |
| 4             | Type       | Type index → name                        |
| 5             | Table      | Table index → name                       |
| 6             | Memory     | Memory index → name                      |
| 7             | Global     | Global index → name                      |
| 8             | Element    | Element segment index → name             |
| 9             | Data       | Data segment index → name                |

Extracting names programmatically:

```python
def parse_name_section(payload):
    offset = 0
    names = {}
    while offset < len(payload):
        subsection_id = payload[offset]; offset += 1
        size, offset = decode_uleb128(payload, offset)
        content_end = offset + size
        if subsection_id == 1:  # Function names
            name_count, offset = decode_uleb128(payload, offset)
            for _ in range(name_count):
                idx, offset = decode_uleb128(payload, offset)
                name_len, offset = decode_uleb128(payload, offset)
                name = payload[offset:offset+name_len].decode('utf-8')
                offset += name_len
                names[f"func_{idx}"] = name
        else:
            offset = content_end
    return names
```

#### Producers Section

A custom section (name "producers") listing toolchain versions. Useful for
identifying the compiler [2](https://danielmangum.com/posts/every-byte-wasm-module/):

```
(language "C" "clang 17.0.6")
(processed-by "emscripten" "3.1.58")
(sdk "emscripten" "3.1.58")
```

#### DWARF Debug Info

Experimental DWARF support in wasm uses custom sections (`DWARF_*` or `.debug_*`).
Limited tool support; `wasm-objdump -x` can list them. Use `llvm-dwarfdump` on
wasm object files [8](https://github.com/WebAssembly/debugging).

---

### 4. Wasm Decompilation Tools

| Tool | Input | Output | Use case |
|------|-------|--------|----------|
| **wasm2wat** (wabt) | .wasm | .wat (S-expressions) | Full fidelity, spec-level text format |
| **wasm-decompile** (wabt) | .wasm | .dcmp (C-like) | More readable than WAT for reverse engineering |
| **wasm2c** (wabt) | .wasm | .c + .h | Convert to compilable C |
| **wasmdec** | .wasm | pseudo-C | Approximate C recovery |
| **wasm-objdump** (wabt) | .wasm | text section dump | Quick inspection, name section |
| **wasm-opt** (binaryen) | .wasm | .wasm | Optimize or transform wasm |
| **Ghidra + wasm plugin** | .wasm | decompiled C | Full static analysis with cross-references |
| **IDA Pro (Hex-Rays)** | .wasm | decompiled C | Commercial; limited wasm support |
| **Binary Ninja** | .wasm | BNIL/HLIL | Intermediate language approach |

WABT commands [9](https://github.com/WebAssembly/wabt):

```bash
# Binary to WAT text
wasm2wat module.wasm -o module.wat

# Binary to C-like decompiled output (most readable)
wasm-decompile module.wasm -o module.dcmp

# Binary to C source
wasm2c module.wasm -o module.c

# Inspect sections
wasm-objdump -x module.wasm

# Strip debug sections
wasm-strip module.wasm -o stripped.wasm

# Optimize with Binaryen
wasm-opt -O3 module.wasm -o optimized.wasm
```

Ghidra with the nneonneo/ghidra-wasm-plugin [10](https://github.com/nneonneo/ghidra-wasm-plugin)
supports all Wasm 1.0 opcodes, cross-references for calls and branches,
table/global function pointer tracking, and C stack pointer recovery.

---

### 5. Wasm RE Workflow: .wasm to Readable C

#### Step 1: Triage

```bash
file module.wasm          # WebAssembly (Wasm) binary module
wasm-objdump -x module.wasm | head -50   # imports, exports, sections
```

#### Step 2: Extract Imports

Imports tell you what syscalls or JS functions the wasm module expects.
Emscripten imports look like `env.__sys_open`, `env.__sys_write`,
`wasi_snapshot_preview1.fd_write` [11](https://www.forcepoint.com/blog/x-labs/analyzing-webassembly-binaries).

```
Import[4]:
 - env.__memory_base -> global
 - env.__table_base -> global
 - env.__indirect_function_table -> table
 - env.emscripten_memcpy -> function
```

#### Step 3: Decompile

```bash
wasm-decompile module.wasm -o module.dcmp
```

For Ghidra: create project, import .wasm, select "WebAssembly Executable" format,
let the pre-analyzer detect the C stack pointer, then auto-analyze.

#### Step 4: Understand Linear Memory Layout

Emscripten convention [12](https://emscripten.org/docs/compiling/WebAssembly.html):

```
Memory address layout (typical):
  0x0000 - stack area (grows down from __stack_base)
  0x4000 - static data / globals
  0x6000 - heap area (starts at __heap_base)
  ...
```

The stack pointer is stored in a mutable global (often `__stack_pointer` or
`global[0]`). Function prologues subtract from it; epilogues add back:

```wat
(func $example (result i32)
  global.get $__stack_pointer
  i32.const 16
  i32.sub
  local.tee 0
  global.set $__stack_pointer
  ...
)
```

#### Step 5: Recover Control Flow

Wasm uses structured control flow (block/loop/if). wasm2wat preserves this.
wasm-decompile converts it to if/else/while. For obfuscated wasm (control-flow
flattening), manual analysis or binary-level unflattening is needed.

---

### 6. Wasm Obfuscation

Wasm obfuscation mirrors native code obfuscation but operates on wasm
instructions and structures [13](https://github.com/HakonHarnes/wasm-obf).

#### Common Techniques

**Feature stripping**: Removing name section, producers section, and DWARF
info. The module becomes fully anonymous (functions named `f0`, `f1`, ...).

```bash
# Strip all custom sections (names, producers, debug)
wasm-strip module.wasm -o stripped.wasm
```

**Opaque blocks and unreachable code**: Inserting `block`/`loop` constructs
with unconditional branches that skip dead code. The dead code may contain
fake computation to confuse analysis.

```wat
;; Opaque block pattern
i32.const 0
if                      ;; condition is always false
  unreachable           ;; causes trap if reached (never reached)
end
```

**Control-flow flattening**: All basic blocks are moved to a single level
inside a loop with a state variable and switch dispatcher. The LLVM
Obfuscator (OLLVM) pattern [14](https://github.com/obfuscator-llvm/obfuscator/wiki/Control-Flow-Flattening):

```wat
;; After flattening, original blocks become cases in a switch
(loop $dispatch
  block $case0
  block $case1
    ...
    global.get $state_var
    br_table $case0 $case1 ...
  end
  ;; case 0: original block A
  ;; sets state to next index, branches back to dispatch
  ;; case 1: original block B
  ...
)
```

**String encoding in linear memory**: String literals are stored as byte
arrays in data segments and decoded at runtime (XOR, base64, or custom
schemes).

**Indirect call hiding**: Direct `call` instructions are replaced with
`call_indirect` via a function table, obscuring call targets.

**Tiger Wasm patterns**: Obfuscation research from the wasm-obf project
uses mutable globals for state, multi-level dispatch, and data-flow
obfuscation [13](https://github.com/HakonHarnes/wasm-obf).

---

### 7. Wasm Security

#### Sandbox Model

Wasm executes in a sandboxed environment with:
- No direct system call access (all I/O via imports)
- Linear memory isolation (single contiguous buffer, bounds-checked)
- No stack inspection / arbitrary control-flow hijacking
- Same-origin policy in browser embeddings [15](https://webassembly.org/)

#### CSP (Content Security Policy) Analysis

WebAssembly execution in browsers is controlled by CSP directives:
- `'wasm-unsafe-eval'` allows Wasm compilation (Chrome 97+)
- `'unsafe-eval'` also enables Wasm in most browsers
- Missing directives can prevent Wasm from loading

#### Side-Channel Attacks

**Spectre**: Wasm modules can perform cache-timing attacks similar to
JavaScript. The SharedArrayBuffer timing oracle exists in Wasm via
multi-threaded modules. Mitigations include `Cross-Origin-Opener-Policy`
and `Cross-Origin-Embedder-Policy` headers for site isolation [16](https://www.systemshardening.com/articles/wasm/wasm-jit-security).

**Instruction-timing**: Branch-dependent timing leaks in wasm. Research
on WaSCR (WebAssembly instruction-timing side channel repairer) uses
constant-time selectors to linearize branches [17](https://dl.acm.org/doi/abs/10.1145/3696410.3714693).

**Constant-time crypto RE**: When reversing wasm crypto, look for
constant-time selectors (select instruction) vs. conditional branches.
Branch-based crypto is likely vulnerable to timing attacks.

#### Reverse Engineering Cryptography in Wasm

Look for these patterns in decompiled wasm:
- `i32.xor` / `i32.and` / `i32.or` chains (encryption round functions)
- S-boxes stored as data segments (look for 256-byte arrays)
- Constant values: `0x63` (KECCAK round constant), `0x9E3779B9` (TEA),
  `0x6A09E667` (SHA-256 initial hash)

---

### 8. Emscripten / AssemblyScript

#### Emscripten Output Patterns

`emcc` produces a `.wasm` file plus JavaScript glue code [12](https://emscripten.org/docs/compiling/WebAssembly.html).

```bash
emcc hello.c -o hello.html     # HTML + JS + wasm
emcc hello.c -o hello.js       # JS glue + wasm (MODULARIZE for ES6)
```

**JS glue key exports**:
- `Module._main()` — entry point
- `Module.ccall()` — call C functions with type conversion
- `Module.cwrap()` — generate wrappers
- `Module.HEAP8/HEAPU8/HEAP16/HEAP32` — typed array views of linear memory
- `Module.wasmMemory` — the WebAssembly.Memory object
- `Module.stackSave()/stackRestore()` — explicit stack management

**Imports the wasm module expects**:
- `env.__stack_pointer` — mutable global for C stack
- `env.__memory_base` — base address of static data
- `env.__table_base` — base of indirect function table
- `env.emscripten_memcpy` — memcpy implementation
- `env.__sys_open` / `__sys_write` — POSIX syscall wrappers
- `wasi_snapshot_preview1.*` — WASI system calls

**Function naming convention**: C functions become `_function_name`,
C++ mangled names are preserved (use `EMSCRIPTEN_KEEPALIVE` or export list).

#### AssemblyScript Output

AssemblyScript compiles TypeScript-like syntax directly to wasm via Binaryen
[18](https://www.assemblyscript.org/).

```bash
npm install -g assemblyscript
npx asinit .
npm run asbuild           # produces build/optimized.wasm + build/optimized.wat
```

**AssemblyScript characteristics**:
- Uses its own runtime (`assemblyscript` or `stub` runtime)
- Allocator: `__new`, `__pin`, `__unpin` for GC
- Classes are lowered to struct-like globals + function tables
- Binds to JavaScript via `@assemblyscript/loader`
- Much smaller glue code than Emscripten (minimal JS runtime)
- UTF-16 string encoding (not UTF-8)

**RE tip**: AS-generated wasm has distinctive function names in the name
section (`__new`, `__collect`, `__visit`) and runtime imports.

---

## Part II: JavaScript Deobfuscation

### 9. JavaScript Obfuscation Techniques

Modern JS obfuscators layer multiple transformations [19](https://jscrambler.com/blog/javascript-obfuscation-the-definitive-guide).

#### String Array Encoding

All string literals are extracted into an array at the top of the file.
A decoder function retrieves them by index. The array is often rotated
at runtime via a shift/push loop [20](https://jsdeobfuscator.com/blog/deobfuscate-obfuscator-io).

```javascript
// Obfuscator.io string array pattern
var _0xabc = ['hello\x20world', 'log', 'console'];
(function(_0x1, _0x2) {
    while (--_0x2) _0x1.push(_0x1.shift());
})(_0xabc, 0x1b);
function _0xdecode(_0x3, _0x4) {
    return _0xabc[_0x3 - 0x0];
}
// Usage: _0xdecode('0x0') → "hello world"
```

#### Control-Flow Flattening

The original if/else/while structure is replaced with a flat switch
state machine [21](https://trynoguard.com/learn/javascript-deobfuscation-techniques):

```javascript
// Original
if (a > b) { foo(); } else { bar(); }

// After flattening
var _0xstate = 0;
while (true) {
    switch (_0xstate) {
        case 0: _0xstate = (a > b) ? 1 : 2; break;
        case 1: foo(); _0xstate = 3; break;
        case 2: bar(); _0xstate = 3; break;
        case 3: return _0xd();
    }
}
```

#### Dead Code Injection

Functions containing opaque predicates (always-true or always-false conditions
that cannot be statically proven) are injected [20](https://jsdeobfuscator.com/blog/deobfuscate-obfuscator-io):

```javascript
function _0xdead() {
    var _0xopaque;
    if (!![] && typeof window !== 'undefined' && 0x1 === 0x1) {
        _0xopaque = 0x42;
        // fake logic never reached
    }
}
```

#### Opaque Predicates

Expressions that are always true/false but look dynamic:

```javascript
// !![] always equals true
// ![] always equals false
// +[] === 0 → true
// []+[] === "" → true
```

#### Object Key Encryption

Property keys are encrypted and resolved at runtime:

```javascript
var _0xkey = _0xdecode('0x5');
var _0xobj = {};
_0xobj[_0xkey] = 'secret_value';
```

#### Self-Defending Code

The obfuscated file detects if it has been reformatted or beautified by
checking its own function source or string table integrity:

```javascript
function _0xselfdefend() {
    if (typeof _0xdecode === 'function' &&
        _0xdecode.toString().indexOf('return') === -1) {
        // code was modified — trigger break
        throw new Error('Self-defend triggered');
    }
}
```

#### Domain Locking

Checks `location.hostname` or `document.domain` at runtime:

```javascript
if (window.location.hostname !== 'authorized-domain.com') {
    window.location = 'https://google.com';
}
```

---

### 10. JS Obfuscator Tools

| Tool | Type | Key features |
|------|------|-------------|
| **javascript-obfuscator** | Open source | String array, control-flow flattening, dead code, domain lock, self-defending, RC4/base64 encoding |
| **Jscrambler** | Commercial | Polymorphic output, VM-based protection, code locks, runtime self-healing, anti-tampering |
| **Jsfuck** | Open source | Only 6 characters: `[]()!+`; converts any JS to these chars |
| **UglifyJS** | Open source | Minification + name mangling (not true obfuscation) |
| **Terser** | Open source | Minification + compression + name mangling (modern UglifyJS fork) |
| **Google Closure Compiler** | Open source | Dead code elimination, inlining, renaming (ADVANCED mode) |

Detecting each obfuscator by signatures [22](https://www.trickster.dev/post/javascript-obfuscation-techniques-by-example/):

- **javascript-obfuscator**: `_0x` prefix hex variable names, `(function(arr,n){while(--n)arr.push(arr.shift());})(...)` rotation pattern
- **Jscrambler**: Large `v_` prefixed variable structures, `jscrambler` string in source, very large files with VM bytecode
- **Jsfuck**: Only `[]()!+` characters, starts with `!![]`
- **UglifyJS/Terser**: Short single-letter names (`a`, `b`, `c`), no string encoding

#### Deobfuscation Tools

| Tool | Scope | Method |
|------|-------|--------|
| **de4js** | Multiple obfuscators | Online AST-based deobfuscator |
| **JStillery** | Control-flow | JavaScript deobfuscation + unflattening |
| **jsnice** | General | Statistical renaming + formatting |
| **unwebpack-sourcemap** | Webpack | Sourcemap extraction |
| **webcrack** | obfuscator.io + webpack | Unpack bundle + unobfuscate |
| **babel-plugin** | Custom | AST transform plugins |

---

### 11. JS Deobfuscation Techniques

#### AST-Based Transformation (Babel Pipeline)

The standard deobfuscation pipeline uses three stages:
parse → transform → generate [23](https://www.trickster.dev/post/javascript-ast-manipulation-with-babel-the-first-steps/).

```javascript
const babel = require('@babel/core');

function deobfuscate(code) {
    return babel.transformSync(code, {
        plugins: [
            stringArrayDecoder,  // resolve string lookups
            constantFolding,     // evaluate constants
            deadCodeRemoval,     // remove unreachable branches
            inlineFunctions,     // inline trivial functions
            renameShortIdents,   // rename a, b, c → descriptive
        ]
    }).code;
}
```

#### String Array Decoder (Babel Plugin)

```javascript
// Step 1: Extract and evaluate the string array after rotation
// The rotation IIFE mutates the array. Evaluate it in a sandbox.

module.exports = function stringArrayDecoder(babel) {
    const { types: t } = babel;
    return {
        visitor: {
            CallExpression(path) {
                // Match _0xNNNN('0xN') pattern
                // Replace with resolved string literal
                const callee = path.get('callee');
                if (!callee.isIdentifier()) return;
                if (!/^_0x[a-f0-9]+$/i.test(callee.node.name)) return;
                const args = path.get('arguments');
                if (args.length !== 1) return;
                if (!args[0].isStringLiteral()) return;
                const idx = parseInt(args[0].node.value, 16);
                if (stringArray && idx < stringArray.length) {
                    path.replaceWith(t.stringLiteral(stringArray[idx]));
                }
            }
        }
    };
};
```

#### Constant Folding

```javascript
// 1 + 2 → 3
// "hello" + " world" → "hello world"
module.exports = function constantFolding() {
    return {
        visitor: {
            BinaryExpression(path) {
                if (path.node.leadingComments) return;
                const { confident, value } = path.evaluate();
                if (confident) {
                    path.replaceWith(
                        babel.types.valueToNode(value)
                    );
                }
            }
        }
    };
};
```

#### Dead Branch Removal

```javascript
// if (true) { a } else { b } → a
module.exports = function deadBranchRemoval() {
    return {
        visitor: {
            IfStatement(path) {
                const { confident, value } = path.get('test').evaluate();
                if (confident) {
                    if (value) {
                        path.replaceWithMultiple(path.node.consequent.body);
                    } else if (path.node.alternate) {
                        path.replaceWithMultiple(path.node.alternate.body);
                    } else {
                        path.remove();
                    }
                }
            }
        }
    };
};
```

#### Dynamic Evaluation Capture

For obfuscation that requires runtime values (RC4 keys, computed property
names), instrument the JavaScript engine:

```bash
# Node.js: wrap the decoder function to log calls
node -e "
global._0xdecode = function(idx) {
    var result = originalDecoder(idx);
    console.log('_0xdecode(' + idx + ') => ' + JSON.stringify(result));
    return result;
};
require('./obfuscated.js');
" 2>&1 | grep '_0xdecode'
```

Using Proxy for getter interception:

```javascript
globalThis._0xabc = new Proxy(['hello', 'world'], {
    get(target, prop) {
        var result = target[prop];
        console.log(`Array access [${prop}] → ${JSON.stringify(result)}`);
        return result;
    }
});
```

---

### 12. AST Manipulation Workflow

#### Esprima + Estraverse + Escodegen Pipeline

The classic non-Babel pipeline [23](https://www.trickster.dev/post/javascript-ast-manipulation-with-babel-the-first-steps/):

```javascript
const esprima = require('esprima');
const estraverse = require('estraverse');
const escodegen = require('escodegen');

function deobfuscate(code) {
    var ast = esprima.parseScript(code);
    ast = estraverse.replace(ast, {
        enter: function(node) {
            // Replace obfuscated calls
            if (node.type === 'CallExpression' &&
                node.callee.type === 'Identifier' &&
                /^_0x/.test(node.callee.name)) {
                // resolve and return a Literal node
            }
        }
    });
    return escodegen.generate(ast, { format: { indent: { style: '  ' } } });
}
```

#### ASTExplorer Workflow

Use [astexplorer.net](https://astexplorer.net) for rapid prototyping:
1. Paste obfuscated code in left panel
2. Select `@babel/parser` as parser
3. Enable "Transform" and select `babelv7`
4. Write transform in the bottom-left panel
5. See deobfuscated output in bottom-right panel

#### Visitor Pattern Reference

| AST Node type | When to use |
|--------------|-------------|
| `StringLiteral` | Decode hex/unicode escapes, replace encoded strings |
| `NumericLiteral` | Constant folding, hex → decimal |
| `CallExpression` | Resolve decoder calls, inline functions |
| `MemberExpression` | Convert bracket to dot notation |
| `IfStatement` | Dead branch removal, opaque predicate elimination |
| `SwitchStatement` | Control-flow flattening recovery |
| `FunctionDeclaration` | Inline trivial functions, remove unused |
| `AssignmentExpression` | Track variable redefinitions |

---

### 13. VM-Based Obfuscation

Jscrambler's enterprise tier (and some other protectors) compiles JavaScript
into custom bytecode executed by an embedded VM [24](https://docs.jscrambler.com/).

#### Architecture

```
Original JS  →  Bytecode compiler  →  Custom bytecode
                                       ↓
                                  Embedded VM (JS)
                                       ↓
                                  Output
```

The VM consists of:
- An opcode handler array (switch or function table)
- A VM state object (registers, stack, program counter)
- Encrypted bytecode array

#### Recognizing VM Obfuscation

```javascript
// Jscrambler VM pattern
var v_jscrambler = [
    function(a, b) { return a + b; },
    function(a, b) { return a - b; },
    function(a, b) { return a ^ b; },
    // ... hundreds of handlers
];
var v_bytecode = [0x12, 0x45, 0xAB, ...];
var v_state = { pc: 0, stack: [], locals: {} };

function v_execute() {
    while (v_state.pc < v_bytecode.length) {
        var op = v_bytecode[v_state.pc++];
        v_jscrambler[op](v_state);
    }
}
```

#### Deobfuscation Approach

1. **Extract bytecode array**: Find the numeric array that stores encoded instructions
2. **Trace execution**: Use Proxy on the state object to log all operations
3. **Map opcodes**: Build a mapping between opcode indices and operations
4. **Reconstruct flow**: Convert traced operations back to JavaScript

```javascript
// Proxy-based trace for VM deobfuscation
var originalVm = vm_execute;
vm_execute = function() {
    var log = [];
    var stateProxy = new Proxy(v_state, {
        set: function(target, prop, value) {
            log.push(`state.${prop} = ${value}`);
            return Reflect.set(target, prop, value);
        }
    });
    // ... execute with proxy
    console.log(log.join('\n'));
};
```

---

### 14. Webpack / Bundler RE

#### Webpack Bundle Structure

A webpack bundle wraps modules in an IIFE with a module registry [25](https://gist.github.com/0xdevalias/8c621c5d09d780b1d321bfdb86d67cdd):

```javascript
// Simplified webpack runtime
(function(modules) {
    var installedModules = {};
    function __webpack_require__(moduleId) {
        if (installedModules[moduleId]) return installedModules[moduleId].exports;
        var module = installedModules[moduleId] = { exports: {} };
        modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
        return module.exports;
    }
    return __webpack_require__(0);  // entry point
})([
    /* 0 */ function(module, __webpack_exports__, __webpack_require__) {
        // entry module
    },
    /* 1 */ function(module, exports, require) {
        // module 1
    },
]);
```

#### Chunk Loading

Async chunks use `webpackJsonp` or `__webpack_chunk_load__`:

```javascript
// Chunk callback pattern
(window["webpackChunk_N_E"] = window["webpackChunk_N_E"] || [])
.push([["chunk-id"], {
    "./src/component.js": function(module, exports, __webpack_require__) {
        // chunk module code
    }
}]);
```

#### Module ID to Filename Mapping

Without source maps, module IDs are numeric. Maps can sometimes be recovered:
- `//# sourceURL=webpack:///./src/component.js` comments in source
- Webpack `output.devtoolModuleFilenameTemplate` in build config
- String literals containing file paths in module code

#### Decompilation Workflow

```bash
# Extract modules with webcrack (handles obfuscator.io + webpack)
npx webcrack bundle.js -o output-dir

# Or use unwebpack-sourcemap if source maps exist
npx unwebpack-sourcemap --sourcemap bundle.js.map --output output-dir

# Manual module extraction
grep -oP '"\./[^"]+' bundle.js | sort -u   # list module paths
```

#### Source Map Recovery

If a `.map` file is present (inline or separate):

```javascript
// Inline source map extraction
const sourceMap = require('source-map');
const code = fs.readFileSync('bundle.js', 'utf-8');
const match = code.match(/\/\/# sourceMappingURL=(.*\.map)/);
if (match) {
    // fetch or load .map file
    const rawMap = fs.readFileSync(match[1], 'utf-8');
    const consumer = new sourceMap.SourceMapConsumer(JSON.parse(rawMap));
    consumer.eachMapping(m => {
        console.log(`${m.source}:${m.originalLine} → bundle:${m.generatedLine}`);
    });
}
```

---

### 15. JS Anti-Debug / Anti-Tamper

#### DevTools Detection Techniques

**Console.log override detection**:

```javascript
// Check if console.log has been hooked
if (console.log.toString().indexOf('native') === -1) {
    // DevTools is open — console is being intercepted
}
```

**debugger keyword**:

```javascript
// Infinite debugger loop (breaks DevTools)
(function() {
    function debug() {
        debugger;
        setTimeout(debug, 100);
    }
    debug();
})();
```

**toString checks**:

```javascript
// Check if functions have been modified
function test() {}
if (test.toString() !== 'function test() {}') {
    // Function modified by DevTools
}
```

**performance.now timing**:

```javascript
// Detect debugger pauses by measuring execution time
var start = performance.now();
debugger;
var end = performance.now();
if (end - start > 100) {
    // Debugger was attached — paused execution
}
```

**Element ID checks**:

```javascript
// Check for DevTools-specific DOM elements
if (document.getElementById('__devtools__')) {
    // DevTools detected
}
```

**iframe-based detection**:

```javascript
// Create invisible iframe, check if DevTools breaks it
var iframe = document.createElement('iframe');
iframe.style.display = 'none';
document.body.appendChild(iframe);
var obj = iframe.contentWindow.Element.prototype;
```

#### Firefox / Chrome Specific Checks

```javascript
// Chrome DevTools detection
var isChrome = !!window.chrome;
var isFirefox = typeof InstallTrigger !== 'undefined';

// Firebug detection
if (window.console && window.console.firebug) {
    // Firebug is open
}
```

#### Anti-ANTI-Debug Bypasses

**Conditional breakpoints**: Use Chrome DevTools conditional breakpoints with
`false` condition to skip `debugger` statements without modifying code.

**DevTools patch**: Override anti-debug functions before the script loads:

```javascript
// Pre-inject via Chrome DevTools Snippets or browser extension
// before the obfuscated script runs:
const origToString = Function.prototype.toString;
Function.prototype.toString = function() {
    if (this === console.log) return 'function log() { [native code] }';
    return origToString.call(this);
};
const origPerformance = Performance.prototype.now;
Performance.prototype.now = function() {
    return origPerformance.call(this);  // return normal values
};
// Patch debugger:
window.__defineGetter__('debugger', function() { return function() {}; });
```

**Script replacement**: Use a MITM proxy (mitmproxy, Burp) or browser
extension to replace anti-debug snippets with no-ops before the page
processes them.

---

### 16. End-to-End Workflow

#### Wasm RE Quickstart

```bash
# 1. Triage
file module.wasm
wasm-objdump -x module.wasm

# 2. Decompile to C-like
wasm-decompile module.wasm -o module.dcmp

# 3. Generate WAT for instruction-level analysis
wasm2wat module.wasm -o module.wat

# 4. Static analysis in Ghidra (with wasm plugin)
ghidra   # import .wasm, analyze, navigate exports

# 5. Dynamic analysis in Chrome DevTools
#    -> Open Chrome, load the page
#    -> DevTools → Sources → WebAssembly → module
#    -> Set breakpoints in WAT, inspect stack/memory
```

#### JS Deobfuscation Quickstart

```bash
# 1. Identify obfuscator (strings, variable naming, patterns)
#    - Look for _0x prefix → obfuscator.io
#    - Look for v_ with VM bytecode → Jscrambler
#    - Look for webpackJsonp → webpack bundle

# 2. Deobfuscate with webcrack (handles most cases)
npx webcrack obfuscated.js -o cleaned/

# 3. AST-based deobfuscation with custom Babel plugin
node deobfuscate.js < obfuscated.js > cleaned.js

# 4. Dynamic decoding in Node.js (string arrays, RC4)
node -e "
// Sandbox-evaluate the string array setup
// then run a second pass to replace all decoder calls
require('./decoder_extractor.js');
" > decoded_strings.json

# 5. Manual analysis in Chrome DevTools
#    -> Pretty-print minified code ({} button)
#    -> Set breakpoints in the decoder function
#    -> Watch the call stack to understand flow
```

---

## Sources

1. WebAssembly Spec — Binary Values (LEB128):
   https://webassembly.github.io/spec/core/binary/values.html
2. Daniel Mangum — Understanding Every Byte in a WASM Module:
   https://danielmangum.com/posts/every-byte-wasm-module/
3. Wikipedia — LEB128:
   https://en.wikipedia.org/wiki/LEB128
4. WebAssembly Spec — Binary Instructions:
   https://webassembly.github.io/spec/core/binary/instructions.html
5. WebAssemblyMan — Control Flow Instructions:
   https://webassemblyman.com/webassembly_control_flow.html
6. Pengo Wray — WebAssembly Opcode Table:
   https://pengowray.github.io/wasm-ops
7. WebAssembly Extended Name Section Spec:
   https://github.com/WebAssembly/extended-name-section/blob/main/document/core/appendix/custom.rst
8. WebAssembly DWARF Debugging:
   https://github.com/WebAssembly/debugging
9. WABT — WebAssembly Binary Toolkit:
   https://github.com/WebAssembly/wabt
10. nneonneo/ghidra-wasm-plugin:
    https://github.com/nneonneo/ghidra-wasm-plugin
11. Forcepoint — Analyzing WebAssembly Binaries:
    https://www.forcepoint.com/blog/x-labs/analyzing-webassembly-binaries
12. Emscripten — Building to WebAssembly:
    https://emscripten.org/docs/compiling/WebAssembly.html
13. Håkon Harnes — wasm-obf (WebAssembly Obfuscation Research):
    https://github.com/HakonHarnes/wasm-obf
14. OLLVM — Control Flow Flattening:
    https://github.com/obfuscator-llvm/obfuscator/wiki/Control-Flow-Flattening
15. WebAssembly.org — Official Site (Security):
    https://webassembly.org/
16. System Hardening — WASM JIT Security:
    https://www.systemshardening.com/articles/wasm/wasm-jit-security
17. WaSCR — WebAssembly Instruction-Timing Side Channel Repairer (WWW '25):
    https://dl.acm.org/doi/abs/10.1145/3696410.3714693
18. AssemblyScript — Official Site:
    https://www.assemblyscript.org/
19. Jscrambler — JavaScript Obfuscation: The Definitive Guide:
    https://jscrambler.com/blog/javascript-obfuscation-the-definitive-guide
20. JSDeobfuscator — How to Deobfuscate obfuscator.io Code:
    https://jsdeobfuscator.com/blog/deobfuscate-obfuscator-io
21. TryNoGuard — JS Deobfuscation: Obfuscator.io, JScrambler, and Beyond:
    https://trynoguard.com/learn/javascript-deobfuscation-techniques
22. Trickster Dev — JavaScript Obfuscation Techniques by Example:
    https://www.trickster.dev/post/javascript-obfuscation-techniques-by-example/
23. Trickster Dev — JavaScript AST Manipulation with Babel:
    https://www.trickster.dev/post/javascript-ast-manipulation-with-babel-the-first-steps/
24. Jscrambler — Documentation:
    https://docs.jscrambler.com/
25. 0xdevalias — Reverse Engineering Webpack Apps (GitHub Gist):
    https://gist.github.com/0xdevalias/8c621c5d09d780b1d321bfdb86d67cdd
26. Jscrambler JavaScript Obfuscation E-Book:
    https://jscrambler.com/reports-and-e-books/javascript-obfuscation-e-book
27. JSUnpack Tech Blog — Webpack Bundle Decompilation Guide:
    https://www.jsunpack.tech/blog/webpack-bundle-decompilation-guide
28. eShard D810 — Control Flow Unflattening:
    https://www.eshard.com/blog/d810-a-journey-into-control-flow-unflattening/
29. NPM — webcrack:
    https://www.npmjs.com/package/webcrack
30. arXiv — From Obfuscated to Obvious: A Comprehensive JS Deobfuscation Tool:
    https://arxiv.org/abs/2512.14070
