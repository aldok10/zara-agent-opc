# Linux RE Tool Guide & Analyst Workflow

TL;DR: Complete Linux RE tool guide (binutils, LIEF, pwntools, GDB plugins),
quick reference commands, ELF analysis with Python, and analyst triage workflow
for ELF binary assessment.

See also: linux-packing-instrumentation.md, linux-dynamic-linker-init.md, linux-syscalls-signals.md, linux-anti-debug-rdebug.md

---

## 21. Linux RE Tool Guide [6][7][8][9][44]

### 21.1 Core toolset

| Tool | Package | Use for |
|------|---------|---------|
| `readelf` | binutils | Parse all ELF structures (headers, sections, segments, symbols, relocs, notes, unwind) |
| `objdump` | binutils | Disassembly (Intel or AT&T), section dumps, dynamic symbol inspection |
| `eu-readelf` | elfutils | Alternative readelf with additional checks (elfutils variant) |
| `eu-objdump` | elfutils | Alternative objdump |
| `nm` | binutils | List symbols from `.symtab` / `.dynsym` |
| `objcopy` | binutils | Copy/convert/modify ELF sections |
| `strip` | binutils | Remove `.symtab`, `.strtab`, debug sections |
| `patchelf` | patchelf | Change RPATH, interpreter, add/remove sections |
| `ldd` | glibc | Print shared library dependencies (note: runs the binary!) |
| `size` | binutils | Section sizes |
| `strings` | binutils | Extract printable strings |

### 21.2 Specialized RE tools

| Tool | Language | Use for |
|------|----------|---------|
| LIEF | Python/C++/Rust | Parse, modify, rebuild ELF binaries programmatically [7] |
| pwntools | Python | ELF class for quick analysis, GDB integration, ROP gadget search [8] |
| cle (pwntools) | Python | Binary loading abstraction for angr/pwntools |
| pyelftools | Python | Pure Python ELF parsing (no dependencies) |
| `strace` | Linux | Trace all syscalls with timing |
| `ltrace` | Linux | Trace library calls (deprecated on modern glibc) |
| `perf` | Linux | Performance profiling, event counting, HW breakpoints |
| `valgrind` | Linux | Memory debugging (helgrind, memcheck) |
| GEF / pwndbg | Python | GDB plugin for enhanced RE (heap, pattern search, ROP) |

### 21.3 Quick reference commands

```bash
# Basic triage
readelf -h /bin/ls          # ELF header
readelf -l /bin/ls          # Program headers (segments)
readelf -S /bin/ls          # Section headers
readelf -s /bin/ls          # Dynamic symbols
readelf -r /bin/ls          # Relocations
readelf -d /bin/ls          # Dynamic section
readelf -n /bin/ls          # Notes
readelf -V /bin/ls          # Version info
readelf -wF /bin/ls         # Unwind info (.eh_frame)

# Disassembly
objdump -d /bin/ls          # Full disassembly (AT&T by default)
objdump -d -M intel /bin/ls # Intel syntax
objdump -d -j .plt -M intel /bin/ls  # Just PLT
objdump -s -j .rodata /bin/ls  # Hex dump section data

# Strings
strings /bin/ls | head -20
strings -a /bin/ls | grep -E 'GLIBC|GCC'

# Dependencies
patchelf --print-needed /bin/ls
readelf -d /bin/ls | grep NEEDED

# Library path manipulation (for analysis)
patchelf --set-rpath /tmp/fake-libs /bin/myapp
patchelf --set-interpreter /tmp/ld-custom.so /bin/myapp
```

### 21.4 LIEF Python for ELF analysis [7]

```python
import lief

binary = lief.parse("/bin/ls")

# Headers
print(f"Type: {binary.header.file_type}, Machine: {binary.header.machine}")
print(f"Entry point: {hex(binary.header.entrypoint)}")
print(f"Image base: {hex(binary.imagebase)}")

# Segments
for seg in binary.segments:
    print(f"  {seg.type}: vaddr={hex(seg.virtual_address)} "
          f"size={hex(seg.virtual_size)} flags={seg.flags}")

# Sections
for sec in binary.sections:
    print(f"  {sec.name}: addr={hex(sec.virtual_address)} "
          f"size={hex(sec.size)} flags={sec.flags}")

# Dynamic symbols (imported)
for sym in binary.dynamic_symbols:
    if sym.type == lief.ELF.SYMBOL_TYPES.FUNC:
        print(f"  {sym.name} -> {hex(sym.value)} [{'imported' if sym.imported else 'exported'}]")

# Relocations
for reloc in binary.relocations:
    if reloc.type == lief.ELF.RELOC_X86_64.R_X86_64_JUMP_SLOT:
        print(f"  JMP_SLOT: {hex(reloc.address)} -> {reloc.symbol.name}")

# Modify and rewrite
binary.header.entrypoint = 0xdeadbeef
binary.write("/tmp/modified_ls")
```

### 21.5 pwntools ELF class [8]

```python
from pwn import *

elf = ELF("/bin/ls")

print(f"Entry: {hex(elf.entry)}")
print(f"PIE: {elf.pie}, RELRO: {elf.relro}, Canary: {elf.canary}")
print(f"NX: {elf.nx}")

# GOT entries
for name, addr in elf.got.items():
    print(f"  GOT[{name}] = {hex(addr)}")

# PLT entries
for name, addr in elf.plt.items():
    print(f"  PLT[{name}] = {hex(addr)}")

# Symbols
print(f"__libc_start_main @ {hex(elf.symbols['__libc_start_main'])}")

# Search for ROP gadgets
rop = ROP(elf)
print(rop.find_gadget(['ret']))
print(rop.find_gadget(['pop rdi', 'ret']))

# Checksec output
print(elf.checksec())
# [*] '/bin/ls'
#     Arch:       amd64-64-little
#     RELRO:      Full RELRO
#     Stack:      Canary found
#     NX:         NX enabled
#     PIE:        PIE enabled
#     Stripped:   No
#     Fortify:    No
```

### 21.6 GDB with pwndbg/GEF

```python
# pwndbg commands
breakrva 0x6b20      # Set breakpoint at PIE-relative offset
got                   # Show GOT entries
plt                   # Show PLT entries
rop                   # Find ROP gadgets
checksec              # Security hardening summary
vmmap                 # Memory map visualization
hexdump $rdi 64       # Hex dump of register
telescope $rsp        # Inspect stack with arrows for pointers

# GEF
gef-remote            # Remote debugging
heap chunks           # Heap analysis
ret-check             # Find return-threat gadgets
memory               # Memory region inspection
```

---

## 22. Analyst Workflow — ELF Binary Triage

1. **File probe**: `file /bin/myapp` — architecture, static/dynamic, stripped/not stripped
2. **Checksec**: `pwn checksec /bin/myapp` or pwntools `ELF.checksec()` — RELRO, NX, PIE, canary, FORTIFY
3. **ELF header**: `readelf -h` — entry point, class, type, machine
4. **Segments**: `readelf -l` — PT_LOAD count, PT_GNU_STACK permissions, PT_GNU_RELRO presence, PT_INTERP path
5. **Sections**: `readelf -S` — section list, stripping status, .plt/.got layout, .init_array entries
6. **Dynamic deps**: `readelf -d | grep NEEDED` + `readelf -s | grep UND` — imported functions and libraries
7. **Relocations**: `readelf -r` — COPY relocations, GLOB_DAT vs JUMP_SLOT, IRELATIVE for ifunc
8. **Symbols**: `readelf -s` + `nm -D` — dynamic symbols, ifunc resolvers, version dependencies
9. **Strings**: `strings -a` — library paths, error messages, embedded paths, command-line options
10. **Behavior**: `strace -f -o /tmp/trace` — syscall profile; `LD_DEBUG=all` — linker resolution
11. **Unpack if packed**: check for UPX sections, high entropy, unusual entry point
12. **Disassembly**: `objdump -d -M intel` — focus on PLT calls, TLS access, syscall instructions

---

## Sources

1. TIS Committee, "Tool Interface Standard (TIS) Executable and Linkable Format (ELF) Specification" Version 1.2 — https://refspecs.linuxfoundation.org/elf/elf.pdf
2. Linux Foundation, "ELF — Executable and Linkable Format" — https://refspecs.linuxfoundation.org/elf/elf-specification.html
3. glibc source tree (elf/), dynamic linker implementation — https://sourceware.org/git/?p=glibc.git;a=tree;f=elf
4. Linux man-pages project, syscalls(2) — https://man7.org/linux/man-pages/man2/syscalls.2.html
5. Linux Foundation LSB Core Specification, ELF sections — https://refspecs.linuxfoundation.org/LSB_5.0.0/LSB-Core-generic/LSB-Core-generic/elf-sections.html
6. GNU binutils documentation — readelf, objdump — https://sourceware.org/binutils/docs/
7. LIEF documentation, "ELF format" — https://lief.re/doc/latest/formats/elf/index.html
8. pwntools documentation, "ELF" — https://docs.pwntools.com/en/stable/elf.html
9. patchelf documentation — https://nixos.org/patchelf.html
10. "Position Independent Executables (PIE)" — Red Hat developer blog — https://developers.redhat.com/blog/2015/06/12/position-independent-executables-pie
11. "32-bit vs 64-bit ELF: what's the difference?" — Stack Overflow discussion — https://stackoverflow.com/questions/6611290/difference-between-elf32-and-elf64
12. x86-64 System V ABI supplement — https://gitlab.com/x86-psABIs/x86-64-ABI
13. "RELRO — Relocation Read-Only" — Hardened Linux project — https://hardenedlinux.github.io/system-security/2015/06/22/RELR.html
14. "The .comment section: a compiler fingerprint" — https://www.aldeid.com/wiki/Comment-section
15. "Build ID — what it is and why it matters" — Fedora Wiki — https://fedoraproject.org/wiki/Releases/FeatureBuildId
16. "GNU Hash Table — a fast symbol lookup" — http://flapiron.github.io/gnu-hash
17. Drepper, "How to Write Shared Libraries" (section on symbol lookup) — https://www.akkadia.org/drepper/dsohowto.pdf
18. "PLT and GOT — ELF internals" — https://www.technovelty.org/linux/plt-and-got-the-key-to-code-sharing-and-dynamic-libraries.html
19. Intel CET (Control-flow Enforcement Technology) specification — https://www.intel.com/content/www/us/en/developer/articles/technical/technical-look-control-flow-enforcement-technology.html
20. "Security features: RELRO" — https://wiki.debian.org/Hardening#RELRO
21. GCC documentation, "Function Attributes" — constructor/destructor — https://gcc.gnu.org/onlinedocs/gcc/Common-Function-Attributes.html
22. "How .init_array works" — https://maskray.me/blog/2021-11-07-init-ctors-init-array
23. System V Application Binary Interface, AMD64 Architecture Processor Supplement — https://refspecs.linuxfoundation.org/elf/x86-64-abi-0.99.pdf
24. AArch64 ELF Relocation Types — ARM IHI 0056E — https://developer.arm.com/documentation/ihi0056/latest/
25. "COPY relocations and why they matter" — https://www.macieira.org/blog/2011/07/copy-relocations/
26. Drepper, "ELF Handling For Thread-Local Storage" — https://www.akkadia.org/drepper/tls.pdf
27. "Thread Local Storage in Linux" — https://uclibc.org/docs/tls.pdf
28. "ld.so dynamic linker — glibc internals" — https://www.technovelty.org/linux/ld-so-the-linux-elf-interpreter.html
29. musl libc documentation — https://musl.libc.org/doc/1.1/manual.html
30. "Linux process initialization — what happens before main()" — https://www.linuxjournal.com/article/5459
31. vDSO documentation — Linux kernel — https://man7.org/linux/man-pages/man7/vdso.7.html
32. "Linux System Call Table for x86-64" — https://blog.rchapell.com/2012/06/17/finding-system-call-table-for-linux-kernel/
33. "Signal handling in Linux" — https://www.win.tue.nl/~aeb/linux/lk/lk-5.html
34. "Exception Handling in GCC (.eh_frame)" — https://www.airs.com/blog/archives/460
35. "Linux anti-debugging techniques" — https://www.aldeid.com/wiki/Category:Linux-Anti-Debug
36. "The 'Ultimate' Anti-Debugging Reference" — P. Ferrie — http://pferrie.host22.com/papers/antidebug.pdf
37. seccomp man page — https://man7.org/linux/man-pages/man2/seccomp.2.html
38. "The r_debug interface for dynamic linker debugging" — https://www.sourceware.org/gdb/onlinedocs/gdb/Shared-Libraries.html
39. UPX documentation — https://upx.github.io/
40. "ELF Virus Writing Tutorial" — https://www.ma.utexas.edu/linux/elf/elf.html
41. "Control Flow Integrity in Clang" — https://clang.llvm.org/docs/ControlFlowIntegrity.html
42. "AddressSanitizer Algorithm" — https://github.com/google/sanitizers/wiki/AddressSanitizerAlgorithm
43. "libFuzzer — a library for coverage-guided fuzz testing" — https://llvm.org/docs/LibFuzzer.html
44. "GEF — GDB Enhanced Features" — https://github.com/hugsy/gef
