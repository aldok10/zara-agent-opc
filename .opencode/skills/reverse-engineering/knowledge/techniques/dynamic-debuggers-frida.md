# Dynamic Analysis: Debuggers & Frida Instrumentation

TL;DR: x64dbg/WinDbg/gdb/lldb debugger workflows, breakpoint types, Time-Travel Debugging, and Frida dynamic instrumentation (hooking, tracing, Stalker).
See also: `dynamic-monitoring-sandbox-network.md`

---

## 1. Mental Model: What Dynamic Analysis Buys You

Static analysis tells you what *could* happen. Dynamic analysis tells you what *did* happen on this run, with real inputs. It defeats most obfuscation that survives static review:

- Packed/encrypted code unpacks itself in memory -- you dump it after the unpack stub runs.
- String decryption routines produce plaintext you can read at a breakpoint.
- Configuration, C2 domains, and keys materialize in memory or registers at the moment of use.
- Anti-analysis logic is visible as branches you can patch live.

The cost: the sample runs. Containment discipline is non-negotiable.

---

## 2. Debuggers

### 2.1 Tool Selection Table

| Tool | Platform | Best For |
|------|----------|----------|
| x64dbg / x32dbg | Windows | The default for Windows usermode RE |
| WinDbg / WinDbg Preview | Windows | Kernel debugging, TTD, deep OS work |
| gdb + GEF/pwndbg/peda | Linux (+macOS) | ELF, exploit dev, CTF |
| lldb | macOS, Linux | Mach-O, native macOS targets |

### 2.2 x64dbg -- The Windows Workhorse

Breakpoint types:

| Type | How | When to use |
|------|-----|-------------|
| Software (INT3) | `F2` or `bp <addr>` | General-purpose |
| Hardware | `bph <addr>` | Max 4; survives self-modifying code |
| Memory | right-click in dump > Breakpoint > Memory | Break when region is read/written/executed |
| Conditional | set `$breakpointcondition` expression | Break only when condition holds |

Stepping: `F7` step into, `F8` step over, `F9` run, `Ctrl+F9` run to return.

### 2.3 WinDbg + Time-Travel Debugging (TTD)

TTD records a process's full execution, then replays forwards *and backwards* deterministically. This is transformative for RE because you can run the sample once, capture everything, and analyze offline.

| Command | Meaning |
|---------|---------|
| `g` / `g-` | Go forward / backward |
| `p` / `p-` | Step over forward / backward |
| `!tt <pos>` | Travel to a trace position |
| `dx @$cursession.TTD...` | Query the TTD data model |

Typical TTD triage: travel to a key API event, then single-step *backward* until the interesting code is in scope.

### 2.5 gdb + GEF / pwndbg / peda (Linux)

Essential gdb commands for RE:

| Goal | Command |
|------|---------|
| Break at function | `break main` / `b *0x401000` |
| Hardware breakpoint | `hbreak <loc>` |
| Watchpoint (data) | `watch <expr>` (write), `rwatch` (read) |
| Step | `stepi` / `nexti` |
| Examine memory | `x/16xw <addr>`, `x/s <addr>` |
| Modify | `set $rax = 0` |

---

## 3. Frida -- Dynamic Instrumentation

Frida injects a JavaScript engine into a target process so you can hook, trace, and rewrite behavior at runtime without recompiling or patching on disk.

### 3.1 Core APIs

| API | Purpose |
|-----|---------|
| `Module.getExportByName(mod, name)` | Resolve an exported function's address |
| `Interceptor.attach(addr, callbacks)` | Hook entry (`onEnter`) and exit (`onLeave`) |
| `Interceptor.replace(addr, NativeCallback)` | Replace a function wholesale |
| `NativeFunction(addr, ret, [args])` | Call native functions from JS |
| `Stalker` | Instruction-level code tracing engine |

### 3.2 Hooking an Exported DLL Function

```js
const addr = Module.getExportByName("target.dll", "DecryptConfig");
Interceptor.attach(addr, {
  onEnter(args) {
    this.outBuf = args[1];
    console.log("DecryptConfig called, in=", args[0].readUtf8String());
  },
  onLeave(retval) {
    console.log("ret =", retval.toInt32());
    console.log("plaintext =", this.outBuf.readUtf8String());
  }
});
```

### 3.3 frida-trace -- Zero-Code Tracing

```bash
frida-trace -p <pid> -i "Decrypt*" -i "Crypt*"
frida-trace -f target.exe -i "send" -i "recv"
```

### 3.4 Stalker -- Instruction-Level Tracing

Stalker follows threads instruction by instruction, letting you record every call, basic block, or instruction, with register context. It is the basis for call-graph reconstruction and deobfuscation (e.g., unwinding control-flow-flattened code). Scope it to a single thread and a narrow address range or it floods.
