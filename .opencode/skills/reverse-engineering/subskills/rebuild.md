# Subskill: Rebuild (binary logic → modern Go/PHP)

Scope: the end goal. Turn recovered exports/pseudocode into code a programmer can read, maintain, and
call. Two layers: **interop bindings** (call the DLL as-is) and **reimplementation** (port the logic).

## Decision: bind or reimplement?

| Situation | Approach |
|-----------|----------|
| Need the DLL's behavior now, DLL is available | **Interop binding** (FFI/cgo/P-Invoke) — fastest, exact |
| Logic is self-contained + understood (algorithm, format codec) | **Reimplement** in pure Go/PHP — portable, no DLL |
| Cross-platform need, no Win DLL at runtime | Reimplement, or run DLL behind a service |
| Huge native C++ surface | Bind the surface, reimplement only the parts you must own |

Be honest: fully reimplementing a 6.9 MB native DLL is unrealistic. Deliver the **usable surface** +
selected algorithms with confidence labels.

## Interop binding patterns

- **Go**: `golang.org/x/sys/windows` `NewLazyDLL`/`NewProc` + `syscall.SyscallN` (Windows runtime), or
  cgo for a C shim. Map each export to a typed Go func; document the calling convention and arg types.
- **PHP**: FFI — `FFI::cdef("<C signatures>", "name.dll")` then call. Good for harness/interop.
- **C# / .NET**: P/Invoke `[DllImport]` — natural for a managed consumer of a native DLL.
- For a **.NET DLL**: you usually don't bind — you decompile to C# and either reference the assembly
  directly or port the C# to Go/PHP.

Signatures come from `dll-interop.md` + `symbol-recovery.md`: export name → params (count/type from
calling convention + decompiled usage) → return type. Wrong types = crashes; verify.

## Reimplementation workflow

1. Recover pseudocode for the target function (decompiler).
2. Recover types/structs (`symbol-recovery.md`); name everything.
3. Translate control flow to idiomatic Go/PHP (not a 1:1 transliteration — write it like a human would).
4. Build **test vectors**: known input→output captured from the original (via harness or sample data).
5. Port, then assert your reimplementation matches the vectors. Label confidence.
6. Document any branch you couldn't verify.

## Confidence labels (required on every function)

- **verified** — output matches original on test vectors / behavior confirmed.
- **inferred** — from decompiler + signatures, looks right, not behavior-tested.
- **guessed** — heuristic only (e.g. name + imports suggest purpose). Flag clearly.

## Output layout (for the MT5 acceptance)

```
data/result-mt5-sdk/rebuild/
├── go/   — typed export binding/client + any pure-Go logic + README with confidence table
└── php/  — FFI harness + typed client mirroring the surface + README
```

## Knowledge
`knowledge_read("dll-exports-interop.md")`, `knowledge_read("go-tooling.md")`,
`knowledge_read("php-tooling.md")`, `knowledge_read("symbol-type-recovery.md")`.
Load `golang-expert` / `php-expert` for code quality.

## Routing
Upstream: native-decompile, dotnet-decompile, dll-interop. Terminal step → write report.
