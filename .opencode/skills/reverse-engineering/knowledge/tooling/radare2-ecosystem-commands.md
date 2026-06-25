# radare2 Ecosystem & Command Cheat-Sheet

TL;DR: The radare2/rizin/Cutter ecosystem, full command grammar reference, and standalone tools (rabin2, radiff2, rasm2, ragg2).
See also: `radare2-visual-scripting.md`, `radare2-pe-esil-session.md`

> Scope: authorized analysis only (CTF, malware triage in a lab, your own
> binaries, licensed third-party code you are permitted to inspect). Nothing
> here is for circumventing protections you have no right to touch.

This is a working reference for the radare2 family of CLI reversing tools: the
`r2` shell, the standalone helper binaries (`rabin2`, `radiff2`, `rasm2`,
`ragg2`), the r2pipe scripting bridge, the r2ghidra decompiler plugin, and ESIL
emulation. It closes with an end-to-end worked DLL/PE analysis session.

---

## 1. The ecosystem: radare2, rizin, Cutter

### radare2

radare2 (`r2`) started in February 2006 as a small command-line hex editor with
64-bit offset support, written for forensic data recovery, and grew into a full
reverse-engineering framework supporting dozens of architectures and file
formats [1](https://www.wikiwand.com/en/articles/Radare2). The original author
is Sergi Alvarez (pancake). It is GPL, scriptable, and famous for its dense,
composable single-letter command grammar.

### rizin (the fork)

In late 2020 a group of core radare2 and Cutter contributors forked the project
into **rizin**, citing governance and human factors rather than a technical
schism; at fork time the two were nearly feature-identical
[2](https://reverseengineering.stackexchange.com/questions/32261/what-are-the-substantive-differences-between-radare2-and-rizin)
[8](https://en.wikipedia.org/wiki/Radare2). The rizin team described themselves
as former radare2 maintainers who handled issues, PRs, review, and CI, and who
also led Cutter [9](https://rizin.re/posts/announcing-rizin/).

Since the split the two have diverged in priorities:

- **rizin** emphasizes a cleaner, more consistent API, stable project
  save/load, documentation, and a curated plugin set. The Ghidra integration is
  shipped as **rz-ghidra** [10](https://github.com/rizinorg/cutter).
- **radare2** keeps its faster-moving, more experimental style and a larger
  surface of community plugins via `r2pm`.

Command names are largely shared (`aaa`, `pdf`, `s`, `izz`), so the cheat sheet
below applies to both. Where the tool names differ, rizin prefixes with `rz-`:
`rz-bin` / `rabin2`, `rz-diff` / `radiff2`, `rz-asm` / `rasm2`, `rz-gg` /
`ragg2`, and `rizin` / `r2` itself.

### Cutter (the GUI)

Cutter is the free, open-source Qt/C++ GUI. It began as **Iaito** (a Qt frontend
to r2), was renamed Cutter by Xarkes, and originally rode on radare2
[7](https://wenzel.gitbooks.io/r2book/content/first_steps/ui.html)
[6](https://goggleheadedhacker.com/post/intro-to-cutter). When the core team
forked to rizin, **Cutter moved with them** and is now powered by rizin
[3](https://cutter.re/cutter-2.0) [10](https://github.com/rizinorg/cutter).
Cutter 2.0 added a reliable project save/load mechanism built from scratch for
rizin [3](https://cutter.re/cutter-2.0). It also hosts the Ghidra decompiler
through the rz-ghidra plugin, giving you graph view, decompiler, and hex
side-by-side.

**Practical takeaway:** use `r2`/`rizin` on the CLI for triage, scripting, and
remote/headless work; use Cutter when you want a graph + decompiler GUI on top
of the same engine.

---

## 2. Command cheat-sheet

r2's grammar is compositional. Each letter is a verb or noun and they stack:
`p` print, `d` disassemble, `f` function, so `pdf` = print-disassemble-function.
Suffix `j` gives JSON, `q` gives quiet/terse, `*` gives r2-commands output, and
`?` gives help for any prefix (e.g. `aa?`, `p?`)
[12](https://gist.github.com/dorelo/2d5ea7a57cb60431dbe61c6c59dcb01f).

### Open / load

| Command | Description |
|---|---|
| `r2 file` | Open a binary in the r2 shell |
| `r2 -A file` | Open and run analysis (`aaa`) immediately |
| `r2 -d file` | Open under the debugger |
| `r2 -w file` | Open in write mode (patching) |
| `r2 -n file` | Open without loading bin headers (raw) |
| `r2 -A -e bin.relocs.apply=true file` | Open, analyze, apply relocs |
| `r2 - ` | Open empty (malloc://) for scratch/asm work |
| `o` / `ob` / `om` | List open files / bin objects / IO maps |

### Analysis

| Command | Description |
|---|---|
| `aa` | Analyze all (fast: functions + symbols) — run this first [12](https://gist.github.com/dorelo/2d5ea7a57cb60431dbe61c6c59dcb01f) |
| `aaa` | Analyze all + auto-name + references (the usual choice) |
| `aaaa` | Even deeper, experimental passes (slower, emulation-assisted) |
| `aac` | Analyze function calls |
| `aar` | Analyze data references / xrefs |
| `aab` | Analyze basic blocks |
| `af` | Analyze function at current offset |
| `afl` | List analyzed functions |
| `aflj` | List functions as JSON |
| `afi` | Function info at current offset |
| `afn newname` | Rename current function |
| `afvn old new` | Rename a function variable |
| `axt addr` | Find xrefs **to** an address |
| `axf addr` | Find xrefs **from** an address |

### Seeking & navigation

| Command | Description |
|---|---|
| `s addr` | Seek to address (accepts `sym.main`, `0x...`, flags) |
| `s sym.main` | Seek to a symbol/flag (Tab completes) |
| `s+ N` / `s- N` | Seek forward / backward N bytes |
| `s-` | Undo seek |
| `s..` | Seek back to previous |
| `$$` | Current offset (usable in expressions) |

### Print / disassemble

| Command | Description |
|---|---|
| `pdf` | Print disassembly of the current function [11](https://book.rada.re/refcard/intro.html) |
| `pdf @ sym.main` | Disassemble a named function without seeking |
| `pd N` | Print N instructions |
| `pd N @ addr` | Disassemble N instructions at addr |
| `pdc` | Pseudo-decompile current function (built-in) [13](https://book.rada.re/arch/decompile.html) |
| `pD N` | Disassemble N **bytes** |
| `px N` | Hexdump N bytes |
| `pxw` / `pxq` | Hexdump as words / qwords |
| `ps @ addr` | Print string at addr |
| `psz @ addr` | Print zero-terminated string |

### Binary info (RBin API, mirrors rabin2)

| Command | Description |
|---|---|
| `i` | Basic file info |
| `iI` | Binary headers / info (arch, bits, OS, PIE, canary, NX) [11](https://book.rada.re/refcard/intro.html) |
| `ie` | Entrypoint(s) |
| `iE` | Exports (and global symbols) |
| `ii` | Imports |
| `iS` | Sections |
| `ir` | Relocations |
| `il` | Linked libraries |
| `iz` | Strings in data sections |
| `izz` | Strings in the **whole binary** (scan everything) |
| `izzz` | Even more aggressive string scan |

### Flags, comments, visual

| Command | Description |
|---|---|
| `f` | List flags (bookmarks) |
| `f name @ addr` | Create a flag |
| `fr old new` | Rename a flag [11](https://book.rada.re/refcard/intro.html) |
| `CC text @ addr` | Add a comment at addr |
| `CC.` | Show comment here |
| `CCu text` | Overwrite comment |
| `V` | Enter visual mode |
| `VV` | Enter visual **graph** mode (call/CFG graph) |
| `p` / `P` | (in visual) rotate panes: hex, disasm, debug |
| `hjkl` | (in visual) move; Enter follows a jump/call |
| `;` | (in visual graph) add comment to basic block |
| `q` | Leave visual mode / quit |

### Search

| Command | Description |
|---|---|
| `/ foo` | Search for the string `foo` |
| `/x 90909090` | Search for byte sequence |
| `/x a1..c3` | Search bytes with wildcard nibbles |
| `/r sym.printf` | Find code referencing an address |
| `/R` | Search for ROP gadgets |
| `/a jmp eax` | Assemble and search for the opcode bytes |

### ESIL emulation

| Command | Description |
|---|---|
| `aei` | Initialize the ESIL VM (registers) [16](https://rada.re/advent/12.html) |
| `aeim` | Initialize ESIL VM memory (stack) |
| `aer reg=val` | Set a register in the ESIL VM |
| `aes` | ESIL step one instruction |
| `aeso` | ESIL step over |
| `aesu addr` | Step until address |
| `ae expr` | Evaluate a raw ESIL expression |
| `aetr` | Trace ESIL execution |

### Standalone tools (outside the shell)

| Tool | Purpose |
|---|---|
| `rabin2` | Extract headers/imports/exports/sections/strings [14](https://book.rada.re/tools/rabin2/intro.html) |
| `radiff2` | Diff two binaries (bytes, code, graph) [15](https://man.archlinux.org/man/radiff2.1.en) |
| `rasm2` | Assemble / disassemble single instructions |
| `ragg2` | Build tiny programs/shellcode from a C-like language |
| `rahash2` | Hash / checksum regions of a file |
| `rax2` | Base conversion, endian swaps, float bits |

---

## 3. Standalone tools in detail

### rabin2 — binary information extractor

rabin2 understands ELF, PE, MZ, Mach-O, Java CLASS, and any plugin-supported
format, and pulls out imports/exports, library dependencies, data-section
strings, xrefs, the entrypoint, sections, and architecture
[14](https://book.rada.re/tools/rabin2/intro.html)
[5](https://manpages.ubuntu.com/manpages/resolute/en/man1/rabin2.1.html).

```console
$ rabin2 -I sample.dll      # headers: arch, bits, OS, NX, PIE, canary
$ rabin2 -i sample.dll      # imports (functions pulled from other DLLs)
$ rabin2 -E sample.dll      # exports (what THIS dll provides)
$ rabin2 -s sample.dll      # symbols
$ rabin2 -S sample.dll      # sections (.text/.data/.rdata/.rsrc...)
$ rabin2 -z sample.dll      # strings in data sections
$ rabin2 -zz sample.dll     # strings, full scan
$ rabin2 -l sample.dll      # linked libraries
$ rabin2 -e sample.dll      # entrypoints
$ rabin2 -j -I sample.dll   # any of the above as JSON (-j)
```

Use rabin2 for fast, scriptable triage before you ever open the interactive
shell. It is the same RBin engine that backs the `i*` commands inside r2.

### radiff2 — binary diffing

radiff2 diffs code and data, supporting arch/bits selection, delta diffing,
graph diffing, and bin-info comparison
[15](https://man.archlinux.org/man/radiff2.1.en).

```console
$ radiff2 old.bin new.bin              # default byte-level diff
$ radiff2 -D old.bin new.bin           # show disassembly instead of hexpairs
$ radiff2 -C old.bin new.bin           # code/graph diff: off-A, ratio, off-B
$ radiff2 -g main old.bin new.bin      # graph diff of one function
$ radiff2 -i imports a.dll b.dll       # diff bin info (imports/exports/...)
$ radiff2 -s old.bin new.bin           # similarity / distance score
```

Patch analysis ("what changed between v1.0 and v1.1?") and malware variant
clustering are the bread-and-butter uses. `-C` is what you want for "which
functions changed", `-g` to drill into one of them.

### rasm2 — assembler / disassembler

```console
$ rasm2 -a x86 -b 64 'mov rax, 1; ret'     # assemble -> bytes
b801000000c3
$ rasm2 -a x86 -b 64 -d 'b801000000c3'     # disassemble bytes -> asm
mov eax, 1
ret
$ rasm2 -a x86 -b 64 'mov dword [rbp-0x1], 0x68' | rasm2 -a x86 -b 64 -d -
```

The pipe trick (assemble then disassemble the result) is a quick round-trip
sanity check on encodings [17](https://gist.github.com/pmauduit/3a81d409e2975fa546f5).
`-a` picks the architecture plugin, `-b` the bitness.

### ragg2 — tiny program / shellcode builder

ragg2 compiles a small C-like language into position-independent blobs, useful
for building test payloads and shellcode in a lab.

```console
$ ragg2 -a x86 -b 64 -i exec              # built-in exec egg
$ cat hi.r
main@global(0) { write(1, "hi\n", 3); }
$ ragg2 hi.r                              # compile the egg
$ ragg2 -a x86 -b 32 -f elf -o out hi.r   # emit an ELF
```
