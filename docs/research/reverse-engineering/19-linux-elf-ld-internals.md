# Linux ELF Binary Reverse Engineering — ELF Format, Dynamic Linker, PLT/GOT & Linux Internals

A working reference for analysts examining Linux ELF (Executable and Linkable Format)
binaries during authorized analysis. Covers the format itself, the dynamic linker
internals, PLT/GOT resolution, position-independent code, Linux process initialization,
syscall interface, anti-debug techniques, and the tools that surface each layer.

Primary sources: the ELF specification (TIS) [1][2], the glibc source tree [3] for
ld.so internals, the Linux man-pages project [4], Linux Foundation LSB [5], and tool
docs for readelf, objdump, patchelf, LIEF, and pwntools [6][7][8][9].

---

## 1. ELF File Layout at a Glance

An ELF file is a linear byte stream with two views — the **linking view** (sections)
and the **execution view** (segments). Sections are for the linker/static analysis;
segments for the loader.

```
+----------------------------+  offset 0x00
| ELF Header (Ehdr)          |  starts with \x7fELF
|   e_ident[16]              |  class, data, version, OS/ABI, padding
|   e_type, e_machine        |  relocatable, executable, shared, core
|   e_entry, e_phoff, e_shoff|
|   e_flags, e_ehsize        |
|   e_phentsize, e_phnum     |
|   e_shentsize, e_shnum     |
|   e_shstrndx               |
+----------------------------+  e_phoff ->
| Program Header Table (Phdr)|  array of Elf64_Phdr
|   PT_LOAD, PT_DYNAMIC      |  segments the loader maps
|   PT_INTERP, PT_GNU_EH_FRAME, PT_GNU_STACK, PT_GNU_RELRO, PT_TLS
+----------------------------+  e_shoff ->
| Section Header Table (Shdr)|  array of Elf64_Shdr
|   .text .data .bss .rodata |  sections (not needed at runtime)
|   .symtab .strtab .shstrtab|
|   .dynamic .dynsym .dynstr |
|   .init .fini .init_array  |
|   .got .got.plt .plt .plt.got |
|   .comment .note.* .gnu.hash|
+----------------------------+
| Section bodies (data)      |  actual bytes
|   .text code               |
|   .rodata read-only data   |
|   .data/.bss r/w data      |
+----------------------------+
```

The section header table is **optional** at runtime (`strip` removes it), but the
program header table is mandatory for execution. A running process uses segments,
not sections [1].

### 1.1 ELF Header — Elf64_Ehdr [1][2]

```c
#define EI_NIDENT 16

typedef struct {
    unsigned char e_ident[EI_NIDENT];  // 0x00: magic + class + data + version + OS/ABI
    uint16_t      e_type;              // 0x10: ET_NONE, ET_REL, ET_EXEC, ET_DYN, ET_CORE
    uint16_t      e_machine;           // 0x12: EM_X86_64, EM_AARCH64, EM_386
    uint32_t      e_version;           // 0x14: EV_CURRENT = 1
    uint64_t      e_entry;             // 0x18: virtual address of entry point
    uint64_t      e_phoff;             // 0x20: program header table file offset
    uint64_t      e_shoff;             // 0x28: section header table file offset
    uint32_t      e_flags;             // 0x30: processor-specific flags
    uint16_t      e_ehsize;            // 0x34: ELF header size (64/52 bytes)
    uint16_t      e_phentsize;         // 0x36: program header entry size
    uint16_t      e_phnum;             // 0x38: number of program headers
    uint16_t      e_shentsize;         // 0x3a: section header entry size
    uint16_t      e_shnum;             // 0x3c: number of section headers
    uint16_t      e_shstrndx;          // 0x3e: section name string table index
} Elf64_Ehdr;
```

RE relevance of every field:

| Offset | Field | What it tells you |
|--------|-------|-------------------|
| 0x00 | `e_ident[0..3]` | Must be `\x7fELF` (0x7f 0x45 0x4c 0x46). Anything else is malformed. |
| 0x04 | `e_ident[EI_CLASS]` | `1` = 32-bit (ELFCLASS32), `2` = 64-bit (ELFCLASS64). Determines all structure widths. |
| 0x05 | `e_ident[EI_DATA]` | `1` = little-endian (ELFDATA2LSB), `2` = big-endian (ELFDATA2MSB). x86/ARM = LSB. |
| 0x07 | `e_ident[EI_OSABI]` | `0` = UNIX System V, `3` = Linux, `0x03` = GNU/Linux. Old binaries may say `ELFOSABI_LINUX`; new ones say `ELFOSABI_NONE` (== SysV) — they're compatible. |
| 0x10 | `e_type` | `ET_EXEC (2)` = non-PIE executable, `ET_DYN (3)` = PIE executable or shared library. On modern distros all user binaries are ET_DYN (PIE). |
| 0x12 | `e_machine` | `0x3e` = x86-64, `0x28` = ARM, `0xb7` = AArch64, `0x03` = i386. |
| 0x18 | `e_entry` | Virtual address of `_start`. For a PIE, this is a relative offset from the load base. |
| 0x38 | `e_phnum` | Count of program headers. Zero for ET_REL (object file). |

The `e_ident[EI_CLASS]` field is your first branching decision: Elf32 structures
have 32-bit addresses (4-byte `Elf32_Addr`, `Elf32_Off`) vs Elf64's 64-bit (8-byte).
The layouts are parallel but differ in size [1][2].

Hex dump of a real x86-64 PIE header:

```
readelf -h /bin/ls

ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              DYN (Position Independent Executable)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x6b20
  Start of program headers:          64 (bytes into file)
  Start of section headers:          133240 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         13
  Size of section headers:           64 (bytes)
  Number of section headers:         31
  Section header string table index: 30
```

`e_entry = 0x6b20` is relative to the load base since this is PIE [10].

### 1.2 32-bit vs 64-bit ELF — Key Differences [1][2][11]

| Aspect | Elf32 | Elf64 |
|--------|-------|-------|
| Ehdr size | 52 bytes | 64 bytes |
| Phdr size | 32 bytes | 56 bytes |
| Shdr size | 40 bytes | 64 bytes |
| Address width | 32-bit `Elf32_Addr` | 64-bit `Elf64_Addr` |
| File offset width | 32-bit `Elf32_Off` | 64-bit `Elf64_Off` |
| Symbol entry size | 16 bytes | 24 bytes |
| Relocation (REL) | `Elf32_Rel` = 8 bytes | `Elf64_Rel` = 16 bytes |
| Relocation (RELA) | `Elf32_Rela` = 12 bytes | `Elf64_Rela` = 24 bytes |
| PIE default | Rare (no-pie default historically) | Default on modern GCC/Clang |
| `e_flags` semantics | Arch-specific (e.g. EF_ARM_*) | Arch-specific |

**REL vs RELA**: The ELF spec supports two relocation formats. `REL` packs the addend
into the location being relocated (no explicit addend field); `RELA` carries an explicit
`r_addend`. x86-64 uses **RELA** exclusively. x86 (32-bit) uses **REL**. AArch64 uses
RELA [1][12].

String table layout: the first byte (index 0) is always `\0`. Offset 0 in any string
table refers to the empty string. Section `.shstrtab` holds section names, `.strtab`
holds symbol names for `.symtab`, `.dynstr` holds dynamic symbol names for `.dynsym` [2].

---

## 2. Program Headers (Segments) [1][5]

The program header table tells the kernel what to map and where. Each `Elf64_Phdr`:

```c
typedef struct {
    uint32_t p_type;    // PT_LOAD, PT_DYNAMIC, PT_INTERP, PT_NOTE, etc.
    uint32_t p_flags;   // PF_R, PF_W, PF_X
    uint64_t p_offset;  // file offset of segment
    uint64_t p_vaddr;   // virtual address (relative for PIE)
    uint64_t p_paddr;   // physical address (usually ignored)
    uint64_t p_filesz;  // size in file
    uint64_t p_memsz;   // size in memory (>= p_filesz for .bss)
    uint64_t p_align;   // alignment constraint
} Elf64_Phdr;
```

### Critical segment types

| Type | Value | RE relevance |
|------|-------|--------------|
| `PT_NULL` | 0 | Ignore. Used for alignment padding. |
| `PT_LOAD` | 1 | Mappable segment. Every executable has at least one (code) and one (data). The kernel maps these via `mmap`. Offsets must be page-aligned. |
| `PT_DYNAMIC` | 2 | Points to `.dynamic` section — the dynamic linking metadata. |
| `PT_INTERP` | 3 | Contains the path to the dynamic linker, e.g. `/lib64/ld-linux-x86-64.so.2`. Absent for statically linked binaries. |
| `PT_NOTE` | 4 | Vendor/ABI notes. `.note.gnu.build-id` contains the build ID hash. |
| `PT_GNU_EH_FRAME` | 0x6474e550 | `.eh_frame_hdr` — sorted table for unwind lookup. |
| `PT_GNU_STACK` | 0x6474e551 | Stack permissions. `PF_X` set = executable stack (rare, legacy or JIT). |
| `PT_GNU_RELRO` | 0x6474e552 | Marks pages to mprotect to read-only after relocations are applied (see §6). |
| `PT_TLS` | 7 | Thread-local storage template (see §12). |
| `PT_GNU_PROPERTY` | 0x6474e553 | Intel CET / ARM BTI property notes. |

### Workflow: identifying code vs data segments

```bash
readelf -l /bin/ls | head -40

Elf file type is DYN (Position Independent Executable)
Entry point 0x6b20
There are 13 program headers, starting at offset 64

Program Headers:
  Type           Offset   VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
  PHDR           0x000040 0x0000000000000040 0x0000000000000040 0x0002d8 0x0002d8 R   0x8
  INTERP         0x000318 0x0000000000000318 0x0000000000000318 0x00001c 0x00001c R   0x1
      [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]
  LOAD           0x000000 0x0000000000000000 0x0000000000000000 0x0008d0 0x0008d0 R   0x1000
  LOAD           0x001000 0x0000000000001000 0x0000000000001000 0x0159a9 0x0159a9 R E 0x1000
  LOAD           0x017000 0x0000000000017000 0x0000000000017000 0x002df0 0x002df0 R   0x1000
  LOAD           0x01a000 0x000000000001a000 0x000000000001a000 0x004cc0 0x0059d8 RW  0x1000
  DYNAMIC        0x01bd60 0x000000000001bd60 0x000000000001bd60 0x000200 0x000200 RW  0x8
  NOTE           0x000318 0x0000000000000318 0x0000000000000318 0x00001c 0x00001c R   0x1
  NOTE           0x000338 0x0000000000000338 0x0000000000000338 0x000020 0x000020 R   0x4
  GNU_EH_FRAME   0x017000 0x0000000000017000 0x0000000000017000 0x000b5c 0x000b5c R   0x4
  GNU_STACK      0x000000 0x0000000000000000 0x0000000000000000 0x000000 0x000000 RW  0x10
  GNU_RELRO      0x01a000 0x000000000001a000 0x000000000001a000 0x003de0 0x003de0 R   0x1
  GNU_PROPERTY   0x000338 0x0000000000000338 0x0000000000000338 0x000020 0x000020 R   0x4
```

Four `PT_LOAD` segments: read-only (header/rodata), read-execute (code), read-only
(data constants), and read-write (data/bss). The `PT_GNU_STACK` has `RW` but no `X`
— non-executable stack. `PT_GNU_RELRO` overlaps the first part of the RW LOAD segment,
which will be made read-only after relocation [13].

---

## 3. Section Headers (Linking View) [1][2]

Sections are for the linker, debugger, and static analysis. Stripped binaries remove
`.symtab`, `.strtab`, and often `.debug_*` sections, but retain `.dynsym`, `.dynstr`,
`.dynamic`, and others needed by the runtime linker.

```c
typedef struct {
    uint32_t sh_name;      // index into .shstrtab
    uint32_t sh_type;      // SHT_PROGBITS, SHT_NOBITS, SHT_DYNAMIC, SHT_HASH, etc.
    uint64_t sh_flags;     // SHF_WRITE, SHF_ALLOC, SHF_EXECINSTR, SHF_TLS
    uint64_t sh_addr;      // virtual address (0 if not loaded)
    uint64_t sh_offset;    // file offset
    uint64_t sh_size;      // section size
    uint32_t sh_link;      // related section index
    uint32_t sh_info;      // extra info (depends on type)
    uint64_t sh_addralign; // alignment
    uint64_t sh_entsize;   // entry size (for table sections)
} Elf64_Shdr;
```

### Critical sections for reverse engineering

| Section | SHT | Flags | Contents |
|---------|-----|-------|----------|
| `.text` | PROGBITS | AX | Executable code |
| `.rodata` | PROGBITS | A | Read-only data (strings, constants) |
| `.data` | PROGBITS | WA | Initialized read-write data |
| `.bss` | NOBITS | WA | Uninitialized data (zero-filled, takes no file space) |
| `.plt` | PROGBITS | AX | Procedure Linkage Table stubs |
| `.plt.got` | PROGBITS | AX | PLT using GOT entries directly (non-lazy) |
| `.plt.sec` | PROGBITS | AX | PLT with `-fcf-protection=full` (Intel CET) |
| `.got` | PROGBITS | WA | Global Offset Table (global data pointers) |
| `.got.plt` | PROGBITS | WA | GOT used by PLT (lazy binding) |
| `.init` | PROGBITS | AX | Process initialization code |
| `.fini` | PROGBITS | AX | Process termination code |
| `.init_array` | FINI_ARRAY | WA | Array of constructor function pointers |
| `.fini_array` | FINI_ARRAY | WA | Array of destructor function pointers |
| `.ctors` | PROGBITS | WA | Legacy constructors (pre-init_array, gcc) |
| `.dtors` | PROGBITS | WA | Legacy destructors (pre-fini_array) |
| `.dynamic` | DYNAMIC | WA | Dynamic linking metadata (array of Elf64_Dyn) |
| `.dynsym` | DYNSYM | A | Dynamic symbol table |
| `.dynstr` | STRTAB | A | Dynamic symbol string table |
| `.hash` | HASH | A | SVR4 hash table for symbol lookup |
| `.gnu.hash` | HASH+LOOS | A | GNU hash table (faster bloom-filter lookup) |
| `.gnu.version` | VERSYM+LOOS | A | Version symbol table |
| `.gnu.version_r` | VERNEED+LOOS | A | Version requirement table |
| `.gnu.version_d` | VERDEF+LOOS | A | Version definition table |
| `.tbss` | NOBITS | WA+TLS | Uninitialized thread-local storage |
| `.tdata` | PROGBITS | WA+TLS | Initialized thread-local storage |
| `.eh_frame` | PROGBITS | A | DWARF-based exception handling frames |
| `.eh_frame_hdr` | PROGBITS | A | Sorted index for eh_frame lookup |
| `.gcc_except_table` | PROGBITS | A | GCC exception table (LSDA) |
| `.comment` | PROGBITS | (none) | Compiler/linker version strings |
| `.note.gnu.build-id` | NOTE | A | Build ID hash (SHA1 of the binary) |
| `.note.go.buildid` | NOTE | A | Go build ID |
| `.shstrtab` | STRTAB | (none) | Section name string table |
| `.strtab` | STRTAB | (none) | Symbol name string table (non-dynamic) |
| `.symtab` | SYMTAB | (none) | Full symbol table (stripped in release) |
| `.interp` | PROGBITS | A | Path to dynamic interpreter |
| `.preinit_array` | PREINIT_ARRAY | WA | Pre-initialization function array |

### The `.comment` section — compiler fingerprint

```bash
readelf -p .comment /bin/ls

String dump of section '.comment':
  [     0]  GCC: (GNU) 14.2.0
  [    18]  GNU: (GNU) 14.2.0 (Ubuntu 24.04)
```

This single section tells you the compiler, version, and often the distro builder.
It's never loaded at runtime but is invaluable for attribution [14].

### The `.note.gnu.build-id` section [15]

```bash
readelf -n /bin/ls

Notes at offset 0x00000318 with length 0x0000001c:
  Owner      Data size  Description
  GNU        0x00000010 NT_GNU_BUILD_ID (unique build ID bitstring)
    Build ID: a3b2c4d5e6f71234567890abcdef1234567890abcd

Notes at offset 0x00000338 with length 0x00000020:
  Owner      Data size  Description
  GNU        0x00000014 NT_GNU_PROPERTY_TYPE_0
    Properties: x86 feature: IBT, SHSTK
      x86 needed: <none>
```

The build ID is a unique SHA1 hash of the binary, inserted by `ld --build-id`.
It's the key for debug symbol servers (`/usr/lib/debug/.build-id/ab/cd...`) and
for matching a core dump to its binary [15].

---

## 4. The `.dynamic` Section — Dynamic Linking Metadata [1][3]

`.dynamic` is an array of `Elf64_Dyn` entries, terminated by a `DT_NULL` entry.
It is pointed to by both `PT_DYNAMIC` segment and the `.dynamic` section.

```c
typedef struct {
    int64_t  d_tag;   // DT_* constant
    uint64_t d_val;   // integer value (or d_ptr: virtual address)
} Elf64_Dyn;
```

### DT_* tags relevant to reverse engineering

| Tag | Value | RE meaning |
|-----|-------|------------|
| `DT_NEEDED` | 1 | String table offset of a needed shared library name. Each DT_NEEDED = one dependency. |
| `DT_INIT` | 12 | Address of `.init` function |
| `DT_FINI` | 13 | Address of `.fini` function |
| `DT_INIT_ARRAY` | 25 | Address of `.init_array` |
| `DT_INIT_ARRAYSZ` | 27 | Size of `.init_array` |
| `DT_FINI_ARRAY` | 26 | Address of `.fini_array` |
| `DT_FINI_ARRAYSZ` | 28 | Size of `.fini_array` |
| `DT_PREINIT_ARRAY` | 32 | Address of `.preinit_array` (glibc only) |
| `DT_PREINIT_ARRAYSZ` | 33 | Size of `.preinit_array` |
| `DT_SYMTAB` | 6 | Address of `.dynsym` |
| `DT_STRTAB` | 5 | Address of `.dynstr` |
| `DT_SYMENT` | 11 | Size of each symbol entry (24 for Elf64) |
| `DT_STRSZ` | 10 | Size of `.dynstr` |
| `DT_HASH` | 4 | Address of SVR4 `.hash` |
| `DT_GNU_HASH` | 0x6ffffef5 | Address of GNU hash |
| `DT_PLTGOT` | 3 | Address of `.got.plt` |
| `DT_PLTRELSZ` | 2 | Size of PLT relocation entries |
| `DT_PLTREL` | 20 | Type of PLT relocations (`DT_REL` or `DT_RELA`) |
| `DT_JMPREL` | 23 | Address of PLT relocations (`.rela.plt`) |
| `DT_RELA` | 7 | Address of general relocations (`.rela.dyn`) |
| `DT_RELASZ` | 8 | Size of general relocation entries |
| `DT_RELAENT` | 9 | Size of each RELA entry (24 for Elf64) |
| `DT_VERNEED` | 0x6ffffffe | Address of `.gnu.version_r` |
| `DT_VERNEEDNUM` | 0x6fffffff | Count of version need entries |
| `DT_VERSYM` | 0x6ffffff0 | Address of `.gnu.version` |
| `DT_DEBUG` | 21 | Debugger interface — filled by ld.so at runtime with pointer to `r_debug` (see §14) |
| `DT_FLAGS` | 30 | Flags: `DF_ORIGIN`, `DF_SYMBOLIC`, `DF_TEXTREL`, `DF_BIND_NOW`, `DF_STATIC_TLS` |
| `DT_FLAGS_1` | 0x6ffffffb | Flags_1: `DF_1_NOW`, `DF_1_PIE`, `DF_1_INITFIRST`, `DF_1_NOOPEN` |
| `DT_SONAME` | 14 | String table offset of this shared object's soname |
| `DT_RPATH` | 15 | String table offset of runtime search path (deprecated by DT_RUNPATH) |
| `DT_RUNPATH` | 29 | String table offset of library search path |
| `DT_TEXTREL` | 22 | Relocation entries modify read-only segments (rare, insecure) |

### Workflow: enumerate dependencies

```bash
readelf -d /bin/ls | head -20

Dynamic section at offset 0x1bd60 contains 29 entries:
  Tag        Type                         Name/Value
 0x00000005 (STRTAB)                     0x1a698
 0x00000006 (SYMTAB)                     0x196a8
 0x0000000a (STRSZ)                      277 (bytes)
 0x0000000b (SYMENT)                     24 (bytes)
 0x00000015 (DEBUG)                      0x0
 0x00000003 (PLTGOT)                     0x1c000
 0x00000002 (PLTRELSZ)                   1152 (bytes)
 0x00000014 (PLTREL)                     RELA
 0x00000017 (JMPREL)                     0x1a018
 0x00000007 (RELA)                       0x19820
 0x00000008 (RELASZ)                     1992 (bytes)
 0x00000009 (RELAENT)                    24 (bytes)
 0x0000001e (FLAGS)                      BIND_NOW
 0x6ffffffb (FLAGS_1)                    Flags: NOW PIE
 0x6ffffffe (VERNEED)                    0x19e28
 0x6fffffff (VERNEEDNUM)                 2
 0x6ffffff0 (VERSYM)                     0x19736
 0x00000000 (NULL)                       0x0
```

`DF_1_NOW` + `BIND_NOW` means full RELRO — all relocations resolved at load time,
no lazy binding (see §7). `PIE` confirms this is a position-independent executable.
Notably missing: no `DT_NEEDED` entries in this truncated output, but `VERNEED`
tells us version dependencies exist.

---

## 5. The Symbol Tables — `.dynsym` and `.symtab` [1][11]

```c
typedef struct {
    uint32_t      st_name;   // index into associated string table
    unsigned char st_info;   // bind + type (ELF64_ST_BIND, ELF64_ST_TYPE)
    unsigned char st_other;  // visibility (ELF64_ST_VISIBILITY)
    uint16_t      st_shndx;  // section index (SHN_UNDEF, SHN_ABS, SHN_COMMON, or real)
    uint64_t      st_value;  // value/address
    uint64_t      st_size;   // symbol size
} Elf64_Sym;
```

`st_info` encodes two fields: `ELF64_ST_BIND(info) >> 4` and `ELF64_ST_TYPE(info) & 0xf`.
Bind values: `STB_LOCAL (0)`, `STB_GLOBAL (1)`, `STB_WEAK (2)`. Type values:
`STT_NOTYPE (0)`, `STT_OBJECT (1)`, `STT_FUNC (2)`, `STT_SECTION (3)`,
`STT_FILE (4)`, `STT_COMMON (5)`, `STT_TLS (6)`, `STT_GNU_IFUNC (10)`.

### Identifying ifunc (STT_GNU_IFUNC) [12]

GNU indirect functions (ifunc) are resolved at runtime by a resolver function — the
symbol's `st_value` points to the resolver, which returns the actual function pointer.
This is how `memcpy`, `strlen`, etc. dispatch to the optimized SIMD variant on the
current CPU. Ifunc symbols appear in `.dynsym` with `st_info != 10` (STT_GNU_IFUNC)
and their relocations use `R_X86_64_IRELATIVE`.

### Symbol visibility [2]

`st_other` holds `ELF64_ST_VISIBILITY(other)`:
`STV_DEFAULT (0)` — normal visibility, `STV_HIDDEN (2)` — not exported,
`STV_PROTECTED (3)` — exported but must not be preempted.

### Workflow: list dynamic symbols

```bash
readelf -s /bin/ls | head -15

Symbol table '.dynsym' contains 89 entries:
   Num:    Value          Size Type    Bind   Vis      Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND
     1: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND __ctype_toupper_loc@GLIBC_2.3 (2)
     2: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND getenv@GLIBC_2.2.5 (3)
     3: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND __libc_start_main@GLIBC_2.34 (4)
     4: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND strcpy@GLIBC_2.2.5 (3)
     5: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND read@GLIBC_2.2.5 (3)
```

UND entries (st_shndx = SHN_UNDEF) are imported functions. The `@GLIBC_2.34` is
the version requirement from `.gnu.version` (see §11).

---

## 6. The Hash Tables — `.hash` vs `.gnu.hash` [16][17]

The SVR4 hash table (`.hash`) is a simple 32-bit word bucket+chain scheme:

```
+-----------+-----------+-----------+-----------+-----+
| nbucket   | nchain    | bucket[0] | bucket[1] | ... |   (all uint32_t)
+-----------+-----------+-----------+-----------+-----+
| chain[0]  | chain[1]  | ...       |           |
+-----------+-----------+-----------+-----------+-----+
```

Hash formula: `h = (h << 4) + c; h ^= (h >> 24)` per character, modulo nbucket.

The GNU hash table (`.gnu.hash`) is more complex but faster:

```
+-----------+-----------+-----------+-----------+-----------+
| nbuckets  | symndx    | maskwords  | shift2    |           |  (uint32_t)
+-----------+-----------+-----------+-----------+-----------+
| bloom[maskwords]       | (Elf64_Xword or Elf32_Word)
+-----------+-----------+-----------+-----------+
| buckets[nbuckets]      | (uint32_t)
+-----------+-----------+-----------+-----------+
| chains[]               | (uint32_t, variable length)
+-----------+-----------+-----------+-----------+
```

- `symndx` = the symbol index of the first dynamic symbol covered by the hash
- Bloom filter pre-filters: two hash functions per symbol, bloom bits reduce lookups
- Chains encode whether the previous chain entry shares the same bucket

The GNU hash is why modern binaries can resolve symbols faster. If both `.hash` and
`.gnu.hash` are present, the linker uses `.gnu.hash` first and falls back to `.hash` [17].

```bash
readelf -S /bin/ls | grep hash
  [ 6] .gnu.hash         GNU_HASH         0000000000000320  00000320
  [ 7] .dynsym           DYNSYM           0000000000000398  00000398
  [ 8] .dynstr           STRTAB           00000000000005a8  000005a8
```

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

1. `call printf@plt` → PLT entry at 0x400520
2. `jmp *GOT[printf]` — initially points back to the next instruction (0x400526)
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

### 7.3 GOT entries after resolution — hex examination

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

The `endbr64` instruction marks an indirect branch target — required by Intel CET
to prevent JOP/COP gadget attacks [19].

---

## 8. RELRO — Relocation Read-Only [13][20]

RELRO (RELocation Read-Only) protects GOT entries from being overwritten. Two levels.

### 8.1 Partial RELRO

- Maps `.got.plt` as writable (lazy binding still writes to GOT slots)
- Maps the non-PLT GOT (`.got`) as read-only after relocation
- `PT_GNU_RELRO` covers `.dynamic` and the first part of `.got`
- Default for most non-PIE builds and older binaries

Detect by checking `DT_FLAGS`:
```bash
readelf -d /bin/myapp | grep BIND_NOW
# (no output — BIND_NOW missing = partial RELRO)
```

### 8.2 Full RELRO (a.k.a. BIND_NOW)

- All relocations (including PLT) resolved at load time
- `.got.plt` marked read-only via `PT_GNU_RELRO`
- `DT_FLAGS_1` includes `DF_1_NOW`
- No lazy binding possible — GOT overwrite is a page fault

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
- Highly exploitable — GOT overwrite is trivial

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

## 9. `.init`, `.fini`, `.init_array`, `.fini_array` — Constructor Chain [3][20]

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
5. Return from main → `exit()` → `__libc_csu_fini` which runs:
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

---

## 10. Position-Independent Code — PIE and PIC [10][23]

### 10.1 PIE vs non-PIE

| Aspect | Non-PIE (ET_EXEC) | PIE (ET_DYN) |
|--------|-------------------|--------------|
| e_type | ET_EXEC (2) | ET_DYN (3) |
| Base address | Fixed (e.g. 0x400000) | Random (ASLR) |
| Relocation | Optional (custom linker script) | Mandatory |
| Modern default | No (GCC `-no-pie`) | Yes |
| `TextRel` risk | Lower | Higher but well-handled |

### 10.2 PIC addressing

PIC code cannot use absolute addresses. Instead, it uses RIP-relative addressing:

```asm
; Load the address of a global variable via GOT
lea    rax, [rip+0x2009c4]    ; RAX = address of GOT entry for "my_global"
mov    rax, [rax]              ; RAX = actual value of my_global (from GOT)

; Call through PLT
call   [rip+0x200a12]           ; indirect call through GOT
```

The linker adds `R_X86_64_REX_GOTPCRELX` relocations that the linker can optimize.
Modern linkers convert common patterns like `lea rax, [rip+offset]` + `mov rax, [rax]`
into a direct memory access when the symbol resolves locally [23][24].

### 10.3 Code models [23]

| Model | Constraint | Use case |
|-------|-----------|----------|
| `mcmodel=small` | Code + data < 2GB, RIP-relative reachable | Default for user-space |
| `mcmodel=medium` | Code < 2GB, data can exceed | Large data structures |
| `mcmodel=large` | No addressing limit, all references via absolute | Rare, no PIC |
| `mcmodel=kernel` | Code in negative 2GB, 64-bit absolute for symbols | Linux kernel modules |

The code model determines how the compiler generates address references. For the
reverse engineer: `mcmodel=large` binaries use 64-bit immediate mov instructions
(`movabs rax, 0xdeadbeef`), which are 10-byte REX.W-encoded movabs. The default
small model uses RIP-relative which is more compact [23].

---

## 11. Relocation Types — x86-64 and AArch64 [1][12][24]

### 11.1 x86-64 relocation types

| Relocation | Type | Description |
|------------|------|-------------|
| `R_X86_64_NONE` | 0 | No-op |
| `R_X86_64_64` | 1 | Direct 64-bit absolute (S + A) |
| `R_X86_64_PC32` | 2 | 32-bit PC-relative (S + A - P) |
| `R_X86_64_GOT32` | 3 | 32-bit GOT entry offset |
| `R_X86_64_PLT32` | 4 | 32-bit PLT-relative |
| `R_X86_64_COPY` | 5 | Copy symbol into writable space (used for read-only data imports) |
| `R_X86_64_GLOB_DAT` | 6 | Set GOT entry to symbol address (S + A) |
| `R_X86_64_JUMP_SLOT` | 7 | Set PLT GOT entry to resolved address (lazy) |
| `R_X86_64_RELATIVE` | 8 | `(Base + A)` - base-relative; most common in PIE |
| `R_X86_64_GOTPCREL` | 9 | 32-bit PC-relative GOT entry |
| `R_X86_64_32` | 10 | 32-bit absolute (S + A) |
| `R_X86_64_32S` | 11 | 32-bit signed absolute |
| `R_X86_64_16` | 12 | 16-bit absolute |
| `R_X86_64_PC16` | 13 | 16-bit PC relative |
| `R_X86_64_8` | 14 | 8-bit absolute |
| `R_X86_64_PC8` | 15 | 8-bit PC relative |
| `R_X86_64_IRELATIVE` | 37 | Resolver returns function pointer (ifunc) |
| `R_X86_64_REX_GOTPCRELX` | 41 | GOTPCREL with REX prefix — may be optimized to direct access |

Key notation:
- **S** = symbol value
- **A** = addend (from `r_addend` in RELA)
- **P** = position being relocated
- **B** = base address of shared object

### 11.2 COPY relocations — special for RE [25]

`R_X86_64_COPY` is unusual: it copies the contents of a symbol **from** a shared
library **into** the executable's `.bss` or `.data` at the symbol's address. This
is needed when an executable (non-PIE) references a global variable from a shared
library. The COPY relocation means the original library's copy is unused — the
executable owns the data.

```bash
readelf -r /bin/myapp | grep COPY
000000601038  0000001e00000005 R_X86_64_COPY        _IO_2_1_stdin_
```

RE relevance: COPY relocations complicate in-memory patching — changing the value
in the library doesn't affect the executable's copy.

### 11.3 AArch64 relocation types [24]

| Relocation | Type | Description |
|------------|------|-------------|
| `R_AARCH64_ABS64` | 257 | 64-bit absolute |
| `R_AARCH64_RELATIVE` | 1027 | (Base + A) |
| `R_AARCH64_CALL26` | 283 | 26-bit PC-relative call |
| `R_AARCH64_ADR_PREL_PG_HI21` | 275 | ADRP: page-relative high |
| `R_AARCH64_LDST64_ABS_LO12_NC` | 286 | Load/store offset low 12 bits |
| `R_AARCH64_GLOB_DAT` | 1025 | GOT data entry |
| `R_AARCH64_JUMP_SLOT` | 1026 | PLT GOT entry |
| `R_AARCH64_TLSIE_LDST64_TPREL_LO12_NC` | 535 | TLS initial-exec |
| `R_AARCH64_TLSLE_ADD_TPREL_HI12` | 553 | TLS local-exec |
| `R_AARCH64_COPY` | 1024 | Copy relocation |
| `R_AARCH64_TSTBR14` | 279 | 14-bit TBZ/TBNZ branch |

AArch64 relocations often come in ADRP+ADD/ADRP+LDx pairs because the ISA has a
fixed 32-bit instruction size and cannot encode a full 64-bit address in one
instruction. The `ADRP` instruction loads the page address, and a subsequent
instruction provides the page offset [24].

---

## 12. Thread-Local Storage — `.tbss`, `.tdata`, `PT_TLS` [26][27]

### 12.1 TLS segment layout

Thread-Local Storage provides per-thread data. The `PT_TLS` program header in the
executable and each loaded library describes the TLS template:

```
+------------------+
| tdata (initialized)
| tbss (zero-filled)
+------------------+  <- TP (thread pointer)
```

The thread pointer register specifies where TLS lies:
- **x86-64**: `fs:0` points to the TCB (Thread Control Block). TLS variables are at
  negative offsets from `fs:0`.
- **AArch64**: `tpidr_el0` is the thread pointer.

```
Arch   TLS access        Example
x86-64 initial-exec      mov  rax, fs:0xffffffffffffffb8  ; load from negative offset
x86-64 general-dynamic   call __tls_get_addr              ; libc function for dynamic TLS
AArch64 initial-exec     mrs  x1, tpidr_el0; ldr x0, [x1, #-0x10]
```

### 12.2 TLS access models [27]

| Model | Efficiency | Limitation | When used |
|-------|-----------|------------|-----------|
| **Initial Exec** | Fast (direct TP offset) | Only works if loaded at startup | Default for executables |
| **General Dynamic** | Slower (calls `__tls_get_addr`) | Works for dlopen'd libraries | Default for shared libraries |
| **Local Exec** | Fastest (fixed TP offset) | Cannot be shared | Static linking |
| **Local Dynamic** | Medium | Multiple TLS variables in one module | Optimizes group of TLS access |

### 12.3 TLS relocations

For x86-64:
- `R_X86_64_TPOFF64` — Initial Exec: offset from TP
- `R_X86_64_TLSGD` — General Dynamic: GOT entry for `__tls_get_addr`
- `R_X86_64_TLSLD` — Local Dynamic: GOT entry for `__tls_get_addr` (module ID)
- `R_X86_64_DTPOFF64` — Offset from Dynamic Thread Pointer (DTV)

### 12.4 RE relevance

- TLS variables appear in `.tbss` as zero-size sections at link time but have
  runtime storage per thread
- A `fs:` segment override in x86-64 code is a dead giveaway for TLS access
- Binary instrumentation for TLS-aware tools needs to handle per-thread copies
- Anticheat/tamper detection sometimes uses TLS to store secret values that differ
  per process/thread [26]

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

---

## 15. Linux Syscall Interface [4][31][32]

### 15.1 The `syscall` instruction

On x86-64, user-space makes system calls via the `syscall` instruction:

```
Syscall number:  RAX
Arguments:       RDI, RSI, RDX, R10, R8, R9  (note: R10 instead of RCX)
Return value:    RAX  (negative = error, -errno)
Clobbered:       RCX (saves RIP), R11 (saves RFLAGS)
```

Breakdown of the `syscall` instruction:
- RCX = RIP (return address is saved in RCX)
- R11 = RFLAGS (original flags saved in R11)
- GDT selector switches to kernel CS/SS
- RIP jumps to the kernel entry point (set up via MSR_LSTAR)

### 15.2 Key syscall numbers (x86-64)

| Nr | Name | RDI | RSI | RDX | R10 | Return |
|----|------|-----|-----|-----|-----|--------|
| 0 | `read` | fd | buf | count | - | bytes read |
| 1 | `write` | fd | buf | count | - | bytes written |
| 2 | `open` | pathname | flags | mode | - | fd |
| 9 | `mmap` | addr | length | prot | flags | addr |
| 10 | `mprotect` | addr | len | prot | - | 0/-1 |
| 32 | `dup` | oldfd | - | - | - | newfd |
| 39 | `getpid` | - | - | - | - | pid |
| 56 | `clone` | flags | stack | parent_tid | child_tid | tid |
| 59 | `execve` | filename | argv | envp | - | - |
| 60 | `exit` | status | - | - | - | noreturn |
| 62 | `kill` | pid | sig | - | - | 0/-1 |
| 63 | `uname` | buf | - | - | - | 0 |
| 101 | `ptrace` | request | pid | addr | data | varies |
| 157 | `prctl` | option | arg2 | arg3 | arg4 | 0/-1 |
| 186 | `gettid` | - | - | - | - | tid |
| 217 | `getdents64` | fd | buf | count | - | bytes |
| 231 | `exit_group` | status | - | - | - | noreturn |
| 257 | `openat` | dirfd | pathname | flags | mode | fd |
| 318 | `getrandom` | buf | count | flags | - | bytes |

Full list in `/usr/include/asm/unistd_64.h` or `x86-64/syscallent.h` in strace source [4].

### 15.3 Recognizing syscalls in disassembly

A direct syscall (without libc wrapper) looks like:

```asm
mov    eax, 60              ; __NR_exit
xor    edi, edi             ; status = 0
syscall                     ; exit(0)
```

Libc wrappers like `exit()` or `write()` eventually call the syscall instruction
but go through libc first:

```asm
; Libc write wrapper (glibc)
write:
    mov    eax, 1            ; __NR_write
    syscall
    cmp    rax, -0x1000      ; check error range
    ja     __syscall_error   ; handle negative errno
    ret
```

### 15.4 vDSO (Virtual Dynamic Shared Object) [31]

The kernel maps a small shared library called `linux-vdso.so.1` into every process.
It provides fast implementations of certain syscalls that don't need a context switch:

```bash
# Find the vDSO mapping
cat /proc/self/maps | grep vdso
7ffd5f7fd000-7ffd5f7ff000 r-xp 00000000 00:00 0   [vdso]
```

```bash
# Dump vDSO contents
gdb -batch -ex "info sharedlibrary" -ex "quit" /bin/ls
```

vDSO provides:
- `clock_gettime` (kernel uses rdtsc + calibration to avoid syscall)
- `gettimeofday` (same mechanism)
- `time` (trivial if from vDSO)
- `__kernel_vsyscall` (32-bit legacy; int80 on older kernels)
- `__vdso_getcpu` (get CPU number via segment register)

The vDSO is an ELF image — you can parse it with `readelf`:

```bash
# Extract and analyze vDSO
cat /proc/self/maps | grep vdso | cut -d- -f1 | xargs -I{} sudo gdb -batch \
  -ex "dump memory /tmp/vdso.so {} + 0x2000" -ex "quit" /bin/ls

readelf -h /tmp/vdso.so
```

vDSO is also how the kernel communicates the hardware capabilities and TSC frequency
to user-space without a syscall [31].

### 15.5 vsyscall page (legacy)

On older kernels (`vsyscall=native` or default on pre-5.4), a fixed page at
`0xffffffffff600000` contains three syscalls: `gettimeofday`, `time`, `getcpu`.
On modern kernels with `vsyscall=emulate`, the page has fixed instructions and the
kernel emulates (treats as a trap) any call to it.

### 15.6 Eliminating libc — direct syscall observation

Statically linked or "raw" syscall binaries (like Go binaries, or hand-written
shellcode) call the kernel directly:

```bash
# Check if binary uses libc at all
strace -e trace=all /bin/my_static_binary 2>&1 | head -10
# All syscalls visible directly — no write(), just write(2)
```

For analysis: `strace -f` traces all child threads, `-e trace=file` filters to
file operations, `-e read=all` shows buffer contents for read syscalls.

### Workflow: strace for behavioral analysis

```bash
# Trace all syscalls with timestamps
strace -f -tt -T -o /tmp/trace.log /bin/ls

# Trace only specific classes
strace -e trace=network,process /bin/myapp

# Trace and filter by syscall count
strace -c /bin/ls
% time     seconds  usecs/call     calls    errors  syscall
------ ----------- ----------- --------- --------- ----------------
  0.00    0.000000           0         5           read
  0.00    0.000000           0         7           write
  0.00    0.000000           0         8           close
  0.00    0.000000           0        14           mmap
  0.00    0.000000           0        11           mprotect
  0.00    0.000000           0         4           openat
  0.00    0.000000           0         4           newfstatat
  0.00    0.000000           0         3           ioctl
  0.00    0.000000           0        10         5  newfstatat
```

---

## 16. Signal Handling & libgcc Internals [33][34]

### 16.1 Signal trampolines

When a signal handler returns, the kernel must restore the interrupted context.
On x86-64, the kernel places a **signal trampoline** on the user stack (or uses
the vDSO's `__kernel_rt_sigreturn`):

```asm
; The rt_sigreturn trampoline (vDSO version)
__kernel_rt_sigreturn:
    mov    eax, 15            ; __NR_rt_sigreturn
    syscall
```

The trampoline is called after the signal handler's `ret` instruction. The
handler's frame contains a `ucontext_t` that `sigreturn` restores.

### 16.2 __restore_rt and __restore

In glibc, signal handlers are set up with a `sa_restorer` field:

```c
// The kernel provides or the vDSO provides:
// - __restore_rt (for SA_SIGINFO handlers, calls rt_sigreturn)
// - __restore (for non-SA_SIGINFO handlers, calls sigreturn)

// These are short functions in the vDSO that just do:
// mov $15, %eax; syscall   (for rt_sigreturn)
// mov $119, %eax; syscall  (for sigreturn on old kernels)
```

A debugger seeing these in a backtrace (labeled `__restore_rt` or
`__kernel_rt_sigreturn`) means the frame above is a signal handler.

### 16.3 SA_RESTART internals

When `SA_RESTART` is set in `sigaction.sa_flags`, the kernel automatically restarts
interrupted syscalls. The kernel checks `SA_RESTART` before delivering the signal
and, if set and the syscall was interrupted, restores the registers and re-executes
the call. This is transparent to user-space — the syscall appears to return normally.

### 16.4 GCC exception handling tables [34]

For C++ exceptions and C `_Unwind_*`, the compiler emits:

- `.eh_frame` — DWARF-based Frame Description Entries (FDEs) describing how to
  unwind each function
- `.eh_frame_hdr` — sorted binary search table mapping addresses to FDEs (for
  `PT_GNU_EH_FRAME`)
- `.gcc_except_table` — Language-Specific Data Area (LSDA) for each function that
  has try/catch blocks

The `.eh_frame` uses the DWARF Call Frame Information format:

```c
// Common Information Entry (CIE)
typedef struct {
    uint8_t  version;         // 1 for DWARF, 3 for .eh_frame
    char     augmentation[];  // "zR" or "zPLR" etc.
    uint8_t  code_align;      // code alignment factor
    int8_t   data_align;      // data alignment factor
    uint8_t  ret_addr_reg;    // return address register (16 for x64)
    // ... CIE initial instructions ...
} Dwarf_CIE;

// Frame Description Entry (FDE)
// References a CIE and covers a function's address range
// Contains Call Frame Instructions for each range
```

For the reverse engineer: `.eh_frame` is how a debugger unwinds the stack for
backtraces. It's also how exception handling works under the hood. The personality
routine (referenced in the CIE augmentation) is called when an exception is thrown
to decide whether to catch or continue unwinding [34].

```bash
# Dump exception handling frames
readelf -wF /bin/ls | head -30
Contents of the .eh_frame section:

00000000 0000000000000014 00000000 CIE
  Version:               1
  Augmentation:          "zR"
  Code alignment factor: 1
  Data alignment factor: -8
  Return address column: 16
  Augmentation data:     1b
  DW_CFA_def_cfa: r7 (rsp) ofs 8
  DW_CFA_offset: r16 (rip) at cfa-8
  DW_CFA_nop

00000018 000000000000001c 0000001c FDE cie=00000000 pc=00006b20..00006b33
  DW_CFA_advance_loc: 1 to 00006b21
  DW_CFA_def_cfa_offset: 16
  DW_CFA_offset: r6 (rbp) at cfa-16
  DW_CFA_advance_loc: 3 to 00006b24
  DW_CFA_def_cfa_register: r6 (rbp)
  ...
```

### 16.5 Personality routines

Each CIE has an augmentation string like `"zPLR"`. The `P` indicates a personality
routine pointer — the function called during stack unwinding to handle cleanup
(destructors) and catch matching. On x86-64 Linux, the personality routine is
typically `__gxx_personality_v0` from libgcc [34].

---

## 17. Linux Anti-Debug & Anti-Reverse Techniques [35][36]

### 17.1 ptrace-based detection

**PTRACE_TRACEME check**: a process can only be ptraced by one tracer. If the
process calls `ptrace(PTRACE_TRACEME, ...)` and it returns -1, there's already a
tracer (debugger) attached.

```c
int anti_ptrace() {
    if (ptrace(PTRACE_TRACEME, 0, NULL, NULL) == -1) {
        // Debugger detected!
        _exit(-1);
    }
    return 0;
}
```

RE bypass: hook `ptrace` via LD_PRELOAD, patch out the check, or NOP the conditional jump.

### 17.2 /proc/self/status TracerPid

Every process has `/proc/self/status`. Field `TracerPid` is 0 when not debugged
and the pid of the tracer when it is.

```c
int check_tracerpid() {
    char buf[256];
    int fd = open("/proc/self/status", O_RDONLY);
    read(fd, buf, sizeof(buf) - 1);
    close(fd);
    if (strstr(buf, "TracerPid:\t0") == NULL) {
        // Debugger detected!
        return 1;
    }
    return 0;
}
```

RE bypass: `strace -e trace=openat` to find the check, then patch. Or use
`LD_PRELOAD` to override `open` to return a sanitized status. Or hook via
`ptrace(PTRACE_TRACEME)` before the check.

### 17.3 /proc/self/maps parsing

Binaries check for unexpected memory mappings (debugger's vdso, or gdb's memory
ranges):

```c
// Look for unusual file-backed mappings
char line[256];
FILE *f = fopen("/proc/self/maps", "r");
while (fgets(line, sizeof(line), f)) {
    if (strstr(line, "gdb") || strstr(line, "pwndbg")) {
        // Debugger detected!
    }
}
// Also check for:
// - Executable stack (PT_GNU_STACK with X)
// - Writable + executable segments
```

### 17.4 seccomp [37]

Seccomp (Secure Computing mode) allows a process to install a BPF filter that
limits what syscalls it can make. For anti-debug:

- Block `ptrace` syscall
- Block `process_vm_readv` / `process_vm_writev`
- Block `perf_event_open`
- Only allow `write`, `exit_group`, etc.

```c
#include <seccomp.h>

scmp_filter_ctx ctx = seccomp_init(SCMP_ACT_KILL);
seccomp_allow(ctx, SCMP_SYS(write));
seccomp_allow(ctx, SCMP_SYS(exit_group));
seccomp_load(ctx);
```

RE bypass: `strace -e trace=prctl` to spot seccomp setup, then modify the filter
or dump the process memory before the filter is loaded.

### 17.5 prctl PR_SET_PTRACER

```c
// Allow only a specific tracer
prctl(PR_SET_PTRACER, getppid());
// Or disallow all future tracing:
prctl(PR_SET_PTRACER, 0);
```

### 17.6 SIGTRAP-based timing attacks

```c
#include <signal.h>
#include <sys/time.h>

volatile int sig_count = 0;
void handler(int sig) { sig_count++; }

int timing_anti_debug() {
    struct sigaction sa;
    sa.sa_handler = handler;
    sigaction(SIGTRAP, &sa, NULL);

    struct timeval start, end;
    gettimeofday(&start, NULL);
    for (int i = 0; i < 10000; i++) {
        kill(getpid(), SIGTRAP);  // Each trap delivers signal or stops in debugger
    }
    gettimeofday(&end, NULL);
    double elapsed = (end.tv_sec - start.tv_sec) + (end.tv_usec - start.tv_usec) / 1e6;
    // With a debugger, SIGTRAP stops each time — much slower
    if (elapsed > expected_time) {
        // Debugger detected!
    }
    return 0;
}
```

### 17.7 Detecting strace

```c
// Tracee sees the strace tracer process via /proc/self/status
// Or use a timing check:
unsigned long long rdtsc() {
    unsigned int lo, hi;
    asm volatile("rdtsc" : "=a"(lo), "=d"(hi));
    return (unsigned long long)hi << 32 | lo;
}

// Single-stepping in a debugger dramatically increases cycle counts
```

### Workflow: common anti-re bypass

```bash
# LD_PRELOAD to hook ptrace, open, fopen
echo 'int ptrace(int r, int pid, void *a, void *d) { return 0; }' > hook.c
gcc -shared -fPIC -o hook.so hook.c
LD_PRELOAD=./hook.so ./target_binary

# Or use strace to find the detection call
strace -e trace=ptrace,open,openat ./target_binary 2>&1 | grep -E "(ptrace|TracerPid)"
```

---

## 18. The `r_debug` Interface & DT_DEBUG [3][38]

### 18.1 Purpose

The `DT_DEBUG` dynamic tag and the `_r_debug` structure provide a communication
channel between the dynamic linker and a debugger. The debugger uses this to:
- Enumerate loaded shared libraries
- Set breakpoints before library initialization
- Track library loading/unloading events at runtime (dlopen/dlclose)

### 18.2 The `r_debug` structure

```c
// From glibc: elf/link.h
struct r_debug {
    int     r_version;   // Protocol version (1 for current)
    struct  link_map *r_map;  // Head of linked list of loaded objects
    void    (*r_brk)(void);   // Pointer to breakpoint function
    enum {
        RT_CONSISTENT,      // State consistent
        RT_ADD,             // Adding a new object
        RT_DELETE           // Removing an object
    } r_state;
    void    *r_ldbase;       // Base address of ld.so
};
```

### 18.3 The `link_map` structure

```c
// From glibc: include/link.h
struct link_map {
    ElfW(Addr) l_addr;          // Base address of the loaded object
    char      *l_name;          // Absolute path of the loaded file
    ElfW(Dyn) *l_ld;            // Pointer to .dynamic section
    struct link_map *l_next;    // Next loaded object
    struct link_map *l_prev;    // Previous loaded object
    // ... (more fields in glibc internal struct, but these are the
    //      official ones from the ELF spec)
};
```

### 18.4 DT_DEBUG

`DT_DEBUG` is a platform-specific tag (21 on x86-64). At program startup, the
dynamic linker fills `d_ptr` with the address of the global `_r_debug` variable:

```bash
readelf -d /bin/ls | grep DEBUG
 0x00000015 (DEBUG)                      0x0
```

The value is `0x0` in the file — it's filled by ld.so at runtime.

### 18.5 How a debugger uses it [38]

GDB and other debuggers:
1. Locate `DT_DEBUG` in the executable's `.dynamic`
2. Read the `r_debug` structure from the filled-in address
3. Walk `r_map` (linked list of `link_map`) to enumerate all loaded libraries
4. Set `r_brk` (the breakpoint function) to get notified of `dlopen`/`dlclose`
5. GDB's `info sharedlibrary` reads this chain

### Workflow: walk link_map at runtime

```gdb
gdb /bin/ls
(gdb) start
(gdb) info sharedlibrary
From                To                  Syms Read   Shared Object Library
0x00007ffff7f6d000  0x00007ffff7fd2cce  Yes (*)     /lib64/ld-linux-x86-64.so.2
0x00007ffff7dc9000  0x00007ffff7f4a2e8  Yes (*)     /lib64/libc.so.6

# Manual walk
(gdb) p _r_debug
$1 = {r_version = 1, r_map = 0x7ffff7fd2c90, r_brk = 0x7ffff7f6e1c0,
       r_state = RT_CONSISTENT, r_ldbase = 0x7ffff7f6d000}

(gdb) p *_r_debug.r_map
$2 = {l_addr = 0, l_name = 0x7ffff7fd2c98 "/bin/ls",
       l_ld = 0x555555560d60, l_next = 0x7ffff7fd2cb0, l_prev = 0x0}

(gdb) p *_r_debug.r_map.l_next
$3 = {l_addr = 0x7ffff7dc9000, l_name = 0x7ffff7fd2cf8 "/lib64/libc.so.6",
       l_ld = 0x7ffff7fb58e0, l_next = 0x7ffff7fd2cc0, l_prev = 0x7ffff7fd2c90}
```

### 18.6 Anti-DT_DEBUG tricks

Some malware zeros out `DT_DEBUG` in their own `.dynamic` to confuse debuggers,
or removes `_r_debug` symbol visibility. However, the debugger can still find
the `r_debug` structure by searching for the `link_map` — typically looking for
the binary's known load address or following known patterns from ld.so [38].

---

## 19. Linux Executable Packing and Infection [39][40]

### 19.1 UPX (Ultimate Packer for eXtended executables)

UPX is the most common ELF packer. It compresses the original binary and prepends
a decompression stub.

Detecting UPX-packed ELF:

```bash
# UPX section names: UPX0, UPX1, UPX2
readelf -S /bin/ls.upx
  [ 1] UPX0           NOBITS         0000000000001000  00001000
  [ 2] UPX1           PROGBITS       0000000000002000  00002000
  [ 3] UPX2           PROGBITS       0000000000030000  00003000
# --- or ---
# Note that .text to .init_array are missing / section names are unusual
# The entry point lands inside UPX1, not the original .text

# Also detect via:
strings /bin/ls.upx | grep UPX
UPX!
UPX!
```

Unpacking UPX:
```bash
# Method 1: built-in decompression
upx -d /bin/ls.upx -o /bin/ls.unpacked

# Method 2: manual dump (when upx -d fails due to version mismatch)
# Run under gdb, break after OEP, dump memory:
# (gdb) catch syscall mprotect
# (gdb) run
# (gdb) continue until OEP reached (typically after a series of mprotect + jmp)
# (gdb) dump memory /tmp/dump.bin 0x400000 0x401000
```

### 19.2 Finding the OEP (Original Entry Point)

For packed ELF binaries:

1. **Section-based** — UPX typically jumps to unpacked code in `UPX0` after decompression
2. **Memory-based** — break on `mprotect` calls (packer changes page permissions for the
   unpacked code) and watch for `e_entry` value
3. **Stack-based** — after unpacking, the stub may `push e_entry; ret` to reach OEP
4. **Hardware breakpoint** — set on the known OEP region (from `readelf -h` before packing)

### 19.3 ELF crypters

A crypter encrypts the original binary and wraps it with a decryption stub.
Detection:

```bash
# High entropy in .text (encrypted payload)
ent /bin/myapp.crypted
# Shannon entropy: 7.99 bits per byte  (near-max = 8 = encrypted/compressed)
```

```python
# Python entropy check
import math
from collections import Counter

def entropy(data):
    c = Counter(data)
    return -sum((p/len(data)) * math.log2(p/len(data)) for p in c.values())

with open("/bin/myapp.crypted", "rb") as f:
    data = f.read()
    # Check .text section specifically
    # .text entropy > 7.5 suggests encryption or compression
```

### 19.4 ELF infection techniques [40]

Ways malware can infect existing ELF binaries:

| Technique | Description | Detection |
|-----------|-------------|-----------|
| **Code cave** | Overwrite padding bytes in `.text` with jump → payload → jump back | Unexpected control flow in `.text`, modified checksum |
| **PT_NOTE → PT_LOAD** | Modify a `PT_NOTE` header type to `PT_LOAD`, add code segment | Unexpected extra LOAD segment |
| **Shrink `.symtab`** | Extend section to add code, corrupt section alignment | `readelf -S` shows alignment violations |
| **Segment padding** | Overwrite padding between LOAD segments | Check file vs memory sizes |
| **`PHDR` overwrite** | Corrupt the program header and add a new one | Header validation fails |
| **`PT_GNU_RELRO`** | Remove or shrink RELRO to make GOT writable for hijack | Missing RELRO pages |

### 19.5 Runtime decryption stub patterns

An ELF crypter's stub typically does:

```asm
; Simplified ELF decryptor stub
stub_start:
    call    $+5                      ; get EIP/RIP
    pop     rbx                      ; base address
    ; Decrypt loop
    lea     rsi, [rbx + encrypted_offset]
    lea     rdi, [rbx + encrypted_offset]
    mov     ecx, encrypted_size
decrypt_loop:
    xor     byte [rdi], 0x55         ; simple XOR or more complex
    inc     rdi
    loop    decrypt_loop
    ; Set permissions
    mov     eax, 10                  ; mprotect
    mov     rdi, code_base
    mov     rsi, code_size
    mov     edx, 7                   ; PROT_READ|PROT_WRITE|PROT_EXEC
    syscall
    ; Jump to OEP
    mov     rax, original_entry
    jmp     rax
```

---

## 20. CFI, ASan, UBSan — Instrumented Binary Patterns [41][42]

### 20.1 Control-Flow Integrity (CFI)

Clang's CFI enforces that indirect call/jump targets are valid function entry points.

```bash
# Detect CFI in a binary
readelf -S /bin/cfi_app | grep cfi
  [NN] .cfi               PROGBITS        ...
```

CFI-flavored binaries have:
- `.cfi` section with valid-target bitmaps
- Each indirect call preceded by a `__cfi_check` call or jump
- Additional `.rodata` tables listing valid call targets

```asm
; CFI-protected indirect call
call    __cfi_check           ; verify target
mov     rax, [rdi+0x10]       ; load function pointer
call    rax                   ; safe call

; __cfi_check verifies the target address
; against the valid-function bitmap
```

### 20.2 AddressSanitizer (ASan) [42]

Asan instruments memory accesses with a **shadow memory** that tracks whether each
byte of application memory is accessible.

Shadow memory mapping (x86-64 Linux):

```
App memory:   [0x00007fffffffe000, 0x7fffffffffff]
Shadow byte:  app_addr >> 3 + 0x7fff8000  (for 64-bit)
```

Each shadow byte encodes:
- `0` = all 8 bytes in this aligned region are valid
- `1-7` = only the first N bytes are valid
- Negative = the entire 8-byte region is poisoned (redzone)

```asm
; ASan-instrumented load
mov    rax, [rdi]                  ; load address
mov    rcx, rdi
shr    rcx, 3                      ; shadow address = addr / 8
add    rcx, __asan_shadow_offset   ; + 0x7fff8000
test   byte [rcx], 0x7f            ; check shadow
jnz    __asan_report_load_n        ; if non-zero, error!
mov    rax, [rdi]                  ; actual load
```

Detecting ASan binaries:
- Symbols: `__asan_*` present
- Runtime library: `libasan.so.*` loaded
- Stack frames have redzones (32+ bytes of poison around locals)
- `__asan_option_detect_stack_use_after_return` may be set

### 20.3 UndefinedBehaviorSanitizer (UBSan)

UBSan inserts checks for undefined behavior:

```asm
; UBSan check for signed overflow
add    eax, ebx                    ; may overflow
jo     __ubsan_handle_add_overflow ; if overflow, call handler

; UBSan check for shift-out-of-bounds
mov    ecx, [rbp-4]
cmp    ecx, 31
ja     __ubsan_handle_shift_out_of_bounds
shr    eax, cl
```

Detecting UBSan:
- Symbols: `__ubsan_handle_*` visible via `nm` or `readelf -s`
- Strings: `/usr/lib/gcc/x86_64-linux-gnu/.../libubsan.so`
- Call to `__ubsan_get_current_report_data` in crash handlers

### 20.4 libFuzzer instrumentation [43]

Fuzzer-instrumented binaries have:

```bash
# Symbols
nm /bin/fuzz_app | grep -E '__sanitizer_cov|__sanitizer_alloc|__afl_'
__sanitizer_cov_reset
__sanitizer_cov_load
__sanitizer_get_coverage_guards

# .data section contains coverage bitmaps
# Callbacks on each edge/cmp
```

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
