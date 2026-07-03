# Mach-O Header, Load Commands, and Segments

TL;DR: Mach-O file format internals -- header (mach_header_64), fat/universal binaries,
load commands (LC_SEGMENT_64, LC_SYMTAB, LC_DYSYMTAB, etc.), segments and sections.

Cross-reference: See also `macho-re-tools.md`, `macho-dyld-shared-cache.md` in this directory.

> **Related files:**
> - [ObjC/Swift Runtime & ABI](../platforms/macos-objc-swift-runtime.md)
> - [iOS Security, Analysis & Anti-RE](../platforms/macos-ios-security-analysis.md)

---

## 1. Mach-O Format

Mach-O (Mach Object) is the native executable format on all Apple platforms.
Each file is a linear byte stream with three structural regions: header, load
commands, and segment/section data [1][7][13].

```
+---------------------+
| Mach-O Header       |  mach_header / mach_header_64
+---------------------+
| Load Commands       |  array of struct load_command
|  LC_SEGMENT_64      |
|  LC_SYMTAB          |
|  LC_DYSYMTAB        |
|  LC_CODE_SIGNATURE  |
|  LC_ENCRYPTION_INFO |
|  ...                |
+---------------------+
| Segment Data        |
|  __TEXT (code)      |  sections: __text, __cstring, __objc_methname, ...
|  __DATA (data)      |  sections: __data, __objc_data, __got, ...
|  __LINKEDIT         |  symbol table, string table, code signature
+---------------------+
```

### 1.1 Mach-O Header

Two struct flavors depending on architecture [1][14]:

**32-bit:**
```c
struct mach_header {
    uint32_t magic;        // MH_MAGIC (0xFEEDFACE) / MH_CIGAM (0xCEFAEDFE)
    int32_t  cputype;      // CPU_TYPE_I386, CPU_TYPE_ARM, etc.
    int32_t  cpusubtype;   // CPU_SUBTYPE_I386_ALL, CPU_SUBTYPE_ARM_V7, etc.
    uint32_t filetype;     // MH_OBJECT, MH_EXECUTE, MH_DYLIB, MH_DYLINKER, MH_BUNDLE
    uint32_t ncmds;        // number of load commands
    uint32_t sizeofcmds;   // total bytes of all load commands
    uint32_t flags;        // MH_NOUNDEFS, MH_DYLDLINK, MH_PIE, MH_TWOLEVEL, etc.
};
```

**64-bit:**
```c
struct mach_header_64 {
    uint32_t magic;        // MH_MAGIC_64 (0xFEEDFACF) / MH_CIGAM_64 (0xCFFAEDFE)
    int32_t  cputype;
    int32_t  cpusubtype;
    uint32_t filetype;
    uint32_t ncmds;
    uint32_t sizeofcmds;
    uint32_t flags;
    uint32_t reserved;     // reserved (always 0 in practice)
};
```

| Magic | Byte order | Architecture |
|-------|-----------|---------------|
| `0xFEEDFACE` | Little-endian | 32-bit native |
| `0xCEFAEDFE` | Big-endian | 32-bit swapped (PowerPC) |
| `0xFEEDFACF` | Little-endian | 64-bit native |
| `0xCFFAEDFE` | Big-endian | 64-bit swapped |

Key `flags` for reverse engineering [7][13]:

| Flag | Value | Meaning |
|------|-------|---------|
| `MH_NOUNDEFS` | 0x1 | No undefined symbols (fully linked) |
| `MH_DYLDLINK` | 0x4 | Binary is linked with dyld (dynamically linked) |
| `MH_PIE` | 0x200000 | Position-independent executable (ASLR enabled) |
| `MH_TWOLEVEL` | 0x80 | Two-level namespace (default on modern Apple) |
| `MH_FORCE_FLAT` | 0x100 | Flat namespace (not two-level) |
| `MH_ALLOW_STACK_EXECUTION` | 0x20000 | Stack executable (rare outside JIT) |

### 1.2 Fat / Universal Binaries

A single file wraps multiple Mach-O slices. Starts with `fat_header` [1][15]:

```c
struct fat_header {
    uint32_t magic;        // FAT_MAGIC (0xCAFEBABE) / FAT_CIGAM (0xBEBAFECA)
    uint32_t nfat_arch;    // number of architecture slices
};

struct fat_arch {
    int32_t  cputype;
    int32_t  cpusubtype;
    uint32_t offset;       // offset to the Mach-O slice
    uint32_t size;
    uint32_t align;
};
```

A fat binary with `x86_64` + `arm64` slices is a universal binary seen on macOS.
On iOS, only `arm64` slices are used. Extract individual slices:

```bash
# List architectures in a fat binary
lipo -info /path/to/binary

# Extract one architecture slice
lipo /path/to/binary -thin arm64 -output output-arm64

# Extract a specific slice by offset (manual)
lipo /path/to/binary -extract arm64 -output output-arm64

# Create a universal binary from two slices
lipo -create -output universal arm64_slice x86_64_slice
```

### 1.3 Load Commands

Each load command starts with `(cmd, cmdsize)` [1][13]:

```c
struct load_command {
    uint32_t cmd;     // LC_SEGMENT_64, LC_SYMTAB, LC_DYSYMTAB, ...
    uint32_t cmdsize; // total size of this command including struct + payload
};
```

| Load command | Value | Purpose |
|-------------|-------|---------|
| `LC_SEGMENT_64` | 0x19 | Defines a 64-bit segment (__TEXT, __DATA, __LINKEDIT) |
| `LC_SYMTAB` | 0x2 | Symbol table + string table offsets and sizes |
| `LC_DYSYMTAB` | 0xB | Dynamic symbol table (local/external/undefined symbol indices) |
| `LC_LOAD_DYLIB` | 0xC | Load a dependent dylib |
| `LC_ID_DYLIB` | 0xD | Dylib's install name (self-identification) |
| `LC_LOAD_DYLINKER` | 0xE | Path to the dynamic linker (/usr/lib/dyld) |
| `LC_UUID` | 0x1B | 16-byte UUID -- unique build identifier |
| `LC_CODE_SIGNATURE` | 0x1D | Code signature (SuperBlob) -- offset and size |
| `LC_SEGMENT_SPLIT_INFO` | 0x1E | Split seg info for dyld |
| `LC_ENCRYPTION_INFO` / `LC_ENCRYPTION_INFO_64` | 0x21 / 0x2C | FairPlay encryption metadata |
| `LC_MAIN` | 0x28 | Entry point (slideable offset) -- replaces LC_UNIXTHREAD on modern |
| `LC_DATA_IN_CODE` | 0x29 | Data regions inside code for dyld |
| `LC_SOURCE_VERSION` | 0x2A | Source code version |
| `LC_DYLIB_CODE_SIGN_DRS` | 0x2B | Code signing DRs |
| `LC_LINKER_OPTIMIZATION_HINT` | 0x2E | dyld optimization hints |
| `LC_DYLD_EXPORTS_TRIE` | 0x33 | Trie-structured export info (iOS 15+) |
| `LC_DYLD_CHAINED_FIXUPS` | 0x34 | Chained fixup metadata (iOS 15+) |

### 1.4 Segments and Sections -- LC_SEGMENT_64

The critical load command [1][14]:

```c
struct segment_command_64 {
    uint32_t cmd;          // LC_SEGMENT_64
    uint32_t cmdsize;      // sizeof(segment_command_64) + nsects * sizeof(section_64)
    char     segname[16];  // "__TEXT", "__DATA", "__LINKEDIT", "__OBJC", etc.
    uint64_t vmaddr;       // virtual address at which this segment loads
    uint64_t vmsize;       // virtual memory size (may be larger than file size)
    uint64_t fileoff;      // file offset of segment data
    uint64_t filesize;     // amount of data on disk
    int32_t  maxprot;      // maximum VM protection (VM_PROT_READ|WRITE|EXECUTE)
    int32_t  initprot;     // initial VM protection
    uint32_t nsects;       // number of sections in this segment
    uint32_t flags;        // SG_HIGHVM, SG_FVMLIB, SG_NORELOC, etc.
};
```

Each section header:

```c
struct section_64 {
    char     sectname[16]; // "__text", "__data", "__objc_methname", etc.
    char     segname[16];  // "__TEXT", "__DATA", etc.
    uint64_t addr;         // virtual address of this section
    uint64_t size;         // byte count
    uint32_t offset;       // file offset
    uint32_t align;        // log2 of alignment
    uint32_t reloff;       // relocation table file offset
    uint32_t nreloc;       // relocation entry count
    uint32_t flags;        // S_ATTR_DEBUG, S_ATTR_SOME_INSTRUCTIONS, etc.
    uint32_t reserved1;    // for S_ATTR_RESERVED sections: stub size/index range
    uint32_t reserved2;    // for S_SYMBOL_STUBS: stub entry size
    uint32_t reserved3;    //
};
```

**Key segments and sections for RE [7][13]:**

| Segment | Section | Contents |
|---------|---------|----------|
| `__TEXT` | `__text` | Executable machine code |
| `__TEXT` | `__cstring` | C string literals |
| `__TEXT` | `__const` | Constant data |
| `__TEXT` | `__stubs` | Dynamic linking stubs (indirect jumps through `__la_symbol_ptr`) |
| `__TEXT` | `__stub_helper` | Lazy binding helper code |
| `__TEXT` | `__objc_methname` | Objective-C method name strings |
| `__TEXT` | `__objc_classname` | Objective-C class name strings |
| `__TEXT` | `__objc_methtype` | Objective-C method type encoding strings |
| `__DATA` | `__data` | Read-write data |
| `__DATA` | `__const` | Relocatable constant data |
| `__DATA` | `__bss` | Uninitialized data |
| `__DATA` | `__got` | Global Offset Table (non-lazy) |
| `__DATA` | `__la_symbol_ptr` | Lazy symbol pointers |
| `__DATA` | `__nl_symbol_ptr` | Non-lazy symbol pointers |
| `__DATA` | `__cfstring` | CoreFoundation CFString constants |
| `__DATA` | `__objc_classlist` | List of class pointers |
| `__DATA` | `__objc_nlclslist` | Non-lazy class list |
| `__DATA` | `__objc_catlist` | Category list |
| `__DATA` | `__objc_protolist` | Protocol list |
| `__DATA` | `__objc_selrefs` | Selector references |
| `__DATA` | `__objc_ivar` | Instance variables |
| `__DATA` | `__objc_data` | Objective-C class data (rw) |
| `__LINKEDIT` | -- | Raw data: symbol table, string pool, code signature |

**Memory protection notes:**
- `__TEXT`: initprot = R+X (code cannot be written)
- `__DATA`: initprot = R+W (data cannot be executed)
- `__LINKEDIT`: initprot = R (read only)
- A `W+X` segment is a security red flag (and macOS SIP prevents it for most binaries)

### 1.5 LC_SYMTAB -- Symbol Table

```c
struct symtab_command {
    uint32_t cmd;        // LC_SYMTAB
    uint32_t cmdsize;
    uint32_t symoff;     // file offset to symbol table
    uint32_t nsyms;      // number of symbols
    uint32_t stroff;     // file offset to string table
    uint32_t strsize;    // string table size
};
```

Each symbol entry is an `nlist_64`:

```c
struct nlist_64 {
    uint32_t n_strx;     // index into string table
    uint8_t  n_type;     // symbol type mask
    uint8_t  n_sect;     // section number (1-indexed, 0 = none)
    uint16_t n_desc;     // description flags (referenced, defined, NOPEXT, etc.)
    uint64_t n_value;    // address of the symbol (or value for non-code symbols)
};
```

`n_type` encoding [1]:
- N_EXT (0x01): External symbol (visible outside this module)
- N_PEXT (0x10): Private external
- N_TYPE mask (0x0E): N_UNDF (0x0), N_ABS (0x2), N_SECT (0xE), N_PBUD (0xC), N_INDR (0xA)

`n_desc` flags:
- REFERENCE_FLAG_UNDEFINED_NON_LAZY (0x0): Non-lazy binding
- REFERENCE_FLAG_UNDEFINED_LAZY (0x1): Lazy binding
- REFERENCED_DYNAMICALLY (0x10): Symbol was referenced dynamically
- N_NO_DEAD_STRIP (0x20): Prevent dead-code stripping
- N_WEAK_REF (0x40): Weak reference (may not resolve)
- N_WEAK_DEF (0x80): Weak definition (may be overridden)

### 1.6 LC_DYSYMTAB -- Dynamic Symbol Table

Extends `LC_SYMTAB` with indexes into the symbol table [1][13]:

```c
struct dysymtab_command {
    uint32_t cmd;              // LC_DYSYMTAB
    uint32_t cmdsize;
    uint32_t ilocalsym;        // index of first local (non-external) symbol
    uint32_t nlocalsym;        // count of local symbols
    uint32_t iextdefsym;       // index of first external defined symbol
    uint32_t nextdefsym;       // count of external defined symbols
    uint32_t iundefsym;        // index of first undefined symbol
    uint32_t nundefsym;        // count of undefined (imported) symbols
    uint32_t tocoff;           // file offset of table of contents
    uint32_t ntoc;             // toc entries
    uint32_t modtaboff;        // module table offset
    uint32_t nmodtab;          // module table entries
    uint32_t extrefsymoff;     // external reference entry offset
    uint32_t nextrefsyms;      // external reference entries
    uint32_t indirectsymoff;   // indirect symbol table offset
    uint32_t nindirectsyms;    // indirect symbol entries
    uint32_t extreloff;        // external relocation offset
    uint32_t nextrel;          // external relocation entries
    uint32_t locreloff;        // local relocation offset
    uint32_t nlocrel;          // local relocation entries
};
```

The indirect symbol table maps `__stubs`, `__got`, and `__la_symbol_ptr` entries
to their symbol table indices. A value of `INDIRECT_SYMBOL_LOCAL (0x80000000)`
means a local resolver; `INDIRECT_SYMBOL_ABS (0x40000000)` means absolute.

### 1.7 LC_CODE_SIGNATURE

```c
struct linkedit_data_command {
    uint32_t cmd;      // LC_CODE_SIGNATURE
    uint32_t cmdsize;
    uint32_t dataoff;  // file offset of the code signature blob
    uint32_t datasize; // size in bytes
};
```

Points to an embedded `SuperBlob` structure: a concatenated set of code
directories (`CS_DERIVED_FILE`, `CS_REQUIREMENTS`, etc.). This is Apple's
code signing store. The binary will not execute if this is invalid and SIP is
enabled [16].

### 1.8 LC_ENCRYPTION_INFO / LC_ENCRYPTION_INFO_64

```c
struct encryption_info_command_64 {
    uint32_t cmd;        // LC_ENCRYPTION_INFO_64
    uint32_t cmdsize;
    uint32_t cryptoff;   // file offset of the encrypted region
    uint32_t cryptsize;  // size of the encrypted region
    uint32_t cryptid;    // 0 = not encrypted, 1 = encrypted (FairPlay)
};
```

`cryptid` = 1 means the binary is FairPlay-encrypted. The encrypted region
spans from `cryptoff` for `cryptsize` bytes -- typically the `__TEXT` segment
(see §7 for decryption approaches).

### 1.9 LC_MAIN -- Modern Entry Point

```c
struct entry_point_command {
    uint32_t cmd;       // LC_MAIN
    uint32_t cmdsize;
    uint64_t entryoff;  // file offset of the entry point (slideable)
    uint64_t stacksize; // initial thread stack size (0 = default)
};
```

The actual entry address = `entryoff + slide` (where `slide` = ASLR offset).
On older binaries, `LC_UNIXTHREAD` (a thread state load command) was used
instead.

### 1.10 dyld Chained Fixups (iOS 15+ / macOS 12+)

Modern dyld replaces the traditional rebase/bind opcode model with **chained
fixups** for performance [2][17]. Instead of a stream of opcodes that dyld
interprets, fixup information is embedded directly in certain pointer locations
using "fixup chains".

`LC_DYLD_CHAINED_FIXUPS` replaces `LC_DYLD_INFO_ONLY`. The format varies by
pointer authentication and architecture:
- `DYLD_CHAINED_PTR_ARM64E`: 16-byte fixup for arm64e (with PAC)
- `DYLD_CHAINED_PTR_ARM64`: 8-byte fixup for arm64
- `DYLD_CHAINED_PTR_X86_64`: 8-byte fixup for x86-64

Each chained pointer's high bits encode the type, offset to the next fixup, and
the addend/extraneous info. Dyld walks the chain, applies rebases (adding the
ASLR slide), then binds (resolving symbol addresses).
