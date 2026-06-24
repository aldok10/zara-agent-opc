# Subskill: Dynamic Analysis

Scope: watch the binary run to confirm what static analysis only inferred. Required to upgrade
"inferred" signatures/behavior to "verified". **Isolated VM, no host network, snapshot first.**

## Debuggers
- **x64dbg/x32dbg** — the Windows workhorse. Breakpoints, step, memory/register watch, hardware bps.
- **WinDbg + TTD** — time-travel debugging: record once, step backward. Great for config/decrypt hunts.
- gdb + pwndbg/GEF (Linux), lldb (macOS).

## Instrumentation
- **Frida** — hook exported DLL functions, trace args/returns: `Interceptor.attach(addr, {onEnter,onLeave})`,
  `frida-trace -x dll -i "MT*"`. Stalker for tracing.
- API Monitor, ProcMon (file/registry/process), Process Explorer / System Informer.

## DLL detonation
- `rundll32 target.dll,ExportName` · `regsvr32` for COM DLLs · a custom
  `LoadLibrary`+`GetProcAddress` harness to call specific exports with controlled args.
- For MT5: a Windows host + the recovered Go/PHP binding calls `MTManagerVersion`/`MTManagerCreate`
  and walks the returned interface vtable → that's how you verify the inferred layout.

## Static + dynamic combo
Breakpoint at a decryption routine → dump plaintext. Break at OEP → dump unpacked image. Hook the
factory → inspect the returned object's vtable.

## Knowledge
`knowledge_read("dynamic-analysis.md")`.

## Routing
Upstream: anti-re, unpacking, native-decompile. Feeds verified facts back into the analysis report.
