# Subskill: radare2 / rizin

Scope: CLI reverse engineering with the toolchain present locally (`r2`, `rabin2`, 6.1.4).

## Essential session
```
r2 -A file.dll        # open + analyze (or aaa inside)
ie / iE               # entrypoints / exports
ii                    # imports
iz / izz              # strings (data section / whole binary)
afl                   # list functions
s <addr|sym>          # seek
pdf                   # disassemble function
pdg                   # decompile (r2ghidra, if installed)
VV                    # visual graph
```

## Standalone tools
- `rabin2 -I/-i/-E/-s/-z` — headers / imports / exports / symbols / strings (add `-j` for JSON).
- `radiff2 -A a.dll b.dll` — binary diff (version/patch comparison).
- `rasm2 -d <hex>` — disassemble bytes; `rasm2 '<asm>'` — assemble.

## Scripting
`r2pipe` (Python/Go/JS): `r2pipe.open("file.dll")` then `.cmd("aaa")`, `.cmdj("aflj")` for JSON.

## Knowledge
`knowledge_read("radare2-rizin.md")` — full cheat-sheet + worked DLL session.

## Routing
Sibling: native-decompile. Upstream: triage. Our `dllscan`/`redll` run first; r2 for depth.
