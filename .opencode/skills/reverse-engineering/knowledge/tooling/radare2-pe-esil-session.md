# radare2 PE/DLL Workflow, ESIL Emulation & Worked Session

TL;DR: DLL-specific triage workflow, ESIL emulation for static decryption, and a full narrated analysis session with r2pipe automation.
See also: `radare2-ecosystem-commands.md`, `radare2-visual-scripting.md`

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

Reading PE imports tells you the capability surface fast: `ws2_32.dll` ->
networking, `CreateProcess`/`WinExec` -> spawning, `RegSetValueEx` -> persistence,
`CryptEncrypt` -> crypto. Combine `ii` with `izz` strings to form a hypothesis
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

### Step 1 -- outside the shell: classify the file

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

### Step 2 -- strings to confirm the hypothesis

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

### Step 3 -- open, analyze, orient

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

### Step 4 -- xref the dangerous imports

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

### Step 5 -- disassemble DoWork

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

The control flow matches the hypothesis: resolve host -> connect on 443 -> (loop
elided) -> write the Run key. To see the branching clearly, drop into graph mode.

### Step 6 -- graph mode and annotate

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

### Step 7 -- decompile for a readable view

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

### Step 8 -- emulate a helper to recover a hidden value

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

### Step 9 -- diff against a known-good build

If you have a clean prior version, confirm exactly what the attacker added:

```console
$ radiff2 -C clean.dll payload.dll
0x180001560  0.31  0x180001560   # DoWork: heavily changed
0x1800018a0  1.00  0x1800018a0   # DllRegisterServer: identical
$ radiff2 -g DoWork clean.dll payload.dll   # graph-diff just that function
```

A 0.31 similarity on `DoWork` against 1.00 elsewhere localizes the malicious
change to a single function -- the report writes itself.

### Step 10 -- script the whole triage with r2pipe

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

1. [Radare2 -- Wikiwand](https://www.wikiwand.com/en/articles/Radare2)
2. [radare2 vs rizin differences -- Reverse Engineering SE](https://reverseengineering.stackexchange.com/questions/32261/what-are-the-substantive-differences-between-radare2-and-rizin)
3. [Cutter 2.0 Release](https://cutter.re/cutter-2.0)
5. [rabin2(1) -- Ubuntu manpage](https://manpages.ubuntu.com/manpages/resolute/en/man1/rabin2.1.html)
6. [Intro to Cutter -- GoggleHeadedHacker](https://goggleheadedhacker.com/post/intro-to-cutter)
7. [User Interfaces -- r2book](https://wenzel.gitbooks.io/r2book/content/first_steps/ui.html)
8. [Radare2 -- Wikipedia](https://en.wikipedia.org/wiki/Radare2)
9. [Announcing Rizin!](https://rizin.re/posts/announcing-rizin/)
10. [rizinorg/cutter -- GitHub](https://github.com/rizinorg/cutter)
11. [Reference Card -- Official Radare2 Book](https://book.rada.re/refcard/intro.html)
12. [Radare2 Cheatsheet ECSC](https://gist.github.com/dorelo/2d5ea7a57cb60431dbe61c6c59dcb01f)
13. [Decompilers -- Official Radare2 Book](https://book.rada.re/arch/decompile.html)
14. [Rabin2 intro -- Official Radare2 Book](https://book.rada.re/tools/rabin2/intro.html)
15. [radiff2(1) -- Arch manpage](https://man.archlinux.org/man/radiff2.1.en)
16. [Advent of Radare2: ESIL](https://rada.re/advent/12.html)
17. [radare2 cheat sheet -- pmauduit gist](https://gist.github.com/pmauduit/3a81d409e2975fa546f5)
18. [Visual Mode intro -- Official Radare2 Book](https://book.rada.re/visual/intro.html)
19. [Visual Disassembly -- Official Radare2 Book](https://book.rada.re/visual/visual_disassembly.html)
20. [Visual Graphs -- Radare2 Explorations](https://monosource.gitbooks.io/radare2-explorations/content/intro/visual_graphs.html)
21. [Visual Menus -- Official Radare2 Book](https://book.rada.re/visual/visual_menus.html)
22. [R2pipe -- Official Radare2 Book](https://book.rada.re/scripting/r2pipe.html)
23. [Emulation intro -- Official Radare2 Book](https://book.rada.re/emulation/intro.html)
24. [ESIL Pins -- Official Radare2 Book](https://book.rada.re/emulation/pins.html)
25. [Notes on 8051 -- Official Radare2 Book](https://book.rada.re/arch/8051.html)
- [r2ghidra -- GitHub](https://github.com/radareorg/r2ghidra)
- [rz-ghidra README](https://github.com/radareorg/r2ghidra-dec/blob/master/README.md)
