# radare2 / rizin / Cutter — Reverse Engineering Reference

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

---

## 4. Visual mode and graph mode

Enter visual mode with `V`; it is the interactive, key-driven alternative to the
prompt, with movement, a cursor mode for byte selection, and many keybindings
[18](https://book.rada.re/visual/intro.html).

Inside `V`:

- `p` / `P` rotate through panes (hex, disassembly, debug, words)
  [11](https://book.rada.re/refcard/intro.html).
- `hjkl` or arrows move; `Enter` follows the jump/call under the cursor.
- `c` toggles cursor mode; `:` drops to a one-shot r2 command line.
- `;` adds a comment, `d` defines data/function, `x` shows xrefs.

Press `p` after `V` to get the structured visual disassembler
[19](https://book.rada.re/visual/visual_disassembly.html). `VV` opens the
**graph mode** — the control-flow / call graph view. In graph mode `;` adds a
comment to the current basic block, `/` highlights text, and you navigate blocks
with the movement keys
[20](https://monosource.gitbooks.io/radare2-explorations/content/intro/visual_graphs.html).
Renaming the current function in graph/visual is bound through the visual menus
(`vdr` to rename, `vvs` to change a function signature)
[21](https://book.rada.re/visual/visual_menus.html). On the command line the
equivalents are `afn newname` for rename and `CC` for comments, which is what
you script.

---

## 5. r2pipe — scripting r2 from any language

r2pipe drives an r2 instance over a pipe, HTTP, or TCP socket, and exists for
Python, NodeJS, Go, Rust, Ruby, and more
[22](https://book.rada.re/scripting/r2pipe.html). The contract is dead simple:
you send r2 commands as strings and get text back; the `cmdj` variant parses
JSON command output into native objects.

### Python

```console
$ pip install r2pipe
```

```python
import r2pipe

r2 = r2pipe.open("sample.dll")   # open the binary
r2.cmd("aaa")                    # analyze
print(r2.cmd("afl"))             # function list as text
funcs = r2.cmdj("aflj")          # same, parsed into a list of dicts
for f in funcs:
    print(hex(f["offset"]), f["name"], f["size"])

# disassemble one export as text
print(r2.cmd("pdf @ sym.DllMain"))

# decompile via r2ghidra (if installed), JSON form
dec = r2.cmdj("pdgj @ sym.DllMain")
print(dec.get("code", ""))
r2.quit()
```

### Go

```console
$ r2pm -i r2pipe-go
```

```go
package main

import (
    "fmt"
    "github.com/radare/r2pipe-go"
)

func main() {
    r2p, err := r2pipe.NewPipe("sample.dll")
    if err != nil {
        panic(err)
    }
    defer r2p.Close()

    if _, err := r2p.Cmd("aaa"); err != nil {
        panic(err)
    }
    out, err := r2p.Cmd("pdf @ entry0")
    if err != nil {
        panic(err)
    }
    fmt.Println(out)
}
```

### NodeJS / JS

```console
$ npm install r2pipe
```

```js
const r2pipe = require("r2pipe");
r2pipe.open("sample.dll", (err, r2) => {
  if (err) throw err;
  r2.cmd("aaa", () => {
    r2.cmd("pdf @ entry0", (out) => {
      console.log(out);
      r2.quit();
    });
  });
});
```

Three transports are available: spawned pipe (`r2 -0`), HTTP (cloud-friendly),
and TCP socket (`r2 -c`) [22](https://book.rada.re/scripting/r2pipe.html). For
automation, always prefer `cmdj`/JSON output over scraping text.

---

## 6. Decompilers: pdc, r2dec, r2ghidra

For historical reasons r2's decompilers live under `pd` subcommands
[13](https://book.rada.re/arch/decompile.html):

| Command | Decompiler | Notes |
|---|---|---|
| `pdc` | Built-in pseudo-decompiler | Ships by default, works on **every** arch |
| `pdd` | r2dec | Install via `r2pm -i r2dec`; control-flow + cleanup |
| `pdg` | r2ghidra | Install via `r2pm -i r2ghidra`; Ghidra engine, no JVM |

Common output modifiers apply across all three: `pdgo`/`pddo`/`pdco` show the
offset of the instruction per line; `pdga`/`pdda`/`pdca` show a two-column
asm-vs-decompiled view; `pdgj`/`pddj`/`pdcj` emit JSON
[13](https://book.rada.re/arch/decompile.html).

**pdc** combines ESIL emulation, pseudo-disassembly, and signature/comment
metadata into a quick higher-level reading of a function. It does **no** real
control-flow recovery (no reconstructed if/else/for/while) and no dead-code
elimination, so it is verbose and noisy, but it is instant and universal, which
also makes it good input for feeding an LLM
[13](https://book.rada.re/arch/decompile.html).

**r2ghidra** ports the Ghidra decompiler (the C++ SLEIGH engine) into a native
r2 plugin so you get Ghidra-quality output without a Java runtime
[1g](https://github.com/radareorg/r2ghidra). Quality is not identical to full
Ghidra: r2ghidra does not feed the engine the same analysis/metadata that the
Ghidra GUI does, so complex structures and some details may be missed
[13](https://book.rada.re/arch/decompile.html). Tune it with `e r2ghidra.*`
variables (cast display, indent, line length, timeout). In rizin/Cutter the same
plugin is packaged as **rz-ghidra**
[2g](https://github.com/radareorg/r2ghidra-dec/blob/master/README.md).

Install and use:

```console
$ r2pm -U                 # refresh package db
$ r2pm -i r2ghidra        # build/install the plugin
$ r2 -A sample.dll
[0x...]> s sym.DllMain
[0x...]> pdg              # ghidra decompilation
[0x...]> pdgo             # with per-line offsets
```

---

## 7. PE / DLL specific workflow

DLLs are PE files whose value is in their **exports** (the functions they expose
to callers) and **imports** (what they pull from other DLLs). The triage loop:
list exports, find the entry, decompile the interesting function.

```console
# 1. fast outside-the-shell triage
$ rabin2 -I sample.dll        # confirm PE, arch (x86/x64), NX/ASLR
$ rabin2 -E sample.dll        # exports: the API this DLL offers
$ rabin2 -i sample.dll        # imports: VirtualAlloc, CreateProcess, ws2_32...
$ rabin2 -z sample.dll        # data strings (URLs, registry keys, mutexes)

# 2. open and analyze interactively
$ r2 -A sample.dll
[0x180001000]> iE             # exports inside the shell
[0x180001000]> ii             # imports
[0x180001000]> ie             # entrypoint (DllMain thunk for DLLs)
[0x180001000]> afl            # all functions r2 found

# 3. decompile an export
[0x180001000]> s sym.Export_DoWork
[0x180001000]> pdf            # disassembly
[0x180001000]> pdg            # ghidra decompiler (if installed)
```

Reading PE imports tells you the capability surface fast: `ws2_32.dll` →
networking, `CreateProcess`/`WinExec` → spawning, `RegSetValueEx` → persistence,
`CryptEncrypt` → crypto. Combine `ii` with `izz` strings to form a hypothesis
before you decompile a single function.

---

## 8. ESIL emulation basics

ESIL (Evaluable Strings Intermediate Language) is r2's stack-based intermediate
language and virtual machine for partial emulation. It can emulate instructions
of any architecture whose plugin implements it, **without running the live
process**, so you can hook memory accesses, reimplement external functions, and
decrypt strings statically
[16](https://rada.re/advent/12.html)
[23](https://book.rada.re/emulation/intro.html).

Typical setup sequence: initialize the VM, map a stack, set registers, then
step [16](https://rada.re/advent/12.html):

```console
[0x180001000]> aei            # init ESIL VM (registers)
[0x180001000]> aeim           # init ESIL VM memory (stack region)
[0x180001000]> aer rip=sym.decrypt   # point PC at the function
[0x180001000]> aer rdi=0x1400          # set up an argument register
[0x180001000]> aes            # step one instruction
[0x180001000]> aeso           # step over a call
[0x180001000]> aesu 0x18000105f       # run until an address
[0x180001000]> aer            # dump register state
[0x180001000]> ar rax         # read one register's value
```

After `aes` you inspect changed registers (`aer`/`ar`) and memory (`px @ rsp`).
This is how analysts pull plaintext out of a self-decrypting string routine
without ever executing the sample natively. **ESIL pins** let you hook a custom
r2 command at a specific address instead of running the standard ESIL
expressions, e.g. to stub out an imported function during emulation
[24](https://book.rada.re/emulation/pins.html). When you change CPU model on
embedded targets, re-run `aei` to reset registers and mapped memory
[25](https://book.rada.re/arch/8051.html).

---

## 9. Worked DLL analysis session

A realistic, narrated triage of a hypothetical `payload.dll` (an unknown 64-bit
Windows DLL pulled from a lab sandbox). The goal: classify capabilities, find
the export that does the work, and read its logic. Commands and representative
output are shown; addresses are illustrative.

### Step 1 — outside the shell: classify the file

```console
$ rabin2 -I payload.dll
arch     x86
bits     64
binsz    184320
bintype  pe
class    PE32+
machine  AMD 64
nx       true
pic      true
canary   false
crypto   false
endian   little
os       windows
subsys   Windows GUI
$ rabin2 -E payload.dll
[Exports]
nth paddr      vaddr      bind   type size lib name
1   0x00001230 0x180001230 GLOBAL FUNC 0    ServiceMain
2   0x00001560 0x180001560 GLOBAL FUNC 0    DoWork
3   0x000018a0 0x1800018a0 GLOBAL FUNC 0    DllRegisterServer
$ rabin2 -i payload.dll
[Imports]
ordinal=001 plt=0x180004018 bind=NONE type=FUNC name=kernel32.dll_VirtualAlloc
ordinal=002 plt=0x180004020 bind=NONE type=FUNC name=kernel32.dll_CreateThread
ordinal=003 plt=0x180004028 bind=NONE type=FUNC name=ws2_32.dll_connect
ordinal=004 plt=0x180004030 bind=NONE type=FUNC name=ws2_32.dll_send
ordinal=005 plt=0x180004038 bind=NONE type=FUNC name=advapi32.dll_RegSetValueExA
```

First read of the tea leaves: NX on, ASLR (`pic`) on, no canary. Exports name a
`ServiceMain` (Windows service) and a `DoWork`. Imports scream
network-plus-persistence: `ws2_32` connect/send, `VirtualAlloc` +
`CreateThread` (classic inject/run), `RegSetValueExA` (registry persistence).
Hypothesis before any disassembly: a service DLL that beacons out and persists
via the registry.

### Step 2 — strings to confirm the hypothesis

```console
$ rabin2 -zz payload.dll | head
000 0x00012040 0x180012040 18 19 .rdata ascii update.example.net
001 0x00012060 0x180012060 5  6  .rdata ascii :443
002 0x00012080 0x180012080 34 35 .rdata ascii SOFTWARE\Microsoft\Windows\Run\svc
003 0x000120b0 0x180012080 9  10 .rdata ascii /beacon
004 0x000120d0 0x1800120d0 12 13 .rdata ascii cmd.exe /c
```

A C2-looking host, port 443, a `...\Run\svc` registry path, a `/beacon` URI, and
`cmd.exe /c`. The hypothesis holds. Now go interactive to read the code.

### Step 3 — open, analyze, orient

```console
$ r2 -A payload.dll
[0x180001230]> e asm.bits      # sanity: 64
64
[0x180001230]> afl | head
0x180001230   42  1248  sym.ServiceMain
0x180001560   31   980  sym.DoWork
0x1800018a0    8   120  sym.DllRegisterServer
0x180002100   12   210  fcn.180002100
0x180002300    9   160  fcn.180002300
[0x180001230]> ie
[Entrypoints]
vaddr=0x180005000 paddr=0x00005000 type=program
```

`aaa` already ran via `-A`. Three named exports plus a couple of internal
functions r2 recovered on its own.

### Step 4 — xref the dangerous imports

Rather than read every function, pivot from the scary imports to whoever calls
them.

```console
[0x180001230]> axt sym.imp.ws2_32.dll_connect
sym.DoWork 0x1800015e2 [CALL] call sym.imp.ws2_32.dll_connect
[0x180001230]> axt sym.imp.advapi32.dll_RegSetValueExA
sym.DoWork 0x180001640 [CALL] call sym.imp.advapi32.dll_RegSetValueExA
[0x180001230]> axt sym.imp.kernel32.dll_CreateThread
sym.ServiceMain 0x1800012f0 [CALL] call sym.imp.kernel32.dll_CreateThread
```

So `ServiceMain` spins up a thread, and `DoWork` is where both the network
beacon and the registry persistence live. `DoWork` is the target.

### Step 5 — disassemble DoWork

```console
[0x180001230]> s sym.DoWork
[0x180001560]> pdf
/ (fcn) sym.DoWork 980
|   ; CALL XREF from sym.ServiceMain @ 0x1800012f8
|   0x180001560      push rbp
|   0x180001561      mov rbp, rsp
|   0x180001564      sub rsp, 0x120
|   0x18000156b      lea rcx, str.update.example.net  ; 0x180012040
|   0x180001572      call sym.resolve_host
|   0x180001577      mov rbx, rax
|   0x18000157a      mov edx, 0x1bb               ; 443
|   0x18000157f      mov rcx, rbx
|   0x180001582      call sym.imp.ws2_32.dll_connect
|   ...
|   0x180001640      call sym.imp.advapi32.dll_RegSetValueExA
|   0x180001645      xor eax, eax
|   0x180001647      leave
\   0x180001648      ret
```

The control flow matches the hypothesis: resolve host → connect on 443 → (loop
elided) → write the Run key. To see the branching clearly, drop into graph mode.

### Step 6 — graph mode and annotate

```console
[0x180001560]> VV
# (interactive) navigate basic blocks with hjkl, Enter to follow calls.
# press ; on the connect block to comment it, then q to exit.
```

Back on the prompt, annotate findings so they persist into the disassembly and
any exported report:

```console
[0x180001560]> CC beacon: TCP connect to update.example.net:443 @ 0x180001582
[0x180001560]> CC persistence: writes HKLM ...\Run\svc @ 0x180001640
[0x180001560]> afn beacon_and_persist        # rename DoWork to something honest
```

### Step 7 — decompile for a readable view

```console
[0x180001560]> pdg
ulong beacon_and_persist(void)
{
    SOCKET s;
    char  *host = "update.example.net";
    s = resolve_host(host);
    connect(s, 0x1bb, host);          // 443
    // ... send "/beacon", read tasking ...
    RegSetValueExA(hKey, "svc", 0, REG_SZ, cmdline, len);
    return 0;
}
```

(If `pdg` is unavailable, `pdc` gives a noisier but instant pseudo-C, and
`pdda`/`pdga` give the two-column asm-vs-pseudocode view for cross-checking.)

### Step 8 — emulate a helper to recover a hidden value

Suppose `resolve_host` actually XOR-decrypts the hostname from `.rdata` rather
than using a literal. Emulate it with ESIL instead of running the DLL:

```console
[0x180001560]> s sym.resolve_host
[0x180001572]> aei                       # init ESIL VM
[0x180001572]> aeim                       # map a stack
[0x180001572]> aer rip=sym.resolve_host
[0x180001572]> aer rcx=0x180012040        # pointer to the encrypted blob
[0x180001572]> aesu sym.resolve_host+0x60 # step until the decrypt loop ends
[0x180001572]> psz @ rax                  # read the decrypted output buffer
update.example.net
```

### Step 9 — diff against a known-good build

If you have a clean prior version, confirm exactly what the attacker added:

```console
$ radiff2 -C clean.dll payload.dll
0x180001560  0.31  0x180001560   # DoWork: heavily changed
0x1800018a0  1.00  0x1800018a0   # DllRegisterServer: identical
$ radiff2 -g DoWork clean.dll payload.dll   # graph-diff just that function
```

A 0.31 similarity on `DoWork` against 1.00 elsewhere localizes the malicious
change to a single function — the report writes itself.

### Step 10 — script the whole triage with r2pipe

Wrap the manual steps so the next sample is one command:

```python
import r2pipe, json

def triage(path):
    r2 = r2pipe.open(path)
    r2.cmd("aaa")
    info = r2.cmdj("ij")
    imports = [i["name"] for i in r2.cmdj("iij")]
    exports = [e["name"] for e in r2.cmdj("iEj")]
    suspicious = [i for i in imports
                  if any(k in i for k in
                         ("connect", "send", "VirtualAlloc",
                          "CreateThread", "RegSetValue", "WinExec"))]
    report = {
        "file": path,
        "arch": info["bin"]["arch"],
        "bits": info["bin"]["bits"],
        "nx": info["bin"].get("nx"),
        "exports": exports,
        "suspicious_imports": suspicious,
    }
    print(json.dumps(report, indent=2))
    r2.quit()

triage("payload.dll")
```

That closes the loop: rabin2 for fast classification, the r2 shell + xrefs to
locate the logic, graph mode and decompilers to read it, ESIL to recover hidden
values, radiff2 to localize changes, and r2pipe to automate it for the next
hundred samples.

---

## Sources

1. [Radare2 — Wikiwand](https://www.wikiwand.com/en/articles/Radare2)
2. [radare2 vs rizin differences — Reverse Engineering SE](https://reverseengineering.stackexchange.com/questions/32261/what-are-the-substantive-differences-between-radare2-and-rizin)
3. [Cutter 2.0 Release](https://cutter.re/cutter-2.0)
5. [rabin2(1) — Ubuntu manpage](https://manpages.ubuntu.com/manpages/resolute/en/man1/rabin2.1.html)
6. [Intro to Cutter — GoggleHeadedHacker](https://goggleheadedhacker.com/post/intro-to-cutter)
7. [User Interfaces — r2book](https://wenzel.gitbooks.io/r2book/content/first_steps/ui.html)
8. [Radare2 — Wikipedia](https://en.wikipedia.org/wiki/Radare2)
9. [Announcing Rizin!](https://rizin.re/posts/announcing-rizin/)
10. [rizinorg/cutter — GitHub](https://github.com/rizinorg/cutter)
11. [Reference Card — Official Radare2 Book](https://book.rada.re/refcard/intro.html)
12. [Radare2 Cheatsheet ECSC](https://gist.github.com/dorelo/2d5ea7a57cb60431dbe61c6c59dcb01f)
13. [Decompilers — Official Radare2 Book](https://book.rada.re/arch/decompile.html)
14. [Rabin2 intro — Official Radare2 Book](https://book.rada.re/tools/rabin2/intro.html)
15. [radiff2(1) — Arch manpage](https://man.archlinux.org/man/radiff2.1.en)
16. [Advent of Radare2: ESIL](https://rada.re/advent/12.html)
17. [radare2 cheat sheet — pmauduit gist](https://gist.github.com/pmauduit/3a81d409e2975fa546f5)
18. [Visual Mode intro — Official Radare2 Book](https://book.rada.re/visual/intro.html)
19. [Visual Disassembly — Official Radare2 Book](https://book.rada.re/visual/visual_disassembly.html)
20. [Visual Graphs — Radare2 Explorations](https://monosource.gitbooks.io/radare2-explorations/content/intro/visual_graphs.html)
21. [Visual Menus — Official Radare2 Book](https://book.rada.re/visual/visual_menus.html)
22. [R2pipe — Official Radare2 Book](https://book.rada.re/scripting/r2pipe.html)
23. [Emulation intro — Official Radare2 Book](https://book.rada.re/emulation/intro.html)
24. [ESIL Pins — Official Radare2 Book](https://book.rada.re/emulation/pins.html)
25. [Notes on 8051 — Official Radare2 Book](https://book.rada.re/arch/8051.html)
- [r2ghidra — GitHub](https://github.com/radareorg/r2ghidra)
- [rz-ghidra README](https://github.com/radareorg/r2ghidra-dec/blob/master/README.md)
