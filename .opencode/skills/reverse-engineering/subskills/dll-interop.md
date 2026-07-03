# Subskill: DLL Exports & Interop

Scope: understand and CALL a DLL's exports from a modern language. The bridge from analysis to rebuild.

## Enumerate
`dllscan <dll>` (ours), `rabin2 -E`, `dumpbin /exports`, `pefile`, Dependencies (lucasg). Decode
ordinals vs names, forwarders ("OTHERDLL.Func"), and decoration (`extern "C"` vs C++ mangled).

## Recover the signature
From decompilation + calling convention: param count/types, return type. Wrong types → crashes. See
`asm-abi.md` + `symbol-recovery.md`.

## Call it from each language
| Lang | Mechanism |
|------|-----------|
| C | `LoadLibrary` + `GetProcAddress`, cast to fn pointer |
| Go | `golang.org/x/sys/windows` `NewLazyDLL`/`NewProc`, or `syscall.LoadDLL`+`FindProc`+`proc.Call` |
| PHP | FFI: `FFI::cdef("<C sigs>", "name.dll")` then call |
| C#/.NET | P/Invoke `[DllImport("name.dll")]` |
| Python | `ctypes.WinDLL("name.dll")` |

## COM-style DLLs
Many native DLLs (incl. MT5) export *factory* functions returning interface pointers
(`Create(..., void** out)`). Calling interface methods needs the **vtable layout** — recover method
order via RTTI/vftables (`symbol-recovery.md`), then call `vtable[i]` with `this` as the first arg
(Win64: RCX). Verify offsets dynamically (`dynamic-analysis.md`).

## Worked reference
`data/result-mt5-sdk/` — the MT5 DLL's 5 factory exports recovered and bound in Go + PHP.

## Knowledge
`knowledge_read("dll-exports-interop.md")`, `knowledge_read("go-tooling.md")`, `knowledge_read("php-tooling.md")`.

## Routing
Upstream: pe-dll-format, native-decompile. Downstream: rebuild.
