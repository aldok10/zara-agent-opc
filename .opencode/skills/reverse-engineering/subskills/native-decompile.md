# Subskill: Native Decompilation

Scope: turn native (C/C++) code into pseudocode. Output is a hypothesis — verify against disassembly.

## Tools (pick by availability)
| Tool | Headless / CLI | Notes |
|------|----------------|-------|
| Ghidra | `analyzeHeadless <proj> -import <dll> -postScript Decompile.java` | free, scriptable (Java/PyGhidra), P-code |
| IDA + Hex-Rays | `idat -A -Ohexrays:...` / IDAPython | best pseudocode, paid |
| Binary Ninja | API + BNIL/MLIL/HLIL | great IL |
| radare2 + r2ghidra | `r2 -A`, `pdg` (ghidra decompiler in r2) | what we have locally |
| Cutter | rizin GUI | |

## Workflow
1. Load + auto-analyze. 2. Find the target function (export RVA, xref, string). 3. Decompile.
4. Recover signature (params from calling convention + usage), types/structs (`symbol-recovery.md`).
5. Rename + comment. 6. Verify against disassembly where it matters. 7. Label confidence.

## When the body is junk
Invalid/garbage linear disassembly + a non-standard high-entropy section = obfuscation/encryption
(see the MT5 `.cod0` case). Go to `anti-re.md` / `unpacking.md`; consider dynamic analysis to dump the
real code at runtime. Set honest confidence.

## Knowledge
`knowledge_read("native-decompilers.md")`, `knowledge_read("asm-abi.md")`,
`knowledge_read("symbol-type-recovery.md")`.

## Routing
Upstream: triage, pe-dll-format. Sibling: radare2, asm-abi, symbol-recovery. Downstream: rebuild.
