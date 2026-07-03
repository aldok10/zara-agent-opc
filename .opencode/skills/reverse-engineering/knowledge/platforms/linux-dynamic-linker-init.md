# Linux Dynamic Linker Internals & Process Initialization

> **TL;DR:** ld.so startup sequence, lazy binding via `_dl_runtime_resolve`, symbol resolution
> order, LD_PRELOAD/LD_DEBUG environment variables, glibc vs musl differences, kernel process
> setup, stack layout at `_start`, auxiliary vector, and CRT initialization through `__libc_start_main`.

> **Cross-reference:** Siblings: `linux-syscalls-signals.md`, `linux-anti-debug-rdebug.md`,
> `linux-packing-instrumentation-tools.md`. Static ELF format in `../formats/elf-format-and-linking.md`.

---

## 13. Dynamic Linker Internals — ld.so [3][28]

### 13.1 The dynamic linker

The path is embedded in `.interp`:

```
readelf -p .interp /bin/ls
String dump of section '.interp':
  [     0]  /lib64/ld-linux-x86-64.so.2
```

On glibc systems, `ld-linux-x86-64.so.2` is a standalone ELF binary (also ET_DYN)
that the kernel maps before jumping to the entry point. The kernel:
1. Maps all `PT_LOAD` segments of the main binary
2. Reads `PT_INTERP` and maps the dynamic linker
3. Sets the auxiliary vector (see §16) on the stack
4. Jumps to the linker's entry point

### 13.2 ld.so startup sequence [3]

1. `_start` → `_dl_start` (elf/rtld.c in glibc source)
2. `_dl_start` is **self-relocating** — it applies `R_X86_64_RELATIVE` to its own GOT
3. After self-relocation, `_dl_start_final` calls `_dl_sysdep_start`
4. `_dl_main` (the main linker initialization):
   - Scans `DT_NEEDED` entries recursively
   - For each library: `_dl_map_object_from_fd` → `mmap` segments → `_dl_relocate_object`
   - Resolves all needed symbols
   - Calls `.init` and `.init_array` of each library
5. Finally, jumps to the executable's entry point (`_start`)

### 13.3 `_dl_runtime_resolve` — lazy binding workhorse [3]

When a PLT stub fires for lazy binding:

```asm
_dl_runtime_resolve_xsavec:
    # Save all caller-saved registers (x86-64)
    sub    $0x300, %rsp            # large save area for xsavec
    mov    %rax, 0x00(%rsp)
    # ... save all GPRs and XMM/YMM/ZMM ...
    mov    %rdi, REGISTER_SAVE_RDI(%rsp)
    mov    %rsi, REGISTER_SAVE_RSI(%rsp)
    # push link_map and reloc index (already on stack from PLT)
    mov    %rsp, %rdi              # first arg: regs save area
    call   _dl_fixup               # do the actual resolution
    # restore registers, clean stack
    jmp    *%rax                   # jump to the resolved function
```

The key function is `_dl_fixup` which:
1. Extracts the relocation index from the PLT-stub's `push imm32`
2. Gets `.rela.plt` and indexes to `reloc = JMPREL + index * sizeof(Elf64_Rela)`
3. Finds the symbol via `sym = SYMTAB + ELF64_R_SYM(reloc->r_info)`
4. Gets the name: `name = STR_TAB + sym->st_name`
5. Looks up the symbol across all loaded libraries
6. Writes the address: `*(Elf64_Addr*)GOT[reloc_index] = result`
7. Returns the resolved address

### 13.4 Symbol resolution order [3][28]

1. **Executable itself** (always first for LD_PRELOAD override)
2. **LD_PRELOAD** libraries (in order listed)
3. **DT_NEEDED** libraries, in breadth-first order per the ELF specification
4. **Implicit dependencies** (libraries loaded by other libraries)
5. If not found → `_dl_signal_error` → usually abort / SEGV

The `-z now` (BIND_NOW) linker flag makes all this happen at load time instead of
deferred. The `-z lazy` flag (default) enables lazy binding.

### 13.5 LD_PRELOAD and related env vars

| Variable | Purpose | Security |
|----------|---------|----------|
| `LD_PRELOAD` | List of shared libraries loaded before all others | Ignored for setuid/setgid binaries |
| `LD_LIBRARY_PATH` | Additional library search paths before standard paths | Ignored for setuid |
| `LD_BIND_NOW` | Force full RELRO behavior at runtime | Ignored for setuid |
| `LD_DEBUG` | Enable linker debug output (`all`, `bindings`, `libs`, `versions`, `symbols`, ...) | Ignored for setuid |
| `LD_AUDIT` | Load auditing library (RTLD auditing) | Restricted |
| `LD_ORIGIN_PATH` | Override `$ORIGIN` in RPATH/RUNPATH | Restricted |

### Workflow: trace dynamic linker with LD_DEBUG

```bash
LD_DEBUG=all /bin/ls 2>&1 | head -20
     15814:     file=ls [0];  generating link map
     15814:       file=ls [0];  ELF header: 0x7fff...
     15814:       file=ls [0];  program interpreter: /lib64/ld-linux-x86-64.so.2
     15814:     file=libc.so.6 [0];  needed by ls [0]
     15814:     file=libc.so.6 [0];  ELF header: 0x7f...
     15814:     file=libc.so.6 [0];  generating link map
     15814:       file=libc.so.6 [0];  processing
     15814:     calling init: /lib64/ld-linux-x86-64.so.2
     15814:     calling init: /lib64/libc.so.6
     15814:     calling init: /lib64/ld-linux-x86-64.so.2
     15814:     initialize libc: starting
```

### 13.6 glibc ld.so vs musl ld.so [29]

| Aspect | glibc ld.so | musl ld.so |
|--------|-------------|------------|
| Interpreter path | `/lib64/ld-linux-x86-64.so.2` | `ld-musl-x86_64.so.1` (symlink) |
| RELRO support | Full (BIND_NOW), partial, none | Full or none (no partial) |
| Lazy binding | Yes (default) | No (always BIND_NOW) |
| TLS model | Full (GD, LD, IE, LE) | IE, LE only (simplified) |
| LD_PRELOAD | Full support | Full support |
| `.hash` + `.gnu.hash` | Both supported | `.gnu.hash` only (newer), `.hash` fallback |
| Size | ~150-200KB | ~10-15KB |
| Startup complexity | High (many init stages) | Low (minimal init) |

musl's simplified design means binaries dynamically linked with musl often have
different RE patterns — no lazy PLT, simpler GOT, and fewer relocations overall [29].

---

## 14. Linux Process Initialization — From Kernel to main() [3][30]

### 14.1 Kernel setup

When the kernel loads an ELF binary:
1. `fs/exec.c:load_elf_binary()` in the kernel
2. Maps `PT_LOAD` segments at the assigned base address (ASLR)
3. Creates the initial stack layout (see below)
4. Loads the dynamic linker if `PT_INTERP` present
5. Jumps to the entry point (either binary or linker's `_start`)

### 14.2 Stack layout at `_start` [30]

When execution begins, the stack contains (from high to low):

```
+-------------------------+ <- high addresses
| Environment strings     |  e.g. "PATH=/usr/bin\0"
+-------------------------+
| Arg strings             |  e.g. "/bin/ls\0" "-l\0"
+-------------------------+
| Auxiliary vector (auxv) |  array of {uint64_t type; uint64_t val;} terminated by AT_NULL
| Environment pointers    |  NULL-terminated array of char*
| Argument pointers       |  NULL-terminated array of char* (argv[0..argc-1], NULL)
| argc                    |  uint64_t
+-------------------------+ <- initial RSP (16-byte aligned)
```

### 14.3 Auxiliary vector entries

The auxiliary vector (auxv) is **critical** for dynamic analysis. It lives on the
stack between environment pointers and the null terminator.

```c
// Linux include/uapi/linux/auxvec.h
#define AT_NULL     0   // End of vector
#define AT_IGNORE   1   // Ignore entry
#define AT_EXECFD   2   // File descriptor of program
#define AT_PHDR     3   // Address of program headers
#define AT_PHENT    4   // Size of program header entry
#define AT_PHNUM    5   // Number of program headers
#define AT_PAGESZ   6   // System page size
#define AT_BASE     7   // Base address of interpreter (ld.so)
#define AT_FLAGS    8   // Flags
#define AT_ENTRY    9   // Entry point of program
#define AT_NOTELF   10  // Not ELF?
#define AT_UID      11  // Real user ID
#define AT_EUID     12  // Effective user ID
#define AT_GID      13  // Real group ID
#define AT_EGID     14  // Effective group ID
#define AT_PLATFORM 15  // String: "x86_64"
#define AT_HWCAP    16  // Hardware capabilities bitmask (CPU features)
#define AT_CLKTCK   17  // Frequency of times()
#define AT_SECURE   22  // 1 if setuid/setgid (LD_PRELOAD etc disabled)
#define AT_BASE_PLATFORM 23 // Platform string
#define AT_RANDOM   25  // 16 random bytes (stack canary seed)
#define AT_HWCAP2   26  // Extended hwcap
#define AT_EXECFN   31  // Path to executable
#define AT_SYSINFO_EHDR 33 // vDSO address
```

### Workflow: dump auxv

```bash
# Using LD_SHOW_AUXV=1 (glibc)
LD_SHOW_AUXV=1 /bin/true
AT_SYSINFO_EHDR: 0x7ffd5f7fd000
AT_HWCAP:        0x7ffd5f7f8fbf
AT_PAGESZ:       4096
AT_CLKTCK:       100
AT_PHDR:         0x55a3b1c00040
AT_PHENT:        56
AT_PHNUM:        13
AT_BASE:         0x7f1234567000    # ld.so load address
AT_FLAGS:        0x0
AT_ENTRY:        0x55a3b1c06b20    # binary entry point
AT_UID:          1000
AT_EUID:         1000
AT_GID:          1000
AT_EGID:         1000
AT_SECURE:       0
AT_RANDOM:       0x7ffd5f7fa6d9    # 16 bytes of randomness
AT_HWCAP2:       0x2
AT_EXECFN:       /bin/true
AT_PLATFORM:     x86_64
```

`AT_SYSINFO_EHDR` gives the vDSO address (see §15). `AT_RANDOM` is used for the
stack canary seed. `AT_BASE` is the dynamic linker's own load address — critical
for setting breakpoints on ld.so functions in a debugger [30].

### 14.4 glibc _start and __libc_start_main

The CRT startup (`crt1.o` / `Scrt1.o` for PIE):

```asm
; _start (from glibc sysdeps/x86_64/start.S)
_start:
    xor    ebp, ebp           ; mark outermost frame (ebp = 0)
    mov    r9, rdx            ; rtld_fini (from linker)
    pop    rsi                ; argc
    mov    rdx, rsp           ; argv
    and    rsp, ~15           ; align stack to 16
    push   rax                ; padding for alignment
    push   rsp                ; stack_end
    mov    r8, _dl_fini       ; dynamic linker fini function
    mov    rcx, main@GOTPCREL ; main function
    mov    rdi, __libc_csu_init
    mov    rsi, __libc_csu_fini
    call   __libc_start_main  ; never returns
    hlt                       ; should never reach here
```

`__libc_start_main` does:
1. Set up `__environ`, `__progname`, etc.
2. Register `__libc_csu_fini` and `rtld_fini` with `atexit`
3. Call `__libc_csu_init` → runs `.preinit_array`, `_init`, `.init_array`
4. Call `main(argc, argv, __environ)`
5. On return, call `exit()`
