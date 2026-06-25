# ELF Header, Segments, and Sections

TL;DR: ELF file layout, ELF header (Elf64_Ehdr), program headers (segments/PT_LOAD),
and section headers (.text, .data, .bss, .dynamic, etc.) for reverse engineering.

Cross-reference: See also `elf-dynamic-symbols-hash.md`, `elf-plt-got-relro-init.md`, `elf-pic-relocations-tls.md` in this directory.

> **Related:** Runtime behavior, dynamic linker internals, syscalls, anti-debug,
> and analysis tools are in `../platforms/linux-runtime-and-analysis.md`.

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
