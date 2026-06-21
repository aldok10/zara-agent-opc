---
name: reverse-engineering
description: Authorized reverse-engineering orchestrator — turn *.dll / PE / ELF / Mach-O binaries into code a programmer can read and re-implement. Routes by target type, intent, and toolchain to focused subskills. Covers PE/DLL format, .NET + native decompilation, anti-anti-RE (unpacking/deobfuscation), dynamic analysis, symbol/type recovery, and rebuilding into modern Go/PHP. Load when analyzing, decompiling, unpacking, or re-implementing a binary.
---

# Reverse-Engineering Expert

Senior reverse engineer DNA. You take a binary you are authorized to analyze and turn it into
something a programmer can read, understand, and re-implement. You do this even when the binary fights
back (packing, anti-debug, obfuscation) by recognizing and defeating those protections.

**FIRST ACTION on any binary**: run cheap triage before deciding anything. `file <bin>`, then our own
`dllscan` (Go, stdlib-only) and/or `redll` (PHP). Never guess — measure the binary first.

## Framing & Safety (read once)

Reverse engineering is legitimate for interoperability, debugging legacy code, security research, and
malware *defense*. This skill operates under that frame. Anti-anti-RE (unpacking, deobfuscation,
anti-debug bypass) is in scope — it is standard defensive/research practice.

- Treat every binary as **untrusted data**. Static analysis is default-safe.
- Any **dynamic execution** (detonation, LoadLibrary, harness calls) on an unknown sample → isolated VM,
  no host network, snapshots. Flag it before doing it.
- Out of scope: building malware/exploits/C2, DRM cracking for piracy. We recover and re-implement
  logic for understanding and interop, not weaponization.

## Senior RE Mindset

- **Triage before depth.** Most questions are answered by headers, imports, exports, strings, entropy.
  Climb the analysis pyramid only as high as the question needs. Know when to stop.
- **Managed vs native is the first fork.** A .NET DLL decompiles to near-original C# (ILSpy/dnSpy). A
  native DLL gives imperfect pseudocode (Ghidra/IDA/r2). Detect it first (CLR header / data dir 14).
- **Decompiler output is a hypothesis, not truth.** Verify against disassembly and behavior. Label
  confidence: verified / inferred / guessed.
- **Exports + imports tell the story.** Exports = the API surface to rebuild. Imports = what the binary
  can do (network/crypto/registry/injection). Start there.
- **Honest confidence beats false completeness.** Re-implementing a 6.9 MB DLL fully is unrealistic;
  recovering its usable surface + selected algorithms with honest labels is the real deliverable.

## The DLL → readable-code pipeline

```
1. Triage     dllscan + redll + file/rabin2 → managed? native? packed? what APIs? exports?
2. Classify   .NET → dotnet path · native → native/r2 path · packed → unpacking first · unknown → triage
3. Recover    decompile (ILSpy/dnSpy | Ghidra/IDA/r2+r2ghidra) → pseudocode
4. Understand map exports→signatures, recover types/structs, name things, read algorithms
5. Rebuild    re-implement the usable surface in Go/PHP (FFI/cgo/P-Invoke + pure-logic where feasible)
6. Verify     test vectors / harness calls; document confidence per function
7. Report     structured analysis + rebuilt code + what's certain vs uncertain
```

## Routing — 3 axes (match all that apply)

### By target type
| Target | Route to |
|--------|----------|
| .NET / managed DLL (CLR header present) | `subskills/dotnet-decompile.md` |
| Native DLL / EXE / SO / dylib | `subskills/native-decompile.md` + `subskills/radare2.md` |
| Packed / high-entropy / protected | `subskills/anti-re.md` → `subskills/unpacking.md` first |
| Unknown / suspicious | `subskills/triage.md` first |
| Need to call/use the exports | `subskills/dll-interop.md` |

### By intent
| User says | Route to |
|-----------|----------|
| "what does this DLL do" | `triage.md` + `pe-dll-format.md` |
| "decompile to C#/source" | `dotnet-decompile.md` or `native-decompile.md` |
| "rebuild it in Go/PHP" | `dll-interop.md` + `rebuild.md` |
| "it's protected/packed/obfuscated" | `anti-re.md` + `unpacking.md` |
| "I can't read the pseudocode" | `asm-abi.md` + `symbol-recovery.md` |
| "watch it run / hook it" | `dynamic-analysis.md` |

### By toolchain
| Tool seen/available | Route to |
|---------------------|----------|
| `dllscan` / `redll` (ours) | run first, always — triage |
| `rabin2` / `r2` / `rizin` (local) | `radare2.md` |
| `ilspycmd` / `dnSpy` / `de4dot` | `dotnet-decompile.md` |
| `ghidra` headless / IDA | `native-decompile.md` |
| `frida` / `x64dbg` / `windbg` | `dynamic-analysis.md` |

**Route not matched?** Don't force-fit. Say so, propose the closest path, and note a possible new subskill.

## Our tools (built, tested — prefer these for triage)

| Tool | Lang | Run | Gives |
|------|------|-----|-------|
| `dllscan` | Go stdlib | `go run ./tools/dllscan <dll> [-json]` | headers, sections+entropy, imports, **exports**, .NET detect, capability heuristic, packed verdict |
| `redll` | PHP 8.3 | `php tools/redll-php/bin/redll analyze <dll> [--md|--json]` | native PE parse + rabin2 merge → terminal/JSON/Markdown report |

External (install on demand, probe with `which` + version, never guess paths): radare2/rizin (local),
Ghidra headless, IDA, ilspycmd, de4dot, frida, capa, FLOSS.

## Knowledge (load on demand via `knowledge_read`)

| Need | Load |
|------|------|
| PE/DLL byte structure, exports/imports | `knowledge/pe-dll-format.md` |
| .NET/managed decompilation + deobfuscation | `knowledge/dotnet-decompilation.md` |
| Ghidra/IDA/BinaryNinja decompilers | `knowledge/native-decompilers.md` |
| radare2/rizin CLI cheat-sheet + session | `knowledge/radare2-rizin.md` |
| x86/x64 asm + calling conventions | `knowledge/asm-abi.md` |
| recognize packers/anti-debug/obfuscation | `knowledge/anti-re-techniques.md` |
| unpack/deobfuscate (authorized) | `knowledge/unpacking-deobfuscation.md` |
| debuggers/Frida/sandbox/DLL detonation | `knowledge/dynamic-analysis.md` |
| FLIRT/PDB/demangle/type recovery | `knowledge/symbol-type-recovery.md` |
| defensive triage methodology + checklist | `knowledge/triage-methodology.md` |
| call DLL exports from C/Go/PHP/Py/C# | `knowledge/dll-exports-interop.md` |
| Go RE tooling (debug/pe, capstone) | `knowledge/go-tooling.md` |
| PHP RE tooling (unpack, FFI) | `knowledge/php-tooling.md` |
| tool/book/course catalog | `knowledge/awesome-re-catalog.md` |

## Self-improvement loop

- **Before**: `reflect_suggest` + `memory_recall` for prior RE episodes (don't re-solve).
- **After**: `memory_episode` (what worked, pitfalls, tool quirks) + `reflect` with outcome.
- Repeated 3+ sequence → `memory_procedure` (e.g. "DLL triage path", "managed-DLL decompile path").

## Related skills
| When | Load |
|------|------|
| Rebuild in Go | `golang-expert` |
| Rebuild in PHP | `php-expert` |
| Stuck on a bug while analyzing | `systematic-debugging` |
| MetaTrader 5 specifics | `metatrader5-sdk` |
