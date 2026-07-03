# ELF PLT/GOT, RELRO, and Init/Fini Arrays

TL;DR: PLT/GOT lazy binding mechanics, RELRO hardening levels (partial/full/none),
and `.init_array`/`.fini_array` constructor/destructor chains.

Cross-reference: See also `elf-header-segments-sections.md`, `elf-dynamic-symbols-hash.md`, `elf-pic-relocations-tls.md` in this directory.

---

## 7. PLT / GOT Internals [6][13][18]

The PLT (Procedure Linkage Table) and GOT (Global Offset Table) together enable
lazy binding of shared library function calls.

### 7.1 The GOT structure

`.got.plt` starts with three reserved entries:

| GOT slot | Contents |
|----------|----------|
| `GOT[0]` | Address of `.dynamic` section (used by ld.so) |
| `GOT[1]` | `link_map` pointer (filled by ld.so) |
| `GOT[2]` | Address of `_dl_runtime_resolve` (filled by ld.so) |
| `GOT[3+]` | Function pointers, initially resolving to PLT stubs |

### 7.2 PLT stub structure (lazy binding)

Each imported function gets a 16-byte PLT entry:

```asm
; Example: PLT entry for printf@plt
400520: ff 25 12 0a 20 00    jmp    *0x200a12(%rip)      # 600f38 <printf@GLIBC_2.2.5>
400526: 68 00 00 00 00        push   $0x0                # relocation index
40052b: e9 e0 ff ff ff        jmp    400510               # jump to PLT[0]
```

The first PLT entry (PLT[0]) is the resolver stub:

```asm
; PLT[0] — the resolver trampoline
400510: ff 35 f2 09 20 00    push   *0x2009f2(%rip)      # GOT[1] (link_map)
400516: ff 25 f4 09 20 00    jmp    *0x2009f4(%rip)      # GOT[2] (_dl_runtime_resolve)
```

**Lazy binding flow** (initial state):

1. `call printf@plt` -> PLT entry at 0x400520
2. `jmp *GOT[printf]` -- initially points back to the next instruction (0x400526)
3. Push the relocation index (0x0) and jump to PLT[0]
4. PLT[0] pushes `link_map` pointer and jumps to `_dl_runtime_resolve`
5. `_dl_runtime_resolve` uses the stack-pushed arguments to:
   - Find `.rela.plt` via `DT_JMPREL`
   - Index into it with the relocation index
   - Look up the symbol via `.dynsym`, `.dynstr`, and `.gnu.hash`
   - Write the resolved address into `GOT[printf]`
   - Jump to printf

**After resolution**: `GOT[printf]` holds the real printf address. The next call
jumps directly to printf without going through the resolver [18].

### 7.3 GOT entries after resolution -- hex examination

Before any call:
```
gdb /bin/ls
(gdb) x/gx 0x600f38
0x600f38:       0x0000000000400526     # points to push instruction in PLT
```

After one call:
```
(gdb) x/gx 0x600f38
0x600f38:       0x00007f1234567890     # real printf address in libc
```

### 7.4 Identifying PLT calls in disassembly

Every call through PLT looks like:
```asm
e8 d5 ff ff ff          call   400520 <printf@plt>
```

The target is a PLT stub. The relocations in `.rela.plt` confirm which symbol:

```bash
readelf -r /bin/ls | grep JMP_SLOT
000000600f38  000000000007 R_X86_64_JUMP_SLOT  0000000000000000 printf + 0
```

### 7.5 PLT with `.plt.got` (non-lazy, full RELRO)

When `BIND_NOW` is in effect (full RELRO), the PLT jumps directly through GOT
entries that are already resolved at load time:

```asm
; .plt.got entry (no resolver, already resolved)
400530: ff 25 0a 0a 20 00    jmp    *0x200a0a(%rip)      # already resolved
400536: 66 90                xchg   %ax,%ax              # nop
```

This is shorter (6 bytes vs 16) and has no lazy resolution overhead. In a full
RELRO binary, `.plt` may exist for compatibility with lazy-binding-aware code,
but `.plt.got` is used by the compiler for internal calls.

### 7.6 .plt.sec (Intel CET)

With `-fcf-protection=full`, the compiler generates `.plt.sec` entries that include
endbr64 landing pads:

```asm
400560: f3 0f 1e fa          endbr64
400564: f2 0f 1e 84          notrack jmp *0x200a0c(%rip)
```

The `endbr64` instruction marks an indirect branch target -- required by Intel CET
to prevent JOP/COP gadget attacks [19].

---

## 8. RELRO -- Relocation Read-Only [13][20]

RELRO (RELocation Read-Only) protects GOT entries from being overwritten. Two levels.

### 8.1 Partial RELRO

- Maps `.got.plt` as writable (lazy binding still writes to GOT slots)
- Maps the non-PLT GOT (`.got`) as read-only after relocation
- `PT_GNU_RELRO` covers `.dynamic` and the first part of `.got`
- Default for most non-PIE builds and older binaries

Detect by checking `DT_FLAGS`:
```bash
readelf -d /bin/myapp | grep BIND_NOW
# (no output -- BIND_NOW missing = partial RELRO)
```

### 8.2 Full RELRO (a.k.a. BIND_NOW)

- All relocations (including PLT) resolved at load time
- `.got.plt` marked read-only via `PT_GNU_RELRO`
- `DT_FLAGS_1` includes `DF_1_NOW`
- No lazy binding possible -- GOT overwrite is a page fault

Detect:
```bash
readelf -d /bin/ls | grep -E 'BIND_NOW|FLAGS'
 0x0000001e (FLAGS)                      BIND_NOW
 0x6ffffffb (FLAGS_1)                    Flags: NOW PIE
```

The `PT_GNU_RELRO` segment overlaps the GOT pages. After ld.so applies relocations,
it `mprotect`s those pages to read-only [13][20].

### 8.3 No RELRO

- No `PT_GNU_RELRO` segment at all
- `.got.plt` stays fully writable
- The classic format for ancient binaries and some embedded systems
- Highly exploitable -- GOT overwrite is trivial

### Workflow: assess RELRO level

```bash
readelf -l /bin/myapp | grep GNU_RELRO
# Present = at least partial RELRO
# Absent = no RELRO

readelf -d /bin/myapp | grep BIND_NOW
# Present = full RELRO
# Absent = partial RELRO (if GNU_RELRO exists)
```

---

## 9. `.init`, `.fini`, `.init_array`, `.fini_array` -- Constructor Chain [3][20]

Linux process initialization follows a strict order (see also §16 for full startup
sequence).

### 9.1 Execution order

1. `_start` (from CRT / `crt1.o`)
2. `__libc_start_main` initializes libc
3. Call `__libc_csu_init` which runs:
   a. `_init` function
   b. `.preinit_array` entries (if present)
   c. `.init_array` entries (in order)
4. `main(argc, argv, envp)`
5. Return from main -> `exit()` -> `__libc_csu_fini` which runs:
   a. `.fini_array` entries (reverse order)
   b. `_fini` function
6. `atexit` / `on_exit` handlers

### 9.2 `.init_array` structure

```c
// Array of function pointers, called in order by __libc_csu_init
void (*const init_array[])(int, char **, char **) __attribute__((section(".init_array"))) = {
    constructor_function,
    another_constructor,
};
```

### 9.3 Using constructors for anti-analysis

Malware may place payload in an `.init_array` entry to run before `main`. Unlike
Windows TLS callbacks, Linux has no `.tls` callback mechanism, but `__attribute__((constructor))`
produces an `.init_array` entry that runs pre-main [21]:

```bash
readelf -S /bin/myapp | grep init_array
  [13] .init_array       INIT_ARRAY       0000000000019d50  00019d50
  [14] .fini_array       FINI_ARRAY       0000000000019d58  00019d58

# Dump constructor addresses
objdump -s -j .init_array /bin/myapp
```

### 9.4 Legacy `.ctors` / `.dtors`

Older GCC versions and some embedded toolchains use `.ctors` and `.dtors` instead
of `.init_array`/`.fini_array`. The layout is a null-terminated array of function
pointers:

```c
// Legacy .ctors: ends with (void*)-1 terminator
void (*__CTOR_LIST__[])() = { (void*)-1, func1, func2, 0 };
```

Modern binaries use `.init_array` exclusively. Seeing `.ctors` indicates an old
toolchain or deliberate compatibility [22].
