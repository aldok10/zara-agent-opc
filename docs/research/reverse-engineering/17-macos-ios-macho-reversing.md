# macOS/iOS Binary Reverse Engineering — Mach-O, ObjC/Swift Runtime & DTrace

A working reference for analysts examining Mach-O binaries on Apple platforms.
Topics span the binary format itself, the Objective-C and Swift runtime object
models, FairPlay decryption, dyld internals, kernel RE, anti-analysis patterns,
and DTrace-based dynamic tracing. All workflows assume authorized analysis of
binaries you own or have explicit permission to examine.

Primary sources: Apple's OS X ABI Mach-O reference [1], the Apple open-source
dyld source [2], Apple's ObjC runtime source [3], the Swift ABI documentation
[4], LLVM/Clang docs [5], OWASP iOS testing guides [6], and community resources
from the iOS RE wiki [7], NowSecure [8][9][10], and practical tools [11][12].

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
| `LC_UUID` | 0x1B | 16-byte UUID — unique build identifier |
| `LC_CODE_SIGNATURE` | 0x1D | Code signature (SuperBlob) — offset and size |
| `LC_SEGMENT_SPLIT_INFO` | 0x1E | Split seg info for dyld |
| `LC_ENCRYPTION_INFO` / `LC_ENCRYPTION_INFO_64` | 0x21 / 0x2C | FairPlay encryption metadata |
| `LC_MAIN` | 0x28 | Entry point (slideable offset) — replaces LC_UNIXTHREAD on modern |
| `LC_DATA_IN_CODE` | 0x29 | Data regions inside code for dyld |
| `LC_SOURCE_VERSION` | 0x2A | Source code version |
| `LC_DYLIB_CODE_SIGN_DRS` | 0x2B | Code signing DRs |
| `LC_LINKER_OPTIMIZATION_HINT` | 0x2E | dyld optimization hints |
| `LC_DYLD_EXPORTS_TRIE` | 0x33 | Trie-structured export info (iOS 15+) |
| `LC_DYLD_CHAINED_FIXUPS` | 0x34 | Chained fixup metadata (iOS 15+) |

### 1.4 Segments and Sections — LC_SEGMENT_64

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
| `__LINKEDIT` | — | Raw data: symbol table, string pool, code signature |

**Memory protection notes:**
- `__TEXT`: initprot = R+X (code cannot be written)
- `__DATA`: initprot = R+W (data cannot be executed)
- `__LINKEDIT`: initprot = R (read only)
- A `W+X` segment is a security red flag (and macOS SIP prevents it for most binaries)

### 1.5 LC_SYMTAB — Symbol Table

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

### 1.6 LC_DYSYMTAB — Dynamic Symbol Table

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
spans from `cryptoff` for `cryptsize` bytes — typically the `__TEXT` segment
(see §7 for decryption approaches).

### 1.9 LC_MAIN — Modern Entry Point

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

---

## 2. Mach-O RE Tools

### 2.1 otool — The Native Disassembler and Inspector

Ships with Xcode Command Line Tools. The LLVM-based `llvm-otool` (or
`otool-classic`). Essential commands [18][19]:

```bash
# Basic header dump
otool -h /path/to/binary

# Full load commands
otool -l /path/to/binary

# Disassemble __TEXT,__text section
otool -tV /path/to/binary

# Disassemble a specific range
otool -tV -range __TEXT,__text=0x1000:0x2000 /path/to/binary

# Objective-C class/method listing
otool -ov /path/to/binary

# Dependent dylibs
otool -L /path/to/binary

# Symbol table (both static and dynamic)
otool -IV /path/to/binary

# Universal binary contents
otool -f /path/to/universal

# All segment/section sizes
otool -l /path/to/binary | grep -A4 "segname\|sectname"

# FairPlay encryption status
otool -l /path/to/binary | grep -A4 LC_ENCRYPTION_INFO

# Read-only cstring contents
otool -s __TEXT __cstring /path/to/binary
```

### 2.2 nm — Symbol Listing

Lists symbols from the symbol table [19]:

```bash
# All symbols
nm /path/to/binary

# Only undefined (imported) symbols
nm -u /path/to/binary

# Sort by address value
nm -n /path/to/binary

# Show both debug/dynamic symbols (macOS specific)
nm -m /path/to/binary

# Only ObjC class-related symbols
nm /path/to/binary | grep -E 'OBJC_CLASS|OBJC_METACLASS|OBJC_IVAR'

# Demangle Swift symbols
nm -U /path/to/binary | xcrun swift-demangle
```

### 2.3 strings

```bash
# Extract all printable strings from a Mach-O
strings /path/to/binary

# ObjC selector names are stored as raw strings in __objc_methname
strings - /path/to/binary | grep '^\-\[.*' | sort -u

# Find URL scheme handlers
strings /path/to/binary | grep '://'
```

### 2.4 jtool / jtool2

Jonathan Levin's `jtool2` is a more feature-rich `otool` alternative [20].
Requires installation from http://newosxbook.com.

```bash
# Header and load commands
jtool2 --analyze /path/to/binary

# ObjC class introspection
jtool2 --objc /path/to/binary

# Entitlements
jtool2 --ent /path/to/binary

# Signing status
jtool2 --sig /path/to/binary

# Unpack universal
jtool2 --arch arm64 /path/to/binary

# Show all load commands in detail
jtool2 -l /path/to/binary
```

### 2.5 class-dump

Dumps the Objective-C class interface from a Mach-O binary [21].
Requires the (now unsupported) `class-dump`, or the maintained fork
from nygard: https://github.com/nygard/class-dump.

```bash
# Dump all ObjC interfaces
class-dump /path/to/binary

# Output to specific file
class-dump -H -o /output/dir /path/to/binary

# Dump for specific arch in fat binary
class-dump --arch arm64 /path/to/binary
```

### 2.6 dsdump

A modern alternative to `class-dump` by Derek Selander [11], written in Swift:
https://github.com/DerekSelander/dsdump

```bash
# Dump all ObjC/Swift class info
dsdump /path/to/binary

# Dump with Swift demangling
dsdump --swift /path/to/binary

# JSON output
dsdump --json /path/to/binary
```

### 2.7 MachOView / MachO Explorer

- **MachOView** (GUI): Visual hex editor + structure viewer for Mach-O files.
  Open-source: https://github.com/gdbinit/MachOView
- **MachO Explorer** (commercial): Modern SwiftUI-based Mach-O inspector with
  section navigation, symbol browsing, and ObjC runtime tree view.

### 2.8 Hopper Disassembler

A native macOS RE tool by CrystalIDE: https://www.hopperapp.com
- First-class Mach-O parsing (fat/universal, encryption signatures)
- Objective-C class browser (class hierarchy, method lists, protocols)
- Swift metadata awareness (type descriptors, witness tables)
- ARM64, x86-64, ARMv7 disassembly + decompilation (pseudo-code)
- Scriptable with Python and native Hopper SDK

### 2.9 Binary Ninja Mach-O Support

Vector35's Binary Ninja has growing Mach-O support:
- Parses LC_DYLD_CHAINED_FIXUPS (newer format)
- ObjC/Swift metadata reconstruction
- ARM64e PAC pointer support
- Scriptable Python API for custom analysis

### 2.10 Ghidra Mach-O Loader

Ghidra ships with a Mach-O loader that:
- Parses fat/universal headers, load commands, segments/sections
- Reconstructs ObjC class hierarchies (with `OBJC_CLASS` analysis)
- Handles dyld shared cache as a bulk load
- Swift name demangling via plugin
- Code signing block analysis

Limitations: encrypted binaries must be decrypted first. The loader may struggle
with newer chained fixup formats (iOS 15+) — use the community `ghidra-macho`
plugins if needed.

### 2.11 Tool Comparison

| Tool | Static | Dynamic | ObjC | Swift | GUI | Scripting |
|------|--------|---------|------|-------|-----|-----------|
| otool | Full | — | -ov | — | No | Pipeable |
| nm | Symbol | — | OBJC_CLASS | — | No | Pipeable |
| jtool2 | Full | — | Full | Partial | No | Bash |
| class-dump | — | — | Full | — | No | Pipeable |
| dsdump | Full | — | Full | Full | No | JSON |
| MachOView | Full | — | Sections | — | Yes | — |
| Hopper | Full | Partial | Full | Partial | Yes | Python |
| Binary Ninja | Full | Partial | Full | Partial | Yes | Python |
| Ghidra | Full | — | Plugin | Plugin | Yes | Python/Java |

---

## 3. Objective-C Runtime

Objective-C is a dynamic language. Method calls are **messages** resolved at
runtime via `objc_msgSend`. The runtime structures embedded in the binary
are the reverse engineer's primary source of method/class/ivar information
[3][7][22].

### 3.1 The objc_msgSend Dispatch

Every ObjC method call `[receiver message:arg]` compiles to:

```asm
; x86_64: receiver in RDI, selector in RSI, args in RDX, RCX, R8, R9
mov    rdi, qword [receiver_ptr]  ; self
mov    rsi, @selector(message:)   ; sel
mov    rdx, arg1                  ; first arg (if any)
call   _objc_msgSend

; ARM64: receiver in X0, selector in X1, args in X2-X7
ldr    x0, [receiver_ptr]
adrp   x1, [sel_message:]@page
add    x1, x1, [sel_message:]@pageoff
mov    x2, arg1
bl     _objc_msgSend
```

`objc_msgSend` does:
1. Check `receiver` for nil (returns nil/zero if nil)
2. Read the class pointer via `isa` (`[receiver class]`)
3. Look up the selector in the class's method cache (optimized hash table)
4. Miss: walk the method list → superclass chain → resolve → forward
5. Call the IMP (function pointer)

### 3.2 Class Structure

Modern Objective-C defines class metadata in two zones: **read-only** (clean,
pageable) and **read-write** (dirty, always resident) [23]:

```c
// Clean memory — paged out, never modified after load
struct class_ro_t {
    uint32_t flags;
    uint32_t instanceStart;
    uint32_t instanceSize;
    uint32_t reserved;       // for alignment
    const uint8_t *ivarLayout;
    const char *name;        // class name string
    method_list_t *baseMethods;  // method list
    protocol_list_t *baseProtocols;
    ivar_list_t *ivars;      // instance variable list
    const uint8_t *weakIvarLayout;
    property_list_t *baseProperties;
};

// Dirty memory — always resident, runtime mutates
struct class_rw_t {
    uint32_t flags;
    uint32_t version;
    class_ro_t *ro;           // pointer to read-only data
    method_array_t methods;    // methods (including categories)
    property_array_t properties;
    protocol_array_t protocols;
    Class firstSubclass;
    Class nextSiblingClass;
};
```

The visible `objc_class` (what `isa` points to):

```c
struct objc_class {
    Class isa;                          // metaclass pointer
    Class superclass;                   // parent class
    cache_t cache;                      // method cache (bucket ptr + mask + occupied)
    class_data_bits_t bits;             // contains class_rw_t * (fastpath)
};
```

The `bits` field uses bit packing. Extract the class_rw_t pointer:
```c
class_rw_t *data() {
    return (class_rw_t *)(bits & FAST_DATA_MASK);  // ~7 bit-aligned mask
}
```

To read at runtime via lldb:

```lldb
# Given an instance object $obj
# Get its class
po [0x12345 class]

# Read class_rw_t from an objc_class pointer
expr -l objc -O -- (struct class_rw_t *)(((uint64_t)[0x12345 class] + 0x20))

# Read class_ro_t fields
expr -l objc -O -- (struct class_ro_t *)(((uint64_t)[0x12345 class] + 0x20)->ro)
```

### 3.3 Method Lists and method_t

Each method is a `method_t` [3][22]:

```c
struct method_t {
    SEL name;       // selector (pointer to null-terminated string)
    const char *types; // type encoding string (e.g. "@24@0:8@16")
    IMP imp;        // function pointer (actual implementation)
};
```

`SEL` is just a unique string pointer (all selectors exist once in the runtime).

The type encoding encodes argument types:
- `@` = object (id)
- `#` = class (Class)
- `:` = SEL (selector)
- `v` = void
- `i` = int
- `f` = float
- `^v` = void*
- `?` = unknown/block

For a method `-(int)doSomething:(id)param`, the encoding is `i24@0:8@16`:
- `i`: return type (int)
- `24`: total size of arguments in bytes
- `@0`: object at offset 0 (self)
- `:8`: selector at offset 8
- `@16`: id param at offset 16

### 3.4 Categories

Categories add methods/properties/protocols to a class at runtime [3]:

```c
struct category_t {
    const char *name;
    Class cls;                          // class to extend
    method_list_t *instanceMethods;
    method_list_t *classMethods;
    protocol_list_t *protocols;
    property_list_t *instanceProperties;
    method_list_t *classProperties;
};
```

Categories are stored in `__DATA,__objc_catlist`. At runtime, the category
methods are attached to the class by `objc_loadCategories()`.

### 3.5 Protocols

```c
struct protocol_t {
    Class isa;
    const char *mangledName;
    protocol_list_t *protocols;          // adopted protocols
    method_list_t *instanceMethods;
    method_list_t *classMethods;
    method_list_t *optionalInstanceMethods;
    method_list_t *optionalClassMethods;
    property_list_t *instanceProperties;
    ...
};
```

Protocol metadata is emitted in `__DATA,__objc_protolist`.

### 3.6 Method Swizzling

Swizzling exchanges two method implementations at runtime [24]:

```objc
Method original = class_getInstanceMethod(cls, origSel);
Method swizzled = class_getInstanceMethod(cls, altSel);
method_exchangeImplementations(original, swizzled);
```

Detection via RE:
- Search for `method_exchangeImplementations` import
- Look for `class_getInstanceMethod` + `class_addMethod` patterns
- Runtime: enumerate method lists and compare IMP vs expected
- `dladdr()` on a method IMP can reveal the original dylib

### 3.7 Message Forwarding

When `objc_msgSend` can't find a method, it triggers the forwarding mechanism:

1. `+ (BOOL)resolveInstanceMethod:(SEL)sel` — ask the class to add one dynamically
2. `- (id)forwardingTargetForSelector:(SEL)aSelector` — redirect to another object
3. `- (NSMethodSignature *)methodSignatureForSelector:(SEL)` + `- (void)forwardInvocation:(NSInvocation *)` — full forwarding

In disassembly, look for overrides of these methods (especially in runtime
introspection frameworks like JSPatch or aspects).

---

## 4. Swift Runtime

Swift's runtime model differs fundamentally from ObjC. Where ObjC is
dynamic-by-default, Swift prefers static dispatch but provides runtime metadata
for reflection, generics, and ObjC interop [4][25][26].

### 4.1 Swift vs ObjC Calling Convention Differences

| Aspect | Objective-C | Swift |
|--------|-------------|-------|
| Dispatch | Dynamic via `objc_msgSend` | Static by default; virtual via vtable |
| Method tables | Method lists per class (flat) | Vtable per class (array of IMPs) |
| Protocol dispatch | ObjC message send | Witness table (protocol conformance metadata) |
| Namespace | Global (flat) | Module-qualified mangled names |
| ABI stability | Stable (v2, 2006) | Stable since Swift 5.0 (2019) |
| `self` / `self` | Explicit parameter in msgSend | Hidden first parameter in registers |
| Struct ABI | Not applicable (ObjC objects are ref-counted heap) | Returned in registers or hidden sret |
| Error handling | NSError** pattern | `throws` → error in hidden autoreleased pointer |

### 4.2 Swift Type Metadata

Every Swift type has a metadata record reachable via a global symbol [4][27]:

```c
struct Metadata {
    const MetadataKind kind;    // low bits encode kind (class, struct, enum, etc.)
};
```

For classes, the full structure is:

```c
struct ClassMetadata {
    MetadataKind kind;           // = Class (with ObjC flag bit)
    Class superClass;            // ObjC-compatible superclass pointer
    CacheData cache;             // (reserved for runtime cache)
    Data data;                   // (reserved for runtime data)
    // Class-specific:
    uint32_t classFlags;
    uint32_t instanceAddressPoint;
    uint32_t instanceSize;
    uint16_t instanceAlignMask;
    uint16_t runtimeReserved;
    uint32_t classObjectSize;
    uint32_t classObjectAddressPoint;
    const void *description;     // TypeDescriptor (nominal type descriptor)
    // ... vtable entries follow
};
```

### 4.3 Type Descriptors

Nominal type descriptors describe the structure of a type [4][27]:

```c
struct TargetTypeDescriptor {
    uint32_t flags;
    uint32_t parent;
    int32_t name;               // relative offset to demangled name string
    int32_t accessFunction;
    int32_t fieldDescriptor;
};
```

Flags encode: kind (class/struct/enum/protocol), resilience, and generic
parameters. The `name` is a relative offset from the descriptor's address.

Use `dsdump --swift` to dump Swift type information:

```bash
dsdump --swift /path/to/binary
```

### 4.4 Witness Tables (Protocol Conformance)

Protocol conformance metadata has the general structure [25][28]:

```c
struct ProtocolConformanceDescriptor {
    int32_t protocolDescriptor;    // relative offset to protocol descriptor
    int32_t nominalTypeDescriptor; // relative offset to type descriptor
    int32_t conformanceFlags;      // bits: isRetroactive, isConcrete, ...
    int32_t witnessTable;          // relative offset to witness table
};
```

The **witness table** is an array of function pointers implementing protocol
requirements. When a generic function calls a protocol method, Swift:
1. Loads the protocol conformance descriptor for the concrete type
2. Accesses the witness table from the conformance
3. Calls the specific function pointer at a fixed index

Format:
```c
struct WitnessTable {
    void *protocolRequirements[];  // ordered as declared in the protocol
    // Entries: function pointers, type metadata, associated type descriptors
};
```

### 4.5 Vtable Layout

Swift classes use a virtual table (vtable) for method dispatch (unless methods
are `final` or non-overridable). The vtable is appended **after** the class
metadata struct in memory [25]:

```
[ClassMetadata fields...]
[description pointer]
[vtable entry 0]   // first overridable method
[vtable entry 1]   // second overridable method
...
```

The vtable order matches the **source declaration order** of overridable
methods across the class hierarchy. Base class methods appear first, then
overrides at the same offset in the derived class's vtable.

To reconstruct the vtable from a binary:
1. Find the `__DATA,__objc_data` or `__DATA,__const` entry for the class metadata
2. Locate the `description` pointer (which is a type descriptor)
3. The vtable follows immediately after the metadata struct
4. Read function pointer addresses and cross-reference them to functions

### 4.6 Swift Name Mangling

Swift mangling uses a distinct scheme based on the Itanium ABI but with major
differences. Only the prefix is shared; the encoding is entirely Swift-specific
[4][29].

**Prefix evolution:**
- Swift 1-3: `_T0` prefix
- Swift 4+: `_$s` prefix

**Mangling structure:**
```
_$s<module><declaration><type>
```

| Component | Example | Meaning |
|-----------|---------|---------|
| Module | `14MyAppModule` | Length-prefixed module name |
| Declaration | `7MyClassC` | 7 chars class name + Kind |
| Kind suffix | `C` = Class, `V` = Struct, `O` = Enum, `P` = Protocol |
| Function | `4func` | 4 chars function name |
| Type list | `ySS_SitF` | (String, Int) -> Void |

Concrete example:
```
_$s4MyApp7MyClassC4funcSaySiG5countyF
```

Demangling:
```
_$s              - Swift prefix
4MyApp           - Module="MyApp"
7MyClassC        - Type="MyClass" (Class)
4func            - function="func"
SaySiG           - Array<Int> (Say = Array, Si = Int)
5count           - argument name="count"
y                - return type (void/y = Void)
F                - function
```

Demangling tools:

```bash
# Swift's built-in demangler
xcrun swift-demangle _$s4MyApp7MyClassC4funcSaySiG5countyF

# Inline demangling
nm binary | xcrun swift-demangle

# In code
import Foundation
let mangled = "_$s4MyApp7MyClassC4funcSaySiG5countyF"
let demangled = _stdlib_demangleName(mangled)
```

**Key kind identifiers:**

| Suffix | Meaning |
|--------|---------|
| C | Class |
| V | Struct |
| O | Enum |
| P | Protocol |
| M | Metatype |
| m | Metatype metaclass |
| c | Function (closure) |
| p | Tuple |
| q | Existential (any Protocol) |
| X | Special (box, etc.) |
| y | Void return |
| S | Standard type prefix |
| Sa | Array (actually Say) |
| SDS | Dictionary |
| Si | Int |
| Sf | Float |
| Sb | Bool |
| SS | String |

### 4.7 Generics Specialization

Swift specializes generic functions at compile time for concrete types. Each
specialization creates a new copy of the function with concrete types baked
in. In disassembly, look for:

- Multiple copies of similar functions with different type metadata references
- Calls passing type metadata pointers in hidden parameters
- `__swift_instantiateConcreteTypeFromMangledName` calls
- Access to field descriptors for generic struct layout

COW (Copy-on-Write) structures (Array, String, Dictionary, Set) use a
`_swift_bridgeObject` tag to inline small values. The tag is encoded in the
low bits of the pointer/bridge object. When reversing, check the size and
retain count fields before assuming heap allocation.

---

## 5. Objective-C Name Mangling / Decoding

Objective-C method names are not mangled in the C++ sense — they are stored
as readable strings. But understanding the convention is essential for
reconstructing message sends from disassembly [7][22].

### 5.1 Method Name Format

```
-[ClassName methodName:]
```

A selector is a concatenation of method components with colons:

| Source | Selector |
|--------|----------|
| `- (void)foo` | `foo` |
| `- (void)setName:(NSString*)n` | `setName:` |
| `- (void)drawRect:(CGRect)r inContext:(CGContextRef)ctx` | `drawRect:inContext:` |

### 5.2 Reconstructing objc_msgSend Calls

Given assembly that calls `objc_msgSend`:

```asm
; ARM64 — send [self setTitle:@"Hello" forState:UIControlStateNormal]
ldr    x0, [x20, #0x10]            ; x0 = receiver (self)
adrp   x1, [sel_setTitle:forState:]@page   ; x1 = selector
add    x1, x1, [sel_setTitle:forState:]@pageoff
mov    x2, x21                      ; x2 = first arg ("Hello")
mov    w3, #0                       ; x3 = second arg (0 = UIControlStateNormal)
bl     _objc_msgSend
```

Reconstruction steps:
1. Identify the `bl _objc_msgSend` or `bl _objc_msgSend_stret`
2. Trace X0 (receiver): a stack/local variable or register holding the receiver
3. Trace X1 (selector): an `adrp+add` pair loading from `__objc_selrefs`
4. Trace X2-X7 (arguments): the actual method parameters
5. Read the selector string from the `__objc_selrefs` entry

At runtime with lldb:

```lldb
# Print the selector
po (SEL)$x1
# Or
po (const char *)$x1

# Print the receiver's class
po [$x0 class]

# Call the method manually
po [$x0 setTitle:@"Hello" forState:0]
```

### 5.3 The __objc_selrefs Section

`__objc_selrefs` in `__DATA` is an array of pointers to selector strings
residing in `__TEXT,__objc_methname`. Each entry is 8 bytes (pointer to a
`SEL`). Find references to selectors by locating `adrp+add` patterns that
load from `__objc_selrefs` relative to the data page.

### 5.4 Class Name and Protocol References

- `__objc_classrefs`: pointers to `objc_class` structs
- `__objc_classlist`: array of `Class` pointers (all classes defined by this binary)
- `__objc_protorefs`: protocol references
- `__objc_protolist`: protocol metadata list

### 5.5 Symbol Demangling

For C++ interoperability, ObjC symbols appear in `nm` output as:

```
$S4MyApp7MyClassC4funcS2SiF   (Swift name)
```

But symbols for pure ObjC classes are readable:
```
_OBJC_CLASS_$_MyViewController
_OBJC_METACLASS_$_MyViewController
_OBJC_IVAR_$_MyClass._ivarName
```

---

## 6. OS X / iOS ABI Specifics

### 6.1 System V AMD64 ABI on macOS (x86-64)

macOS x86-64 follows the System V AMD64 ABI with Apple-specific variations
[5][30]:

- **Register order:** RDI, RSI, RDX, RCX, R8, R9 (same as Linux)
- **Stack alignment:** 16-byte before `call`
- **Red zone:** 128 bytes below RSP (available for leaf functions)
- **No shadow space** (unlike Windows x64)
- **ObjC ABI:** `self` in RDI, `_cmd` in RSI, args in RDX, RCX, R8, R9
- **Block ABI:** Block object passed in RDI, `self` in RSI (for block invocations)

**Apple-specific differences from Linux:**

| Feature | macOS | Linux |
|---------|-------|-------|
| TLS storage | `%gs:0x0` base | `%fs:0x0` base |
| Stack probe | `___stack_chk_fail` | `__stack_chk_fail` |
| PIC model | Default (PIE) | Position-dependent default |
| Dynamic linking | dyld | ld-linux.so |
| Syscall ABI | Mach traps via libSystem | Direct `syscall` instruction |
| C++ demangling | Itanium ABI | Itanium ABI (same) |
| Section names | `__TEXT,__text` | `.text` |

### 6.2 ARM64 macOS/iOS (AAPCS64)

Apple platforms use ARMv8-A (arm64) following the AAPCS64 (Procedure Call
Standard for the ARM 64-bit Architecture) with Apple modifications [31]:

- **Register X0-X7**: Parameter passing (integer/pointer)
- **X0**: Return value
- **X8 (x8)**: Indirect result location (hidden struct return pointer)
- **X9-X15**: Scratch (caller-saved)
- **X19-X28**: Callee-saved
- **X29**: Frame pointer (FP)
- **X30**: Link register (LR)
- **SP**: Stack pointer (must be 16-byte aligned)
- **PC**: Program counter
- **V0-V7**: FP/SIMD parameter passing (float, double, vector types)
- **V8-V15**: Callee-saved (only lower 64 bits per register)

**Apple ARM64e (Pointer Authentication) additions:**
- Aarch64e adds PAC instructions: `pacibsp`, `autibsp`, `paciza`, `autiza`
- Function pointers and return addresses are signed with a hardware key
- The high 16 bits of the pointer contain the PAC signature
- Before dereferencing: `autiax`/`autib` instructions authenticate and strip PAC
- Reverse engineering impact: disassembly shows PAC instructions that must be
  emulated by the tool; breakpoints on authenticating instructions may trigger
  if the signature is invalid

**Prologue pattern (arm64):**
```asm
stp    x29, x30, [sp, #-0x10]!   ; save FP + LR
mov    x29, x30                    ; set FP
sub    sp, sp, #0x20               ; allocate 32 bytes for locals
...
; Epilogue
add    sp, sp, #0x20
ldp    x29, x30, [sp], #0x10      ; restore FP + LR
ret
```

**Apple "stretched" return convention:**
- Structs larger than 16 bytes: returned via hidden pointer in X8
- Structs 16 bytes or smaller: returned in X0, X1 (or X0 alone)
- `objc_msgSend_stret` used for ObjC methods returning large structs

### 6.3 Swift Calling Convention Quirks [25][26]

| Aspect | Swift behavior |
|--------|---------------|
| `self` in register | First non-parameter register (X0 for ARM64, RDI for x86-64) |
| Error out-param | When `throws` is used, a hidden `NSError**` pointer follows the last parameter |
| Protocol method call via existential | Witness table pointer passed as a hidden parameter alongside the value |
| Inline struct return | Small structs returned in registers X0-X1 (not via X8) |
| COW optimization | Access to `Array`/`String` via `isUnique` check before mutation |
| ObjC interop | `@objc` methods use ObjC calling convention (msgSend dispatch) |
| Thick vs thin function pointers | Thick pointers = function ptr + context (metadata); thin = just function ptr |

---

## 7. FairPlay DRM / App Encryption

App Store binaries are encrypted using Apple's FairPlay DRM. The decryption key
is hardware-bound to the device's Secure Enclave [32][33][34].

### 7.1 Detection

```bash
# Check if a binary is encrypted
otool -l /path/to/binary | grep -A4 LC_ENCRYPTION_INFO

# Output:
# cmd LC_ENCRYPTION_INFO_64
# cmdsize 8
# cryptoff 16384
# cryptsize 13369344
# cryptid 1
```

`cryptid = 1` = encrypted, `cryptid = 0` = decrypted.

The encrypted region covers `__TEXT` from `cryptoff` to `cryptoff + cryptsize`.
The `__PAGEZERO` and `__DATA` segments are typically unencrypted.

### 7.2 Decryption Strategies

**1. Runtime dump via debugger (lldb):**

On a jailbroken device, attach lldb to the running app and dump the
decrypted memory:

```lldb
# Attach to process
(lldb) process attach --name "AppName"

# Find the binary load address
(lldb) image list -o -f AppName

# Dump the entire binary image
(lldb) memory read --outfile /tmp/decrypted.bin --binary --count <size> <load_address>

# Or dump specific segments
(lldb) memory read --outfile /tmp/__text.bin <text_start> <text_end>
```

**2. dumpdecrypted (Stefan Esser):**

The classic tool: https://github.com/stefanesser/dumpdecrypted
Injects a dylib into the running app that writes the decrypted binary:

```bash
# Build dumpdecrypted.dylib (requires jailbroken device SDK)
# Then inject via DYLD_INSERT_LIBRARIES
DYLD_INSERT_LIBRARIES=dumpdecrypted.dylib /path/to/AppName.app/AppName
```

**3. frida-ios-dump:**

Frida-based approach — works on jailbroken devices with frida installed
[35]: https://github.com/Azule/cr4shed/tree/master?tab=readme-ov-file

```bash
# Install
pip install frida-tools

# Dump IPA from connected device
frida-ios-dump --quiet -o decrypted.ipa AppName
```

**4. bfdecrypt / Clutch**

- **bfdecrypt**: https://github.com/BishopFox/bfdecrypt — patches FairPlay at
  the kernel level on jailbroken devices
- **Clutch** (legacy): https://github.com/KJCracks/Clutch — older tool, less
  compatible with modern iOS versions

**5. yacd — Yet Another Crackme Decrypter [36]**

https://github.com/DerekSelander/yacd
Decrypts FairPlay on iOS 13.4.1 and lower without jailbreak (uses an older
vulnerability), but requires a specific toolchain.

### 7.3 Post-Decryption Analysis

After decryption:
1. The `cryptid` field should be patched to 0
2. The decrypted `__TEXT` segment is written to the output
3. The file must be re-signed (`codesign -f -s -`) to run

Verify:
```bash
otool -l decrypted_binary | grep cryptid
# Should show cryptid 0
```

Without decryption, disassemblers show scrambled data (high entropy, no
instruction patterns). After decryption, the actual ARM64 code is visible.

---

## 8. iOS App Binary Analysis

An iOS app distribution is a `.ipa` file (a ZIP archive) [6][37].

### 8.1 IPA Extraction

```bash
# Rename .ipa to .zip and extract
unzip AppName.ipa -d AppName_extracted

# Structure:
# AppName_extracted/
#   Payload/
#     AppName.app/         # the main app bundle
#       AppName            # the Mach-O binary
#       Info.plist         # app metadata
#       embedded.mobileprovision  # provisioning profile
#       Frameworks/        # embedded dylibs and frameworks
#       Plugins/           # app extensions
#       assets.car         # asset catalog
#       *.lproj/           # localized resources
```

### 8.2 Code Signing and Entitlements

Each Mach-O binary has an embedded code signature (LC_CODE_SIGNATURE) that
includes a CMS blob + a dictionary of entitlements [16][38].

Extract entitlements:

```bash
# Using codesign
codesign -d --entitlements - /path/to/AppName.app/AppName

# Using ldid (Linux-command-line IPA analysis)
ldid -e /path/to/AppName.app/AppName

# Using jtool2
jtool2 --ent /path/to/AppName.app/AppName
```

Common entitlements analysis:

```xml
<!-- Restricted capabilities requested -->
<key>keychain-access-groups</key>
<key>com.apple.developer.associated-domains</key>      <!-- Universal Links -->
<key>com.apple.developer.applesign-in</key>             <!-- Sign In with Apple -->
<key>com.apple.security.application-groups</key>        <!-- App Groups -->
<key>com.apple.developer.healthkit</key>                <!-- HealthKit access -->
<key>com.apple.developer.ubiquity-identity-key-value-store</key>  <!-- iCloud -->
<key>com.apple.developer.networking.vpn.api</key>       <!-- VPN/NETunnel -->
<key>com.apple.developer.siri</key>                     <!-- SiriKit -->
<key>com.apple.developer.nfc.readersession.formats</key> <!-- NFC -->
```

Entitlements determine the app's sandbox and system capability boundaries.
Over-entitled apps (requesting more than they need) are a common vulnerability
pattern [6].

### 8.3 embedded.mobileprovision

A cryptographically signed plist containing [37]:
- App ID (`application-identifier`)
- Team ID
- Provisioned devices (for development profiles)
- Entitlements
- Expiration date
- Certificate chain

```bash
# Decode the provisioning profile
security cms -D -i /path/to/AppName.app/embedded.mobileprovision

# Extract as XML
security cms -D -i /path/to/AppName.app/embedded.mobileprovision -o profile.plist
plutil -convert xml1 profile.plist
```

### 8.4 Info.plist Analysis

```bash
plutil -convert xml1 Info.plist
```

Key entries for RE [37]:

| Key | RE relevance |
|-----|-------------|
| `CFBundleExecutable` | Name of the Mach-O binary |
| `CFBundleIdentifier` | Bundle ID (app identity) |
| `CFBundleVersion` / `CFBundleShortVersionString` | Version info |
| `UIRequiredDeviceCapabilities` | Hardware requirements (arm64, opengles-2, gamekit, etc.) |
| `CFBundleURLTypes` | Custom URL schemes (for inter-app communication) |
| `LSApplicationQueriesSchemes` | Apps the app can query (canary URL schemes) |
| `NSAppTransportSecurity` | ATS exceptions / HTTP endpoints |
| `UIBackgroundModes` | Background capability (voip, location, fetch, etc.) |
| `NSFaceIDUsageDescription` / `NSCameraUsageDescription` / etc. | Privacy permission strings |
| `UIApplicationExitsOnSuspend` | Kill-on-background behavior |

### 8.5 Required Device Capabilities

The `UIRequiredDeviceCapabilities` dictionary or array can indicate:
- `arm64`: 64-bit device only
- `armv7`: 32-bit (older)
- `opengles-2`: OpenGL ES 2.0
- `gamekit`: Game Center
- `metal`: Metal GPU API
- `arkit`: ARKit support
- `telephony`: Must have cellular radio
- `wifi`: Must have Wi-Fi
- `nfc`: NFC hardware

A reverse engineer can identify missing capabilities that would limit testing.

### 8.6 Embedded Frameworks and Libraries

```bash
# List dylibs linked
otool -L /path/to/AppName.app/AppName

# List embedded frameworks in IPA
ls -la Payload/AppName.app/Frameworks/

# Check if they are encrypted
for f in Payload/AppName.app/Frameworks/*.framework/*; do
  otool -l "$f" 2>/dev/null | grep -A4 LC_ENCRYPTION_INFO | grep cryptid
done
```

### 8.7 Binary Analysis Workflow

1. Extract .ipa → `unzip AppName.ipa`
2. Identify target arch → `lipo -info Payload/AppName.app/AppName`
3. Check encryption → `otool -l | grep cryptid`
4. Decrypt if needed (jailbroken device) → dumpdecrypted/frida-ios-dump
5. Extract entitlements → `codesign -d --entitlements -`
6. Dump ObjC class info → `otool -ov`, `class-dump`, `dsdump`
7. Analyze Info.plist for capabilities and schemes
8. Check embedded provisioning profile
9. List dependent libraries → `otool -L`
10. Disassemble → Hopper, Ghidra, Binary Ninja

---

## 9. lldb-based RE Workflow

LLDB is the native debugger on Apple platforms. Essential for dynamic RE,
especially for decrypting binaries, inspecting ObjC/Swift runtime state, and
tracing execution [39][40].

### 9.1 Basic Commands

```lldb
# Attach to a running process
(lldb) process attach --name "AppName"
(lldb) process attach --pid 1234

# Launch a process
(lldb) process launch -- /path/to/binary arg1 arg2

# Execute a binary and stop at entry point
(lldb) target create /path/to/binary
(lldb) process launch --stop-at-entry

# Detach without killing
(lldb) process detach
```

### 9.2 Breakpoints

```lldb
# Set breakpoint on a function name
(lldb) breakpoint set --name "-[UIViewController viewDidLoad]"

# Set breakpoint on a C function
(lldb) breakpoint set --name objc_msgSend

# Set breakpoint on all methods of a class
(lldb) breakpoint set --name "-[MyClass *]"

# Set breakpoint at an address
(lldb) breakpoint set --address 0x1000072c0

# Set hardware breakpoint
(lldb) breakpoint set --address 0x1000072c0 --hardware

# Set breakpoint on a library
(lldb) breakpoint set --name viewDidLoad --shlib AppName

# Conditional breakpoint
(lldb) breakpoint set --name "-[LoginViewController login:]" --condition "$arg1 != nil"

# One-shot breakpoint (breaks once, auto-deletes)
(lldb) breakpoint set --name "func" --one-shot

# Break on all objc_msgSend calls for a specific selector
(lldb) breakpoint set --name _objc_msgSend --selector "loginWithUsername:password:"
```

### 9.3 Register and Memory Inspection

```lldb
# Read all registers
(lldb) register read

# Read specific register
(lldb) register read x0 x1 x2

# Read ARM64 general + SIMD registers
(lldb) register read --all

# Read memory at an address
(lldb) memory read 0x100007000

# Read N bytes in a format
(lldb) memory read --count 32 0x100007000

# Read as specific type
(lldb) memory read --type "int *" 0x100007000

# Read string
(lldb) memory read --format string 0x100007000

# Find what address a pointer points to
(lldb) memory read $x0

# Write memory (careful!)
(lldb) memory write 0x100007000 0x9090
```

### 9.4 Disassembly

```lldb
# Disassemble current function
(lldb) disassemble --frame

# Disassemble at a specific address
(lldb) disassemble --start-address 0x100007000 --end-address 0x100007100

# Disassemble a named function
(lldb) disassemble --name "-[ViewController viewDidLoad]"

# Disassemble with raw bytes
(lldb) disassemble --bytes

# Mixed source + assembly
(lldb) disassemble --mixed

# Disassemble ARM64 with breakpoint addresses shown
(lldb) disassemble --frame --show-bp
```

### 9.5 Objective-C Runtime Inspection with `po`

```lldb
# Print object description
(lldb) po $x0

# Print an object's class
(lldb) po [$x0 class]

# Print all properties
(lldb) po [$x0 valueForKey:@"propertyName"]

# Print method return value
(lldb) po [$x0 methodName]

# Call a method with arguments
(lldb) po [$x0 doSomethingWithString:@"test"]

# Print selector
(lldb) po (SEL)$x1
(lldb) po (const char *)$x1

# Print raw pointer as string
(lldb) p (char *)$x2

# Evaluate ObjC expression
(lldb) expr -l objc -O -- [UIApplication sharedApplication]

# Evaluate Swift expression
(lldb) expr -l swift -O -- UIApplication.shared
```

### 9.6 Expression Evaluation

```lldb
# Evaluate C expression
(lldb) expression (int)printf("hello\n")

# Call a function
(lldb) expression -- myFunction(42)

# Modify a register value
(lldb) expression $x0 = 0x0

# Modify memory
(lldb) expression *(int *)0x100007000 = 0x41414141

# Create a local variable
(lldb) expression id $obj = (id)0x12345678

# Evaluate with debug info suppressed (faster)
(lldb) expression --ignore-breakpoints -- myFunc()
```

### 9.7 Stepping and Navigation

```lldb
# Step into (next instruction)
(lldb) thread step-in
(lldb) si

# Step over (next instruction, skip calls)
(lldb) thread step-over
(lldb) ni

# Step out (return from current frame)
(lldb) thread step-out
(lldb) fin

# Continue execution
(lldb) continue
(lldb) c

# Run until line/address
(lldb) thread until 0x100007200
```

### 9.8 Image / Module Inspection

```lldb
# List loaded modules
(lldb) image list

# Find the load address of a specific module
(lldb) image list -o -f AppName

# Look up a symbol
(lldb) image lookup -n objc_msgSend

# Look up an address
(lldb) image lookup -a 0x100007000

# Find all ObjC methods matching a pattern
(lldb) image lookup -rn "viewDidLoad"

# Find ObjC class data
(lldb) image lookup -t "ViewController"
```

### 9.9 Script Bridging (Python/SB API)

LLDB's Python scripting bridge allows automated RE workflows [39]:

```python
# lldb_script.py
import lldb

debugger = lldb.SBDebugger.Create()
target = debugger.CreateTarget("/path/to/binary")
process = target.LaunchSimple(None, None, None)
breakpoint = target.BreakpointCreateByName("objc_msgSend")
```

Run from lldb:
```lldb
(lldb) command script import /path/to/lldb_script.py
```

### 9.10 Remote Debugging (iOS Device)

```bash
# On device (must be jailbroken or debugged via Xcode):
# Start debugserver (ships with Xcode)
debugserver *:12345 -a "AppName"

# On host:
lldb
(lldb) platform select remote-ios
(lldb) process connect connect://<device_ip>:12345
(lldb) po [$x0 class]
```

---

## 10. dyld and Shared Cache

### 10.1 dyld — The Dynamic Linker

`/usr/lib/dyld` is responsible for loading all dependent Mach-O images into
a process address space. It runs before `main()` as part of the `LC_MAIN`
startup [2][8][41].

**dyld loading sequence:**
1. Parse the main executable's load commands
2. Load any `LC_LOAD_DYLIB` and `LC_REEXPORT_DYLIB` dependencies recursively
3. Perform **rebase**: adjust all internal pointers by the ASLR slide value
4. Perform **bind**: resolve external symbols (look up by dylib + symbol name)
5. Perform **weak bind**: resolve weak symbol overrides
6. Run initializers: `+load` methods, C++ static initializers, `__attribute__((constructor))`
7. Call `LC_MAIN` entry point

### 10.2 dyld Shared Cache Location

System libraries are pre-merged into a single large file to improve launch
time and memory sharing [8][9][10]:

```
/System/Library/Caches/com.apple.dyld/
  dyld_shared_cache_arm64           # iOS arm64 devices
  dyld_shared_cache_arm64e          # iOS arm64e devices (A12+)
  dyld_shared_cache_x86_64          # macOS Intel
  dyld_shared_cache_x86_64h         # macOS Intel (Haswell+)
```

On macOS, the cache is mapped by `dyld` at boot time and each framework is
sliced out during process launch. On iOS, the shared cache is loaded into
every process's address space at a fixed address (`0x180000000` on arm64).

### 10.3 Extracting Libraries from the Shared Cache

**Apple's dsc_extractor:**

Apple open-sources `dsc_extractor` inside the dyld project [2]:
https://opensource.apple.com/source/dyld/

```bash
# Build the extractor from dyld source
clang++ -o dsc_extractor dsc_extractor.cpp

# Extract all libraries
dsc_extractor /System/Library/Caches/com.apple.dyld/dyld_shared_cache_arm64 /output/dir

# List library names
dsc_extractor -l /System/Library/Caches/com.apple.dyld/dyld_shared_cache_arm64
```

**Third-party tools:**
- **dyld-shared-cache-big-sur** (antons): fixes ObjC metadata for Hopper [42]
- **radare2**: `r2 -e io.cache=true dsc_extractor://` interface
- **Ghidra**: `Load File → dyld_shared_cache` with automatic library parsing

### 10.4 dyld Internal Structures [41]

**ImageLoader** — the core class (pre-macOS 11):

```
ImageLoader
  ├─ fMachOData: mapped file bytes
  ├─ fImagePath: path on disk
  ├─ segLoadCommands: parsed segments
  └─ fSymbolTable: bound symbols
```

Post-macOS 11, dyld was rewritten in C++ with simpler architecture:
- `dyld4` uses the `RuntimeState` object to track all images
- Each image is a `LoadedImage` struct wrapping a MachOObject
- Binding uses the `DI (Dynamic Info)` structures (chained fixups)

### 10.5 Rebase and Bind Opcodes (Legacy, pre-iOS 15)

When `LC_DYLD_INFO_ONLY` is present, dyld interprets a stream of opcodes for
rebase and bind operations [2][41]:

```c
struct dyld_info_command {
    uint32_t cmd;           // LC_DYLD_INFO_ONLY
    uint32_t cmdsize;
    uint32_t rebase_off;    // file offset of rebase opcodes
    uint32_t rebase_size;   // size of rebase opcodes
    uint32_t bind_off;      // file offset of normal bind opcodes
    uint32_t bind_size;
    uint32_t weak_bind_off;
    uint32_t weak_bind_size;
    uint32_t lazy_bind_off;
    uint32_t lazy_bind_size;
    uint32_t export_off;    // file offset of trie-structured exports
    uint32_t export_size;
};
```

Each opcode stream has a `REBASE_OPCODE` / `BIND_OPCODE` prefix byte:

```c
// Rebase opcodes
REBASE_OPCODE_DO_REBASE_IMM_TIMES    = 0x30
REBASE_OPCODE_DO_REBASE_ADD_ADDR_UID = 0x50
REBASE_OPCODE_DO_REBASE_ULEB_TIMES   = 0x70

// Bind opcodes
BIND_OPCODE_SET_DYLIB_ORDINAL_IMM    = 0x10
BIND_OPCODE_SET_SYMBOL_TRAILING_FLAGS_IMM = 0x20
BIND_OPCODE_DO_BIND                   = 0x50
BIND_OPCODE_DO_BIND_ADD_ADDR_ULEB    = 0x60
```

The opcode stream tells dyld where to apply rebase (add `slide` to pointers)
and bind (replace DWORD/QWORD with symbol address).

### 10.6 Chained Fixups (iOS 15+ / macOS 12+)

Modern binaries use `LC_DYLD_CHAINED_FIXUPS`. Instead of interpreting opcodes,
dyld walks pointer chains. Each chained fixup pointer encodes [2][17]:

```
63                                                             0
+---+--------+---------+---------+----------------------------+
| 7 | next   | ordinal | addend  | target                     |
+---+--------+---------+---------+----------------------------+
```

- Bit 63 (high bit): chain type indicator
- Bits 62-51: offset to next fixup (in entries)
- Bits 50-36: dylib ordinal (for binds)
- Bits 35-32: addend
- Bits 31-0: target offset (rebase: offset within the image)

To work with chained fixups in RE:
- Use `jtool2 --analyze` for visualization
- Hopper 5+ handles chained fixups automatically
- Ghidra community plugins are working on support
- `dyldinfo -fixups` shows fixup locations (legacy format only)

### 10.7 dyldinfo

```bash
# Rebase info
dyldinfo -rebase /path/to/binary

# Bind info
dyldinfo -bind /path/to/binary

# Lazy bind info
dyldinfo -lazy_bind /path/to/binary

# All fixup info
dyldinfo -fixups /path/to/binary

# Export info (from trie)
dyldinfo -export /path/to/binary

# Summary of all
dyldinfo -opcodes /path/to/binary
```

---

## 11. iOS Kernel / Driver RE

### 11.1 XNU Kernel

XNU (X is Not Unix) is the macOS/iOS kernel. It's a hybrid of Mach microkernel
(IPC, VM, scheduler) + BSD (processes, sockets, file system) + IOKit (driver
framework) [43].

The kernel is a Mach-O executable at:
```
/System/Library/Kernels/kernel.release.t6000    # macOS (Apple Silicon)
/System/Library/Kernels/kernel                    # macOS (Intel)
```

On iOS, the kernel is inside the `iBEC`/`iBoot` firmware and requires
decryption/demangling from the kernelcache.

### 11.2 Kernelcache Analysis

iOS kernelcache is:
1. LZSS/LZVN compressed
2. IMG4/IMG3 wrapped with Apple security headers
3. Often FairPlay-encrypted on production devices

Extraction:

```bash
# Extract from IPSW
unzip iPhone_*.ipsw
# Find kernelcache.release.* in the firmware folder

# Use img4tool to unwrap IMG4
img4tool -e kernelcache.release.* -o kernelcache.raw

# Decompress (lzssdec / pyasn1 / jtool2)
jtool2 --decrypt kernelcache.raw -o kernelcache.macho
```

### 11.3 IOKit and Kexts

IOKit drivers (kernel extensions) provide I/O Kit services. On macOS, kexts
are `.kext` bundles containing Mach-O binaries at:
```
/System/Library/Extensions/
/Library/Extensions/
```

On iOS, kexts are baked into the kernelcache (no user-loadable kexts on iOS).
Reverse engineering IOKit [43]:

```bash
# List loaded kexts
kextstat

# Load a kext (macOS)
kextload /path/to/MyKext.kext

# Unload
kextunload /path/to/MyKext.kext

# Dump IOKit registry
ioreg -l
```

Each IOKit driver implements `IOService::start()`, `IOService::stop()`, and
external methods via `IOExternalMethod`. The IOKit object model mirrors C++
vtables — watch for `vtable` references in the kext's `__DATA,__const`.

### 11.4 Kernel Patches / KPP / KTRR

**KPP (Kernel Patch Protection)**: Apple's kernel integrity mechanism on A7-A11
devices. A separate EL3 (Secure Monitor) firmware periodically verifies kernel
text and critical data hasn't been modified [44].

**KTRR (Kernel Text Read-Only Region)**: A12+ devices enforce kernel text
read-only via hardware MMU. Pages designated as KTRR are write-protected even
from the kernel itself. Jailed devices cannot patch the kernel at runtime [44].

Signs of KTRR/KPP defeat in jailbreaks:
- Boot-time patches that mark KTRR regions writable
- PAC bypass for kernel function pointers
- Zone manipulation for kernel data structures

### 11.5 Pointer Authentication (PAC) on arm64e

PAC was introduced with the A12 chip [45][46]:

```asm
; Sign a function pointer before storing
paciza  x0             ; sign x0 using A-key, integration pointer
str     x0, [x8]       ; store signed pointer

; Authenticate before using
autiza  x0             ; authenticate and strip PAC from x0
br      x0             ; jump to authenticated pointer

; PAC instructions for return addresses
pacibsp                ; sign LR (x30) with B-key (stack-specific)
...
autibsp                ; verify LR before returning
retab                  ; authenticate and return
```

The PAC is stored in the high 16 bits of a 64-bit pointer (leaving 48 bits
for the address). PAC bypass techniques:
- **Hardware attacks**: glitching, hammering
- **Software attacks**: PAC mangling via known key, PAC preimage lookup tables
- **Reuse**: don't authenticate if you can reuse a signed pointer

For RE: tools must understand PAC stripping. `otool -tV` shows PAC instructions;
Ghidra ARM64e plugins can model them.

### 11.6 Zone Map Forensics

XNU uses a zone allocator (`zalloc`). The **zone map** is a virtual memory
region covering all zone-allocated structures. On iOS, the zone map's location
is randomized but discoverable via kernel symbol `_zone_map` [43].

For forensic analysis (on a jailbroken device):
```bash
# Dump zone info
sudo zprint

# Walk zone map for specific structures (via lldb kernel debug)
(lldb) expr (void)zalloc("my_zone", 128)
```

Common zone structures of interest: `ipc_port`, `ipc_space`, `task`,
`proc`, `fileproc`, `socket`. Understanding zone layout helps when exploiting
use-after-free vulnerabilities in the kernel.

---

## 12. Anti-RE on iOS

### 12.1 Jailbreak Detection

Apps detect jailbroken environments through multiple techniques [6][47]:

**File-based checks:**
```objc
BOOL isJailbroken() {
    NSArray *paths = @[@"/Applications/Cydia.app",
                       @"/Library/MobileSubstrate/MobileSubstrate.dylib",
                       @"/bin/bash",
                       @"/usr/sbin/sshd",
                       @"/etc/apt",
                       @"/private/var/lib/apt/",
                       @"/private/var/stash"];
    for (NSString *path in paths) {
        if ([[NSFileManager defaultManager] fileExistsAtPath:path]) return YES;
    }
    return NO;
}
```

**Symbol-based checks:**
```objc
BOOL hasJailbreakSymbols() {
    // Check for MobileSubstrate
    if (dlsym(RTLD_DEFAULT, "MSHookFunction")) return YES;
    if (dlsym(RTLD_DEFAULT, "MSGetImage")) return YES;
    return NO;
}
```

**Bypass techniques:**
- **Frida**: `frida -U --codeshare pdodd/jailbreak-detection-bypass AppName`
- **Shadow** (jailbreak detection bypass tweak): https://github.com/jjolano/shadow
- **Liberty Lite**: Classic Cydia tweak for blocking JB checks
- **Manual**: Patch all `stat()` calls, `dlsym()` lookups, and file-existence
  checks in the disassembly via lldb/memory patches

### 12.2 Debugger Detection

**ptrace(PT_DENY_ATTACH)** — the classic anti-debugging on iOS [48][49]:

```objc
#include <sys/ptrace.h>

- (void)applicationDidFinishLaunching:(UIApplication*)app {
    // Deny debugger attachment — if a debugger is attached, this kills the process
    ptrace(PT_DENY_ATTACH, 0, 0, 0);
}
```

Called in `main()` or early in app start. Bypass:

```lldb
# Option 1: Break before ptrace
(lldb) breakpoint set --name ptrace
(lldb) continue
# At breakpoint:
(lldb) thread return 0   # skip the ptrace call, return 0

# Option 2: Patch the binary
# Search for the syscall number (0x1A = ptrace on ARM64)
# Replace with a NOP sled
```

**sysctl debugger detection:**

```objc
#include <sys/sysctl.h>

BOOL isDebuggerAttached() {
    int mib[4] = {CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()};
    struct kinfo_proc info;
    info.kp_proc.p_flag = 0;
    size_t size = sizeof(info);
    sysctl(mib, sizeof(mib)/sizeof(*mib), &info, &size, NULL, 0);
    return (info.kp_proc.p_flag & P_TRACED) != 0;
}
```

Bypass: Patch the `sysctl` call to always zero the `p_flag` check, or NOP the
conditional branch after it.

### 12.3 Anti-Tampering — Code Signing Validation

Apps verify their own code signature at runtime [6]:

```objc
// Check LC_CODE_SIGNATURE hash
BOOL isCodeValid() {
    // Calculate a hash of __TEXT and compare against embedded signature
    // Or use `SecStaticCodeCheckValidity`
    SecStaticCodeRef staticCode;
    SecStaticCodeCreateWithPath(NSBundle.mainBundle.bundleURL,
                                kSecCSDefaultFlags, &staticCode);
    OSStatus result = SecStaticCodeCheckValidity(staticCode,
                                                  kSecCSCheckAllArchitectures,
                                                  NULL);
    return (result == errSecSuccess);
}
```

Bypass: Patch `SecStaticCodeCheckValidity` to always return `errSecSuccess`,
or modify the control flow after the check.

### 12.4 Application Encryption

FairPlay (§7) itself is an anti-tamper mechanism — encrypted binaries cannot be
statically analyzed without decryption. Decrypting still requires a jailbroken
device (or a vulnerability like checkm8 on A5-A11).

### 12.5 Obfuscation

Apps may apply additional layers:
- **Control flow obfuscation**: opaque predicates, junk code insertion
- **String encryption**: obfuscated strings decrypted at runtime
- **Method name obfuscation**: rename ObjC selectors via post-processing
- **LLVM obfuscation passes**: Hikari, obfuscator-llvm

Detection:
- High entropy in `__cstring` (would indicate encrypted strings)
- `objc_msgSend` calls with selectors loaded from computed addresses
- C++-style vtables with opaque dispatch

### 12.6 Anti-RE Detection Checklist

When analyzing an iOS binary, scan for:

| Technique | API / Pattern | Bypass |
|-----------|--------------|--------|
| ptrace | `ptrace(PT_DENY_ATTACH)` | `thread return 0` in lldb |
| sysctl debug | `sysctl` + `p_flag & P_TRACED` | Patch branch post-check |
| File existence | `fileExistsAtPath:` for Cydia paths | Patch return values, use Frida |
| Symbol check | `dlsym(RTLD_DEFAULT, ...)` | Patch `dlsym` or preload libs |
| Code sign check | `SecStaticCodeCheckValidity` | Hook to return success |
| Fork protection | `fork()` or `sysctl([CTL_KERN...])` | NOP out |
| Entitlement validation | `SecTaskCopyValueForEntitlement` | Patch return |
| Encrypted binary | `cryptid=1` in LC_ENCRYPTION_INFO | Decrypt first |
| Anti-Frida | Check for `frida-server` port (27042) | Use a custom port |
| CPU register check | `sysctlbyname("hw.cputype")` | Patch or hook |

---

## 13. DTrace for Reverse Engineering

DTrace is a dynamic tracing framework built into macOS (kernel + user space).
It allows instrumenting arbitrary kernel and user functions without modifying
code. On RE, it's invaluable for tracing function calls, ObjC message sends,
and system call patterns [50][51].

### 13.1 DTrace Providers for RE

| Provider | Probes | Use case |
|----------|--------|----------|
| `pid$target` | Function entry/return | Trace specific user-function calls |
| `objc$target` | ObjC method entry/return | Trace Objective-C message sends |
| `fbt` | Kernel function boundary | Trace XNU kernel functions |
| `syscall` | System call entry/return | Trace system call usage |
| `proc` | Process events (fork, exec, exit) | Monitor process lifecycle |
| `io` | Disk I/O events | Trace file access patterns |

### 13.2 pid Provider — User Function Tracing

Trace all function entries and returns in a process [51][52]:

```dtrace
# Trace entry and return of all functions in process
pid$target:::entry
{
    printf("-> %s\n", probefunc);
}

pid$target:::return
{
    printf("<- %s\n", probefunc);
}
```

```bash
# Attach to a running process
sudo dtrace -s trace_all.d -p 1234

# Or launch a new process
sudo dtrace -s trace_all.d -c /path/to/binary
```

Trace a specific function:

```dtrace
pid$target:libSystem:strlen:entry
{
    printf("strlen(%s) called\n", copyinstr(arg0));
}
```

```bash
sudo dtrace -n 'pid$target:libSystem:strlen:entry { printf("%s\n", copyinstr(arg0)); }' -p 1234
```

### 13.3 objc Provider — Objective-C Method Tracing

The `objc$target` provider probes all ObjC method sends, showing class name,
selector, and timing data [50][53]:

```dtrace
# Trace all ObjC method calls
objc$target:::entry
{
    printf("[%s %s]\n", probemod, probefunc);
}
```

```bash
sudo dtrace -n 'objc$target:::entry { printf("[%s %s]\n", probemod, probefunc); }' -p 1234
```

Trace only a specific class:

```bash
# Log all calls to NSView methods
sudo dtrace -n 'objc$target:NSView::entry { printf("[%s %s]\n", probemod, probefunc); }' -p 1234
```

Aggregate call counts:

```bash
# Count ObjC method calls per class+method
sudo dtrace -n 'objc$target:::entry { @[probemod, probefunc] = count(); }' -p 1234
# Ctrl+C to see report
```

Time method execution:

```bash
# Measure total time spent per method
sudo dtrace -n 'objc$target:::entry { self->ts = timestamp; }' \
            -n 'objc$target:::return { @[probemod, probefunc] = sum(timestamp - self->ts); }' \
            -p 1234
```

### 13.4 DTrace One-Liners for RE

```bash
# All system calls by a process
sudo dtrace -n 'syscall:::entry /pid == $target/ { printf("%s\n", probefunc); }' -p 1234

# File open calls with path
sudo dtrace -n 'syscall::open*:entry { printf("%s\n", copyinstr(arg0)); }' -p 1234

# Trace all mach traps
sudo dtrace -n 'mach_trap:::entry { printf("%s\n", probefunc); }' -p 1234

# Trace memory allocations
sudo dtrace -n 'pid$target:libSystem:malloc:entry { printf("malloc(%d)\n", arg0); }' -p 1234

# Trace free calls
sudo dtrace -n 'pid$target:libSystem:free:entry { printf("free(%p)\n", arg0); }' -p 1234

# Trace munmap (memory unmapping)
sudo dtrace -n 'pid$target:libSystem:munmap:entry { printf("munmap(%p, %d)\n", arg0, arg1); }' -p 1234

# Count ObjC selector usage
sudo dtrace -n 'objc$target:::entry { @[probefunc] = count(); }' -p 1234

# Trace kernel function calls (careful — very noisy)
sudo dtrace -n 'fbt:::entry { printf("%s\n", probefunc); }'

# IOKit trace
sudo dtrace -n 'fbt:IOKit::entry { printf("[%s %s]\n", probemod, probefunc); }'

# Network syscalls
sudo dtrace -n 'syscall::connect:entry { printf("connect to %s:%d\n", copyinstr(arg1), ?); }' -p 1234
```

### 13.5 Aggregations and Profiling

```dtrace
# Stack trace on malloc call
pid$target:libSystem:malloc:entry
{
    @[stack()] = count();
}
```

```bash
sudo dtrace -n 'pid$target:libSystem:malloc:entry { @[stack()] = count(); }' -p 1234
```

### 13.6 iOS DTrace Limitations

DTrace on iOS is restricted by two mechanisms [50]:

**1. SIP (System Integrity Protection)** — on macOS, SIP restricts DTrace to
permitted processes only (`csrutil enable --without dtrace` needed for full
access). SIP also restricts FBT (kernel function boundary tracing).

**2. AMFI (Apple Mobile File Integrity)** — on iOS, DTrace is completely
disabled in user land. The `dtrace` command exists but most providers
(including `pid$target` and `objc$target`) are not available without a
jailbreak. Even on jailbroken devices, the kernel must be patched to
re-enable DTrace.

On a jailbroken iOS device:
```bash
# Patch AMFI to enable DTrace (via jailbreak hook)
# Then use DTrace as on macOS
```

Alternative on non-jailbroken devices: use **Frida** for runtime tracing,
which achieves similar results without requiring kernel-level tracing
support.

### 13.7 DTrace vs Frida for RE

| Capability | DTrace | Frida |
|------------|--------|-------|
| Kernel tracing | Yes (fbt) | No (kernel module needed) |
| ObjC method tracing | Native (objc provider) | Via `ObjC` JS API |
| Function hooking | Entry/return only | Full hook + argument modification |
| iOS support | No (jailbreak req.) | Yes (non-jailbreak via debugserver) |
| macOS SIP | Limited without csrutil | Full (user mode) |
| Script language | D language | JavaScript, Python, Swift |
| Performance | Very low overhead | Higher overhead |
| Stack traces | Native | Via `Thread.backtrace()` |

---

## Sources

1. Apple, "OS X ABI Mach-O File Format Reference" (archived) — https://web.archive.org/web/20140904004108/https://developer.apple.com/library/mac/documentation/developertools/conceptual/MachORuntime/Reference/reference.html
2. Apple Open Source, "dyld" — https://opensource.apple.com/source/dyld/
3. Apple Open Source, "objc4" (Objective-C Runtime) — https://opensource.apple.com/source/objc4/
4. Swift.org, "Swift ABI Documentation" — https://github.com/swiftlang/swift/blob/main/docs/ABI/
5. LLVM Project, "LLVM Language Reference Manual" — https://llvm.org/docs/LangRef.html
6. OWASP, "iOS Mobile Security Testing Guide" (MASTG) — https://mas.owasp.org/MASTG/
7. iOSRE Wiki, "Mach-O" — https://github.com/kpwn/iOSRE/blob/master/wiki/Mach-O.md
8. Francesco Tamagni (NowSecure), "Reversing iOS System Libraries Using Radare2: A Deep Dive into Dyld Cache (Part 1)" — https://www.nowsecure.com/blog/2024/09/11/reversing-ios-system-libraries-using-radare2-a-deep-dive-into-dyld-cache-part-1/
9. Francesco Tamagni (NowSecure), "Part 2: Cross-References" — https://www.nowsecure.com/blog/2024/09/12/reversing-ios-system-libraries-using-radare2-a-deep-dive-into-dyld-cache-part-2/
10. Francesco Tamagni (NowSecure), "Part 3: Fixups" — https://www.nowsecure.com/blog/2024/09/13/reversing-ios-system-libraries-using-radare2-a-deep-dive-into-dyld-cache-part-3/
11. Derek Selander, "dsdump" — https://github.com/DerekSelander/dsdump
12. Nygard, "class-dump" — https://github.com/nygard/class-dump
13. Karol Mazurek, "Snake&Apple I: Mach-O files on ARM64" — https://karol-mazurek.medium.com/snake-apple-i-mach-o-a8eda4b87263
14. Wikipedia, "Mach-O" — https://en.wikipedia.org/wiki/Mach-O
15. Hexios, "So Macho — A look at Apple executable files" — https://hexiosec.com/blog/macho-files/
16. Apple, "Code Signing Guide" (archived) — https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/
17. Emerge Tools, "How iOS 15 makes your app launch faster" — https://www.emergetools.com/blog/posts/iOS15LaunchTime
18. Apple, "otool-classic(1) man page" — https://keith.github.io/xcode-man-pages/otool-classic.1.html
19. LLVM, "llvm-otool documentation" — https://www.llvm.org/docs/CommandGuide/llvm-otool.html
20. Jonathan Levin, "jtool/jtool2" — http://newosxbook.com/tools/jtool.html
21. Steve Nygard, "class-dump" — http://stevenygard.com/projects/class-dump/
22. David Chisnall, "A Modern Objective-C Runtime" — https://www.jot.fm/issues/issue_2009_01/article4/
23. Apple WWDC 2020, "Advancements in the Objective-C runtime" (Session 10163) — https://developer.apple.com/videos/play/wwdc2020/10163
24. Kodeco, "Advanced Apple Debugging & Reverse Engineering, Ch. 17: Exploring & Method Swizzling" — https://www.kodeco.com/books/advanced-apple-debugging-reverse-engineering/v3.0/chapters/17-exploring-method-swizzling-objective-c-frameworks
25. Swift.org, "Swift Type Metadata" — https://github.com/swiftlang/swift/blob/main/docs/ABI/TypeMetadata.rst
26. Swift.org, "Swift Calling Convention" — https://github.com/swiftlang/swift/blob/main/docs/ABI/CallConvSummary.rst
27. Belkadan, "Swift Runtime Type Metadata" — https://belkadan.com/blog/2020/09/Swift-Runtime-Type-Metadata/
28. Jignesh Kalantri, "Swift Protocol Dispatch — Static vs Dynamic Dispatch, Witness Table, VTable" — https://medium.com/@jigneshkalantri01/swift-protocol-dispatch-explained-static-vs-dynamic-dispatch-witness-table-vtable-protocol-ffdd134b3179
29. Swift.org, "Swift Name Mangling" — https://github.com/swiftlang/swift/blob/main/docs/ABI/Mangling.rst
30. kindatechnical, "Stack Frame Layout on x86-64" — https://eli.thegreenplace.net/2011/09/06/stack-frame-layout-on-x86-64
31. ARM, "Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64)" — https://developer.arm.com/documentation/ihi0055/latest/
32. Nicolo Grilli, "Analysis of Obfuscation Found in Apple FairPlay" — https://nicolo.dev/en/blog/fairplay-apple-obfuscation/
33. fadeevab, "Decrypt iOS Applications (3 methods)" — https://fadeevab.com/decrypt-ios-applications-3-methods/
34. Stefano Zanero, "Removing Apple iOS DRM via CLI" — https://medium.com/@mobsecguys/removing-apple-drm-via-cli-f5c0d75ba6eb
35. Frida, "frida-ios-dump" — https://github.com/Azule/cr4shed/tree/master?tab=readme-ov-file
36. Derek Selander, "yacd — Yet Another Crackme Decrypter" — https://github.com/DerekSelander/yacd
37. bitrise-io, "ipa_analyzer" — https://github.com/bitrise-io/ipa_analyzer
38. OWASP MASTG, "Extracting Entitlements from MachO Binaries" — https://mas.owasp.org/MASTG/techniques/ios/MASTG-TECH-0111/
39. Apple, "LLDB Tutorial" — https://lldb.llvm.org/use/tutorial.html
40. Apple WWDC 2024, "Run, Break, Inspect: Explore effective debugging in LLDB" (Session 10198) — https://developer.apple.com/videos/play/wwdc2024/10198/
41. Karol Mazurek, "Snake&Apple V: Dyld" — https://karol-mazurek.medium.com/snake-apple-v-dyld-8b36b674cc44
42. antons, "dyld-shared-cache-big-sur" — https://github.com/antons/dyld-shared-cache-big-sur
43. Apple Open Source, "xnu" — https://github.com/apple-oss-distributions/xnu
44. Google Project Zero, "Examining Pointer Authentication on the iPhone XS" — https://googleprojectzero.blogspot.com/2019/02/examining-pointer-authentication-on.html
45. kernel.org, "Pointer authentication in AArch64 Linux" — https://docs.kernel.org/arch/arm64/pointer-authentication.html
46. Connor McGarr, "Exploit Development: Unveiling Windows ARM64 Pointer Authentication (PAC)" — https://connormcgarr.github.io/windows-pac-arm64/
47. NotSoSecure, "Bypassing Jailbreak Detection in iOS" — https://www.notsosecure.com/bypassing-jailbreak-detection-ios
48. Bryce Bostwick, "Debugging An Undebuggable App" — https://bryce.co/undebuggable/
49. TwelveSec, "Bypassing anti-reversing defences in iOS applications" — https://twelvesec.com/2023/10/10/bypassing-anti-reversing-defences-in-ios-applications/
50. Kodeco, "Advanced Apple Debugging & Reverse Engineering, Ch. 30: Intermediate DTrace" — https://www.kodeco.com/books/advanced-apple-debugging-reverse-engineering/v3.0/chapters/30-intermediate-dtrace
51. Oracle, "DTrace User Guide (pid provider)" — https://docs.oracle.com/cd/E53394_01/html/E53395/gkyem.html
52. 0xm0, "The Reverse Engineer's Unexpected Swiss Army Knife (DTrace)" — https://gist.github.com/0xm0/566e461c299cb48055be2ccdeaa5654a
53. Stack Overflow, "How to find Objective-C methods at runtime for any Application on Mac?" — https://stackoverflow.com/questions/40738770/how-to-find-objective-c-methods-at-runtime-for-any-application-on-mac
