# COFF/OBJ/PDB Internals for Reverse Engineering

> COFF is the prekursor PE. PDB is the golden key. Together they unlock the entire Windows native compilation chain.
>
> **Prerequisite reading:** [PE/DLL Format](01-pe-dll-format.md), [Symbol & Type Recovery](13-symbol-type-recovery.md)

## Table of Contents

1. [COFF Object File Format](#1-coff-object-file-format)
2. [COFF Sections Deep Dive](#2-coff-sections-deep-dive)
3. [COFF Symbols & Auxiliary Records](#3-coff-symbols--auxiliary-records)
4. [COFF Relocations](#4-coff-relocations)
5. [LIB Archive Format](#5-lib-archive-format)
6. [COFF-to-PE Linking Process](#6-coff-to-pe-linking-process)
7. [PDB Format: MSF Container Layer](#7-pdb-format-msf-container-layer)
8. [PDB Stream Architecture](#8-pdb-stream-architecture)
9. [CodeView Type Records](#9-codeview-type-records)
10. [CodeView Symbol Records](#10-codeview-symbol-records)
11. [Line Number Information](#11-line-number-information)
12. [PDB as RE Resource](#12-pdb-as-re-resource)
13. [Tool Reference](#13-tool-reference)
14. [References](#14-references)

---

## 1. COFF Object File Format

The Common Object File Format (COFF) was originally created by AT&T for Unix System V Release 3 in 1983 [1]. Microsoft adopted and adapted it for Windows NT, where it became the foundation of the PE format. Every `.obj` file produced by MSVC, Clang, and (via translation) most Windows compilers is a COFF file. Every `.exe` and `.dll` on Windows embeds a COFF header as part of its PE structure [2].

### 1.1 COFF File Header

Every COFF file begins with the `IMAGE_FILE_HEADER` (20 bytes):

```
Offset  Size  Field               Description
------  ----  ------------------  -----------------------------------------
0       2     Machine             Target CPU architecture
2       2     NumberOfSections    Sections in file
4       4     TimeDateStamp       Unix timestamp of creation
8       4     PointerToSymbolTable  File offset of COFF symbol table
12      4     NumberOfSymbols     Count of symbol table entries
16      2     SizeOfOptionalHeader  Size of optional header (0 for .obj)
18      2     Characteristics     File attributes / flags
```

For object files, `SizeOfOptionalHeader` is zero. For executables, it points to the PE optional header. This is the structural bridge between COFF and PE: a PE file literally embeds the COFF header as its first header after the signature [3].

**Machine types commonly encountered in RE:**

| Machine | Value | Architectures |
|---------|-------|--------------|
| `IMAGE_FILE_MACHINE_I386` | `0x14C` | x86 (32-bit) |
| `IMAGE_FILE_MACHINE_AMD64` | `0x8664` | x86-64 |
| `IMAGE_FILE_MACHINE_ARMNT` | `0x1C4` | ARM Thumb-2 |
| `IMAGE_FILE_MACHINE_ARM64` | `0xAA64` | ARM64 |
| `IMAGE_FILE_MACHINE_IA64` | `0x200` | Itanium |

The `Characteristics` field determines whether the file is a DLL (`0x2000`), a relocatable image (`0x0001`), or a 32-bit machine (`0x0100`) [2].

### 1.2 Section Table

Immediately after the file header lies the section table: an array of `IMAGE_SECTION_HEADER` structures (40 bytes each), one per section:

```
Offset  Size  Field                 Description
------  ----  --------------------  -------------------------------------------
0       8     Name                  Null-padded UTF-8, or "/offset" for long names
8       4     VirtualSize           Size when loaded in memory (0 for .obj)
12      4     VirtualAddress        RVA in PE; section-relative offset in .obj
16      4     SizeOfRawData         Size on disk
20      4     PointerToRawData      File offset to raw section data
24      4     PointerToRelocations  File offset to relocation entries
28      4     PointerToLinenumbers  File offset to COFF line numbers (deprecated)
32      2     NumberOfRelocations   Count of relocation entries
34      2     NumberOfLinenumbers   Count of line number entries
36      4     Characteristics       Section flags (code/data/read/write/etc)
```

In an object file, `VirtualAddress` is typically 0. The linker assigns final RVAs during the PE build [4]. `VirtualSize` is also 0 in .obj files -- it's computed at link time.

### 1.3 Common COFF Section Names

| Section | Characteristics | Contents |
|---------|----------------|----------|
| `.text` | `CNT_CODE + MEM_EXECUTE + MEM_READ` | Executable code |
| `.data` | `CNT_INITIALIZED_DATA + MEM_READ + MEM_WRITE` | Initialized global/static data |
| `.bss` | `CNT_UNINITIALIZED_DATA + MEM_READ + MEM_WRITE` | Uninitialized data |
| `.rdata` | `CNT_INITIALIZED_DATA + MEM_READ` | Read-only initialized data |
| `.debug$T` | `CNT_INITIALIZED_DATA + MEM_READ + MEM_DISCARDABLE` | CodeView type records |
| `.debug$S` | `CNT_INITIALIZED_DATA + MEM_READ + MEM_DISCARDABLE` | CodeView symbol records |
| `.drectve` | `LNK_INFO` | Linker directives (ASCII text) |
| `.idata$2+` | various | Import tables (grouped by `$`) |
| `.edata` | `CNT_INITIALIZED_DATA + MEM_READ` | Export data |
| `.reloc` | `CNT_INITIALIZED_DATA + MEM_READ + MEM_DISCARDABLE` | Base relocations |
| `.tls` | `CNT_INITIALIZED_DATA + MEM_READ + MEM_WRITE` | Thread-local storage |

The `$` grouping convention is critical for understanding how linker merging works. All `.text$X` sections from all object files merge into the PE's single `.text` section, ordered lexicographically by the suffix after `$` [2][4].

---

## 2. COFF Sections Deep Dive

### 2.1 Section Characteristics Flags

From the PE specification [2], the most important `Characteristics` flags for RE:

| Flag | Value | Meaning |
|------|-------|---------|
| `IMAGE_SCN_CNT_CODE` | `0x00000020` | Contains code |
| `IMAGE_SCN_CNT_INITIALIZED_DATA` | `0x00000040` | Contains initialized data |
| `IMAGE_SCN_CNT_UNINITIALIZED_DATA` | `0x00000080` | Contains uninitialized data |
| `IMAGE_SCN_LNK_COMDAT` | `0x00001000` | COMDAT section (linker can deduplicate) |
| `IMAGE_SCN_LNK_NRELOC_OVFL` | `0x01000000` | Extended relocations (>0xFFFF entries) |
| `IMAGE_SCN_MEM_EXECUTE` | `0x20000000` | Executable |
| `IMAGE_SCN_MEM_READ` | `0x40000000` | Readable |
| `IMAGE_SCN_MEM_WRITE` | `0x80000000` | Writable |

For RE: the combination of `CNT_CODE | EXECUTE | READ` = `.text`. `INITIALIZED | READ | WRITE` = `.data`. If `WRITE` is absent on an initialized data section, it is `.rdata` [2].

### 2.2 COMDAT Sections

COMDAT (COMDAT) sections are the mechanism that enables function-level linking, identical COMDAT folding (ICF), and C++ template deduplication. Each COMDAT has a "selection" type that tells the linker how to handle duplicates [2]:

| Selection | Value | Behavior |
|-----------|-------|----------|
| `IMAGE_COMDAT_SELECT_NODUPLICATES` | 1 | Must appear exactly once |
| `IMAGE_COMDAT_SELECT_ANY` | 2 | Pick any copy (functions, templates) |
| `IMAGE_COMDAT_SELECT_SAME_SIZE` | 3 | All copies must be same size |
| `IMAGE_COMDAT_SELECT_EXACT_MATCH` | 4 | Must be bit-identical |
| `IMAGE_COMDAT_SELECT_ASSOCIATIVE` | 5 | Attached to another COMDAT |
| `IMAGE_COMDAT_SELECT_LARGEST` | 6 | Pick the largest copy |

The COMDAT selection type is stored in an auxiliary symbol record (Format 5, described below). For RE: functions and templates that appear in COMDAT sections have `IMAGE_SCN_LNK_COMDAT` set in their section flags [5].

### 2.3 `.drectve` Section

This section contains ASCII text with linker directives. MSVC uses it to pass instructions to the linker, such as:

```
-defaultlib:msvcrt
-exclude-symbols:_CRT_* 
```

The format is a simple null-terminated or space-delimited string of directives. Parsing the `.drectve` section reveals the default libraries a module expected to be linked against [2].

### 2.4 `.debug$T` and `.debug$S` Sections

These sections contain CodeView debug information:

- `.debug$T`: CodeView **type records** (function signatures, struct/class definitions, typedefs)
- `.debug$S`: CodeView **symbol records** (function names, variable names, line number info, frame data)

These are the precursors to PDB data. When linking with `/DEBUG`, the linker extracts these sections from all input .obj files, deduplicates type records, and emits the merged result into the PDB file [6].

---

## 3. COFF Symbols & Auxiliary Records

### 3.1 Symbol Table Entry

The COFF symbol table is an array of 18-byte `IMAGE_SYMBOL` structures located at `PointerToSymbolTable`:

```
Offset  Size  Field           Description
------  ----  --------------  --------------------------------------------------
0       8     Name            Short name (8 bytes) or pointer to string table
8       4     Value            Associated value (address, size, or line number)
12      2     SectionNumber   1-based section index, or special enum value
14      2     Type             Fundamental + derived type info
16      1     StorageClass    Enum of symbol classification
17      1     NumberOfAuxSymbols  Auxiliary records following this entry
```

**Special SectionNumber values:**

| Value | Meaning |
|-------|---------|
| 0     | External symbol (undefined, resolved at link time) |
| `-1`  | Absolute symbol (fixed value, `IMAGE_SYM_ABSOLUTE`) |
| `-2`  | Debug symbol (`IMAGE_SYM_DEBUG`) |
| >0    | 1-based index into section table |

**StorageClass values critical for RE:**

| StorageClass | Value | Meaning |
|-------------|-------|---------|
| `IMAGE_SYM_CLASS_EXTERNAL` | 2 | External (global) symbol |
| `IMAGE_SYM_CLASS_STATIC` | 3 | Static (file-local) symbol |
| `IMAGE_SYM_CLASS_LABEL` | 6 | Code label |
| `IMAGE_SYM_CLASS_FUNCTION` | 101 | Function (used with `.bf`/`.ef`) |
| `IMAGE_SYM_CLASS_FILE` | 103 | Source filename record |
| `IMAGE_SYM_CLASS_SECTION` | 104 | Associated with a section |
| `IMAGE_SYM_CLASS_CLR_TOKEN` | 107 | CLR metadata token |
| `IMAGE_SYM_CLASS_END_OF_FUNCTION` | 255 | End of function marker |

**Type representation:** The 2-byte `Type` field encodes both a base type (low byte) and a derived type indicator (high byte). For example, a `void*` function pointer has a specific encoding in this field [2][3].

### 3.2 COFF String Table

When a symbol name exceeds 8 characters, the `Name` field stores `0x00000000` followed by a 4-byte offset into the string table. The string table begins immediately after the last symbol table entry. Its first 4 bytes specify the total size of the string table (including these 4 bytes) [2].

### 3.3 Auxiliary Symbol Records

Each symbol entry can be followed by 0 or more auxiliary records (18 bytes each). Five formats are defined:

**Format 1: Function Definition** -- follows a symbol with `StorageClass == EXTERNAL | FUNCTION`:
- Tag index (.bf symbol)
- Total size of function code
- Pointer to line number
- Next function symbol index

**Format 2: .bf/.ef Symbols** -- marks the beginning/end of a function:
- Actual line number in the source file

**Format 3: Weak External** -- marks a weak symbol with fallback:
- Symbol index of the default resolution
- Characteristics (search, no library search, or nolog)

**Format 4: File Name** -- follows `IMAGE_SYM_CLASS_FILE` symbols:
- Null-terminated ASCII filename

**Format 5: Section Definition** -- follows section symbols:
- Section length (used to validate `VirtualSize`)
- Number of relocations
- Number of line numbers
- COMDAT selection type
- Associated COMDAT section index
- Section information flags

Knowing auxiliary format 5 is essential for understanding how MSVC's linker manages COMDAT folding and section deduplication [2][7].

---

## 4. COFF Relocations

### 4.1 Relocation Entry Format

Each relocation entry is 10 bytes:

```
Offset  Size  Field              Description
------  ----  -----------------  -----------------------------------
0       4     VirtualAddress     Address of relocation target in section
4       4     SymbolTableIndex   Index of target symbol
8       2     Type               Relocation type (architecture-specific)
```

The linker applies these relocations to transform the object file's section-relative addresses into the final PE's virtual addresses.

### 4.2 Key x64 Relocation Types

| Type | Value | Description |
|------|-------|-------------|
| `IMAGE_REL_AMD64_ABSOLUTE` | `0x0000` | No-op (for alignment) |
| `IMAGE_REL_AMD64_ADDR64` | `0x0001` | 64-bit VA of target |
| `IMAGE_REL_AMD64_ADDR32` | `0x0002` | 32-bit VA of target |
| `IMAGE_REL_AMD64_ADDR32NB` | `0x0003` | 32-bit RVA (no base) |
| `IMAGE_REL_AMD64_REL32` | `0x0004` | 32-bit relative displacement |
| `IMAGE_REL_AMD64_REL32_1` through `_5` | `0x0005-0x0009` | Relative with immediate offset |
| `IMAGE_REL_AMD64_SECTION` | `0x000A` | 16-bit section index |
| `IMAGE_REL_AMD64_SECREL` | `0x000B` | 32-bit offset from section start |
| `IMAGE_REL_AMD64_SREL32` | `0x000E` | Signed span-dependent value |
| `IMAGE_REL_AMD64_PAIR` | `0x000F` | Pairs with span-dependent values |
| `IMAGE_REL_AMD64_SSPAN32` | `0x0010` | Span-dependent, applied at link time |

### 4.3 Key x86 Relocation Types

| Type | Value | Description |
|------|-------|-------------|
| `IMAGE_REL_I386_ABSOLUTE` | `0x0000` | No-op |
| `IMAGE_REL_I386_DIR32` | `0x0006` | 32-bit VA |
| `IMAGE_REL_I386_REL32` | `0x0014` | 32-bit relative displacement |
| `IMAGE_REL_I386_SECTION` | `0x000A` | 16-bit section index |
| `IMAGE_REL_I386_SECREL` | `0x000B` | 32-bit section-relative offset |

### 4.4 Extended Relocations

When `NumberOfRelocations == 0xFFFF` and `IMAGE_SCN_LNK_NRELOC_OVFL` is set, the first relocation entry is a virtual record where the `VirtualAddress` field holds the actual relocation count. Real relocation entries follow [2].

### 4.5 RE Relevance of COFF Relocations

For RE workflows, the relocation table is a structural oracle. Given a COFF object file:

- Every function call to an external symbol produces a `REL32` relocation pointing at that call site.
- Every cross-module variable reference produces an `ADDR32` or `ADDR64` relocation.
- The symbol table index in each relocation resolves to a symbol name, giving us function/variable names directly.
- In malware analysis, deliberately stripping relocations from object files is rare; a preserved `.obj` file from a build directory can reveal the entire call graph [8].

---

## 5. LIB Archive Format

### 5.1 Overview

Microsoft `.lib` files use the Unix `ar` archive format with Microsoft-specific extensions [9]. A LIB file is a concatenation of COFF object files (or import objects), indexed by two internal members.

### 5.2 Archive File Header

Each member in the archive begins with the `ARMAG` header:

```
struct ArMemberHeader {
    char Name[16];        // Member name, "/" for special members
    char Date[12];        // Timestamp (decimal ASCII)
    char UID[6];          // User ID (decimal ASCII)
    char GID[6];          // Group ID (decimal ASCII)
    char Mode[8];         // File mode (octal ASCII)
    char Size[10];        // Size of member (decimal ASCII)
    char End[2];          // "`\n" (0x60 0x0A)
};
```

The global archive header is the string `"!<arch>\n"`.

### 5.3 Special Members

Microsoft LIB archives contain three special members [9][10]:

**`/` (First Linker Member):** A symbol index mapping exported symbol names to member offsets within the archive. Used by the linker to quickly find which .obj contains a given symbol without scanning all members.

Layout:
- 4 bytes: number of symbols (n)
- n x 4 bytes: file offsets of archive members containing each symbol
- n null-terminated strings: symbol names

**`//` (Second Linker Member):** Identical structure to `/`, but for long symbol names (>15 chars). The `Name` fields in `/` point to offsets in this member's string table.

**`/<n>` (Long Name Member):** When member names exceed 15 characters, the member header's `Name` field stores `"/<offset>"`, where `<offset>` is a decimal offset into this special member's string table.

### 5.4 Import Libraries

Import libraries (generated by `lib.exe` or by the linker) contain special "import objects" -- COFF objects that contain:

- An `.idata$2` section with IMAGE_IMPORT_DESCRIPTOR templates
- An `.idata$4` section with the imported function name strings
- An `.idata$5` section with IAT entries
- A `.text` section (optional) with a thunk jumping to the import

For RE: import libraries leak DLL function dependencies before the final link. Each import object contains the exact DLL name and function entry points [10].

### 5.5 LIB Parsing in RE

Tools like `llvm-ar`, `ar` (from MSVC), and `object_dumper` can extract individual .obj files from a LIB. This is often the only way to get at individual compilation unit symbols, especially in malware samples that have been statically linked against large libraries [9].

---

## 6. COFF-to-PE Linking Process

### 6.1 Linker Phases

The Microsoft linker (`link.exe`) and LLVM's `lld-link` perform these steps [11]:

**Phase 1: Symbol Resolution**
- Read all input .obj/.lib files
- Build a global symbol table from all defined symbols (`EXTERNAL + FUNCTION` or `EXTERNAL + STATIC`)
- Resolve undefined references against this table
- Pull necessary members from LIB archives (lazy loading)
- Reject or report multiply-defined strong symbols

**Phase 2: Section Merging**
- Group all input sections by name (using the `$` convention)
- Order within each group by the suffix after `$`
- Assign final Relative Virtual Addresses (RVAs) to each merged section
- Compute the final PE `SizeOfImage`, `SectionAlignment`, `FileAlignment`

**Phase 3: Relocation**
- For each relocation entry in every input .obj section:
  - Look up the symbol table index to find the target address
  - Apply the relocation type's formula (e.g., `REL32` = target - next_instruction_ip)
  - Patch the raw bytes at `VirtualAddress + section_base`
- Discard the relocation tables from the PE output (only `.reloc` remains for ASLR)

**Phase 4: Debug Info Merging**
- If `/DEBUG` was specified, merge `.debug$T` type records from all inputs into the TPI stream
- Merge `.debug$S` symbol records into module-specific debug streams
- Build the DBI stream mapping sections to modules
- Generate the PDB file (MSF container + streams)

### 6.2 Section Merging: The `$` Convention

This is critical for understanding final PE layout [2]:

- `.text$mn` + `.text$x` + `.text$di` all contribute to PE `.text`
- `.idata$2` + `.idata$4` + `.idata$5` all contribute to PE `.idata`
- The suffix lexicographic ordering controls layout within the section

For RE: If you see a section like `.text$x` in an object file, it contains exception handler data that merges into the main `.text` section of the PE. Similarly, `.CRT$XCA` through `.CRT$XCZ` sections merge into the CRT initialization table [4].

### 6.3 PE vs COFF Structural Differences

| Aspect | COFF (.obj) | PE (.exe/.dll) |
|--------|-------------|-----------------|
| Header | `IMAGE_FILE_HEADER` only | DOS stub + PE signature + COFF header + Optional header |
| Section addresses | Section-relative offsets | Absolute RVAs |
| Relocations | Embedded per-section | In `.reloc` section (base relocations) |
| Symbol table | Present | Stripped (or optional with `/DEBUG`) |
| Debug info | `.debug$T`/`.debug$S` sections | External `.pdb` file |
| Optional header | Absent | Present (ImageBase, entry point, etc.) |
| Import info | `.drectve` directives | `.idata` directory |
| Export info | Not used | `.edata` directory |

Understanding COFF is understanding PE at compile-time. Every PE originates as one or more COFF files, and the COFF structure directly dictates the PE's section layout, symbol resolution, and import/export tables [2][11].

---

## 7. PDB Format: MSF Container Layer

### 7.1 The MSF (Multi-Stream Format) Container

A PDB file is an MSF (Multi-Stream Format) container -- a "filesystem within a file" [6][12]. All data in a PDB lives inside this container, organized into streams (virtual files) that are divided into blocks of equal size.

The magic bytes for a PDB MSF file are:

```
Microsoft C / C++ MSF 7.00\r\n\x1ADS\x00\x00\x00
```

(31 bytes at offset 0)

### 7.2 Superblock

At file offset 0:

```
struct SuperBlock {
    char     FileMagic[32];        // Magic identifier
    uint32_t BlockSize;            // Block size (512, 1024, 2048, or 4096)
    uint32_t FreeBlockMapBlock;    // Index of FPM block (1 or 2)
    uint32_t NumBlocks;            // Total blocks in file
    uint32_t NumDirectoryBytes;    // Size of stream directory
    uint32_t Unknown;              // Unknown field
    uint32_t BlockMapAddr;         // Block containing stream directory block list
};
```

LLVM only supports `BlockSize = 4096` (the "BigMsf" variant) [12].

### 7.3 Free Block Map (FPM)

Two Free Page Maps (FPM1 at block 1, FPM2 at block 2) track which blocks are in use. This supports atomic incremental updates: writers modify the inactive FPM while the active FPM maintains consistency [12].

### 7.4 Stream Directory

The stream directory describes every stream in the PDB:

```
struct StreamDirectory {
    uint32_t NumStreams;
    uint32_t StreamSizes[NumStreams];
    uint32_t StreamBlocks[NumStreams][];
};
```

Each stream's blocks are listed as an array of block indices. Blocks can be entirely discontiguous -- block 10 of a stream might appear physically before block 2. The stream directory itself may span multiple blocks, tracked by `BlockMapAddr` [12].

### 7.5 Block Boundaries

A critical sharp edge: blocks are not required to be contiguous. A single `uint16_t` field can span two non-adjacent blocks, with the high byte in one and the low byte in another. All MSF consumers must handle this correctly [12].

---

## 8. PDB Stream Architecture

A PDB file contains these fixed-index streams [6]:

| Index | Name | Contents |
|-------|------|----------|
| 0 | Old Directory | Previous MSF stream directory (for incremental linking) |
| 1 | PDB Stream | Basic file info, GUID/age for EXE matching, named stream map |
| 2 | TPI Stream | CodeView type records (types) |
| 3 | DBI Stream | Module/compiland info, section contributions, source files |
| 4 | IPI Stream | CodeView type records (IDs) |
| 5+ | Various | Module info streams, hash streams, /names, etc. |

### 8.1 PDB Stream (Index 1)

```
struct PdbStreamHeader {
    uint32_t Version;        // Always V80 (20040203)
    uint32_t Signature;      // 32-bit timestamp
    uint32_t Age;            // Incremented on each PDB write
    GUID     UniqueId;       // GUID for PDB-to-EXE matching
};
```

This stream also contains the **Named Stream Map** -- a serialized hash table mapping stream names (like `/names`, `/LinkInfo`, `/src/headerblock`) to their stream indices [6].

The GUID + Age combination is how a debugger matches a PDB to its corresponding PE. The `RSDS` debug codeview entry in the PE's `.debug` section stores this same GUID+Age [13].

### 8.2 TPI Stream (Index 2) -- Type Information

Header:

```
struct TpiStreamHeader {
    uint32_t Version;              // V80
    uint32_t HeaderSize;
    uint32_t TypeIndexBegin;       // Usually 0x1000
    uint32_t TypeIndexEnd;         // One past last type
    uint32_t TypeRecordBytes;
    uint16_t HashStreamIndex;      // Stream for type hash table
    uint16_t HashAuxStreamIndex;
    uint32_t HashKeySize;          // Usually 4
    uint32_t NumHashBuckets;
    int32_t  HashValueBufferOffset;
    uint32_t HashValueBufferLength;
    int32_t  IndexOffsetBufferOffset;  // Type index -> offset map
    uint32_t IndexOffsetBufferLength;
    int32_t  HashAdjBufferOffset;      // Hash adjusters for incremental linking
    uint32_t HashAdjBufferLength;
};
```

Following the header is a contiguous list of CodeView type records. Type records are referenced by **Type Index** (TI), a 32-bit integer. The first user-defined type starts at `TypeIndexBegin` (typically 4096 = 0x1000). Values below this encode fundamental types using a bitmask [14]:

```
High 20 bits (unused) | 4 bits Mode | 8 bits Kind
```

- Mode: Direct (0), NearPointer (1), NearPointer32 (4), NearPointer64 (6), etc.
- Kind: Void (0x03), Int32Long (0x12), UInt32Long (0x22), Float64 (0x41), Boolean8 (0x30), etc.
- A `void*` on x64 = Mode=NearPointer64 + Kind=Void [14]

### 8.3 IPI Stream (Index 4) -- ID Information

Structurally identical to TPI but holds different record types:

| TPI Stream | IPI Stream |
|------------|------------|
| LF_POINTER, LF_MODIFIER, LF_PROCEDURE, LF_MFUNCTION, LF_ARGLIST, LF_FIELDLIST, LF_ARRAY, LF_CLASS, LF_STRUCTURE, LF_UNION, LF_ENUM, LF_BITFIELD, etc. | LF_FUNC_ID, LF_MFUNC_ID, LF_BUILDINFO, LF_SUBSTR_LIST, LF_STRING_ID, LF_UDT_SRC_LINE, LF_UDT_MOD_SRC_LINE |

The IPI stream stores "ID" records that are not real types but references: function IDs (mapping mangled names to types), string IDs, and source line information for UDT definitions [14].

### 8.4 DBI Stream (Index 3) -- Debug Information

The DBI stream is the central index for all module-level debug data [15]:

```
struct DbiStreamHeader {
    int32_t  VersionSignature;         // -1
    uint32_t VersionHeader;            // V70 (19990903)
    uint32_t Age;
    uint16_t GlobalStreamIndex;        // Global symbol stream
    uint16_t BuildNumber;
    uint16_t PublicStreamIndex;        // Public symbol stream
    uint16_t PdbDllVersion;
    uint16_t SymRecordStream;          // Deduplicated symbol record stream
    uint16_t PdbDllRbld;
    int32_t  ModInfoSize;              // Bytes of module info substream
    int32_t  SectionContributionSize;
    int32_t  SectionMapSize;
    int32_t  SourceInfoSize;
    int32_t  TypeServerMapSize;
    uint32_t MFCTypeServerIndex;
    int32_t  OptionalDbgHeaderSize;
    int32_t  ECSubstreamSize;
    uint16_t Flags;                    // Incrementally-linked, stripped, etc.
    uint16_t Machine;                  // CV_CPU_TYPE_e
};
```

Seven substreams follow the header:

**Module Info Substream:** Array of `ModInfo` records, one per compiland (object file). Each contains:
- Section contribution entry (which PE section this module's code lives in)
- `ModuleSymStream`: the stream index containing debug info for this module
- `SymByteSize`, `C11ByteSize`, `C13ByteSize`: sizing info
- `SourceFileCount` and string table indices
- Module name (object file path) and object file name

**Section Contribution Substream:** Maps every section in the PE to the module that contributed it, and records its offset, size, and characteristics.

**Section Map Substream:** Maps segments to sections -- bridges the COFF section model to the PE's RVA-based addressing.

**File Info Substream:** Maps each module to the source files that contribute to it. Uses a string table for deduplication.

**Type Server Map / EC Substreams:** Used for `/Zi` (separate PDB for types) and Edit & Continue support.

**Optional Debug Header Stream:** Array of stream indices for additional debug data: FPO data, exception data, OMAP mappings, section header dumps, xdata/pdata copies [15].

### 8.5 Module Info Streams (Per-Compiland)

Each module (compiland) that has debug information gets its own stream. The stream index comes from `ModInfo.ModuleSymStream`. Format:

```
uint32_t Magic;           // 0x4 = C13 signature (modern)
[Symbol records...]       // SymByteSize bytes of CodeView symbol records
[Line number info...]     // C13ByteSize bytes of C13 line info
```

Common symbol record types found in module streams: `S_OBJNAME`, `S_COMPILE3`, `S_GPROC32`, `S_LPROC32`, `S_BPREL32`, `S_REGISTER`, `S_LOCAL`, `S_DEFRANGE_*`, `S_BLOCK32`, `S_END` [6][15].

### 8.6 Public & Global Symbol Streams

**Public Stream** (`DbgStreamHeader.PublicStreamIndex`): Contains `S_PUB32` records for every externally visible symbol (functions, globals) with mangled names. Includes a hash table for O(1) lookup by name [16].

**Global Stream** (`DbgStreamHeader.GlobalStreamIndex`): Contains references to symbol records for every symbol with linkage (including internal). Each record points back to the module stream + offset where the full record lives. Also has a hash table for name lookup [6][16].

---

## 9. CodeView Type Records

### 9.1 Record Prefix

Every CodeView type record starts with a 4-byte header:

```
struct RecordHeader {
    uint16_t RecordLen;   // Length excluding this 2-byte field
    uint16_t RecordKind;  // LF_* or S_* enum
};
```

In TPI/IPI streams, records are 4-byte aligned by inserting `LF_PADn` records. In `.debug$T` sections, no padding is applied [17].

### 9.2 Fundamental Type Record Kinds

| Leaf | Value | Purpose |
|------|-------|---------|
| `LF_POINTER` | `0x1002` | Pointer type with attributes (mode, const/volatile, size) |
| `LF_MODIFIER` | `0x1001` | const/volatile/unaligned on a referenced type |
| `LF_PROCEDURE` | `0x1008` | Function type: return type, calling convention, parameter list |
| `LF_MFUNCTION` | `0x1009` | Member function type: `this` pointer info + procedure info |
| `LF_ARGLIST` | `0x1201` | Variable-length list of type indices for function parameters |
| `LF_FIELDLIST` | `0x1203` | Container for field member records (struct/class members) |
| `LF_ARRAY` | `0x1503` | Array type: element type, indexing type, size |
| `LF_CLASS` | `0x1504` | Class type: name, size, field list, base classes, methods |
| `LF_STRUCTURE` | `0x1505` | Struct type (same layout as LF_CLASS) |
| `LF_INTERFACE` | `0x1519` | Interface type |
| `LF_UNION` | `0x1506` | Union type |
| `LF_ENUM` | `0x1507` | Enum type: name, underlying type, enumerators |
| `LF_BITFIELD` | `0x1205` | Bitfield: base type, bit position, bit width |
| `LF_VFTABLE` | `0x151D` | Virtual function table descriptor |
| `LF_VTSHAPE` | `0x000A` | vtable shape: entries for virtual methods |
| `LF_TYPESERVER2` | `0x1515` | Reference to external type server (`.pdb` file) |
| `LF_FUNC_ID` | `0x1601` | Function ID: name, type reference (IPI stream) |
| `LF_MFUNC_ID` | `0x1602` | Member function ID (IPI stream) |
| `LF_STRING_ID` | `0x1605` | String ID: string table reference (IPI stream) |
| `LF_UDT_SRC_LINE` | `0x1606` | Source line where a UDT is defined (IPI stream) |

### 9.3 Field Member Records

These records appear **inside** an `LF_FIELDLIST` record, not as standalone records [17]:

| Member | Value | Purpose |
|--------|-------|---------|
| `LF_BCLASS` | `0x1400` | Base class reference (offset, attributes) |
| `LF_BINTERFACE` | `0x151A` | Base interface |
| `LF_VBCLASS` | `0x1401` | Virtual base class |
| `LF_IVBCLASS` | `0x1402` | Indirect virtual base class |
| `LF_VFUNCTAB` | `0x1409` | Pointer to vtable |
| `LF_STMEMBER` | `0x150E` | Static data member |
| `LF_METHOD` | `0x150F` | Overloaded method group |
| `LF_ONEMETHOD` | `0x1511` | Single method (introduced, pure, etc.) |
| `LF_MEMBER` | `0x150D` | Data member (offset, type, name) |
| `LF_NESTTYPE` | `0x1510` | Nested type definition |
| `LF_ENUMERATE` | `0x1502` | Enumeration value |
| `LF_INDEX` | `0x1404` | Continuation pointer (for large field lists) |

### 9.4 Type Graph DAG Property

Type records in TPI/IPI streams form a **topologically sorted DAG**. For any two types A and B where A references B, `TypeIndex(B) < TypeIndex(A)`. This means the entire type graph can be reconstructed in a single forward pass. Violations occur rarely (e.g., MASM-compiled objects) but are generally enforced [14].

---

## 10. CodeView Symbol Records

### 10.1 Scope Model

Symbol records follow a scoping model: certain records (`S_GPROC32`, `S_LPROC32`, `S_BLOCK32`, `S_INLINESITE`) open a scope, and all records until the next `S_END` are its children [18].

### 10.2 Key Symbol Record Types

**Procedure symbols (open scope):**

| Symbol | Value | Purpose |
|--------|-------|---------|
| `S_GPROC32` | `0x1110` | Global function (has mangled name) |
| `S_LPROC32` | `0x110F` | Local/static function |
| `S_LPROC32_ID` | `0x1146` | Local function with IPI type reference |
| `S_GPROC32_ID` | `0x1147` | Global function with IPI type reference |
| `S_INLINESITE` | `0x114D` | Inline function expansion site |

**Data symbols:**

| Symbol | Value | Purpose |
|--------|-------|---------|
| `S_REGISTER` | `0x1106` | Variable in register |
| `S_BPREL32` | `0x110B` | Variable relative to base pointer (stack local) |
| `S_REGREL32` | `0x1111` | Variable relative to register |
| `S_LOCAL` | `0x113E` | Local variable debug info (type, name, flags) |
| `S_GDATA32` | `0x110D` | Global data symbol |
| `S_LDATA32` | `0x110C` | Local data symbol |
| `S_CONSTANT` | `0x1107` | Constant value |
| `S_LTHREAD32` | `0x1112` | Local thread-local data |
| `S_GTHREAD32` | `0x1113` | Global thread-local data |

**Debug range symbols (describe variable lifetimes for optimized code):**

| Symbol | Value | Purpose |
|--------|-------|---------|
| `S_DEFRANGE` | `0x113F` | Variable defined in a memory range |
| `S_DEFRANGE_SUBFIELD` | `0x1140` | Subfield defined in a memory range |
| `S_DEFRANGE_REGISTER` | `0x1141` | Variable in register over a range |
| `S_DEFRANGE_FRAMEPOINTER_REL` | `0x1142` | Frame-relative variable over a range |
| `S_DEFRANGE_SUBFIELD_REGISTER` | `0x1143` | Subfield in register over a range |
| `S_DEFRANGE_REGISTER_REL` | `0x1145` | Register-relative variable over a range |

**Other symbols:**

| Symbol | Value | Purpose |
|--------|-------|---------|
| `S_OBJNAME` | `0x1101` | Object file name |
| `S_COMPILE3` | `0x113C` | Compiler version and flags |
| `S_ENVBLOCK` | `0x113D` | Environment variables |
| `S_BLOCK32` | `0x1103` | Lexical block (opens scope) |
| `S_LABEL32` | `0x1105` | Code label |
| `S_FRAMEPROC` | `0x1012` | Frame procedure info (stack frame layout) |
| `S_THUNK32` | `0x1102` | Thunk (trampoline) |
| `S_TRAMPOLINE` | `0x112C` | Incremental linking trampoline |
| `S_SECTION` | `0x1136` | COFF section reference |
| `S_COFFGROUP` | `0x1137` | COFF group reference |
| `S_CALLSITEINFO` | `0x1139` | Call site information |
| `S_FRAMECOOKIE` | `0x113A` | Stack frame cookie (/GS) |
| `S_UDT` | `0x1108` | User-defined type reference |
| `S_BUILDINFO` | `0x114C` | Build info (IPI stream reference) |
| `S_EXPORT` | `0x1138` | Exported symbol |

### 10.3 Structure of S_GPROC32 / S_LPROC32

```
struct ProcSym32 {
    uint32_t Parent;        // Parent scope offset
    uint32_t End;           // End scope offset (to S_END)
    uint32_t Next;          // Next procedure offset
    uint32_t ProcLen;       // Procedure length in bytes
    uint32_t DebugStart;    // Offset to debug start
    uint32_t DebugEnd;      // Offset to debug end
    uint32_t TypeIndex;     // Type index of function signature
    uint32_t Offset;        // Section-relative offset
    uint16_t Segment;       // Section index
    uint8_t  Flags;         // Flags (no return, etc.)
    char     Name[];        // Null-terminated name
};
```

The `TypeIndex` field points to an `LF_PROCEDURE` or `LF_MFUNCTION` record in the TPI stream, which describes the full function signature (return type, parameter types, calling convention) [18].

### 10.4 S_BPREL32 and S_REGISTER

These are the most important symbols for local variable recovery:

**S_BPREL32** -- stack local variable:
```
struct BpRelSym32 {
    uint32_t Offset;    // Offset from base pointer (EBP/RBP)
    uint32_t TypeIndex; // Type index (TPI stream)
    char     Name[];
};
```

**S_REGISTER** -- register variable:
```
struct RegisterSym {
    uint32_t TypeIndex;     // Type index
    uint16_t Register;      // CV_HREG_e enum (register number)
    char     Name[];
};
```

The `CV_HREG_e` enum maps to physical registers: `CV_AMD64_RBP = 24`, `CV_AMD64_RAX = 0`, `CV_AMD64_RCX = 2`, etc. [18].

---

## 11. Line Number Information

### 11.1 C13 Line Number Format

Modern PDBs use C13 line number information (indicated by the magic `0x4` in module streams). The format consists of a sequence of chunks, each identified by a header [15]:

```
struct C13LineInfoChunk {
    uint32_t ChunkType;     // Chunk type identifier
    uint32_t ChunkSize;     // Size of data following this header
    uint8_t  Data[ChunkSize];
};
```

**Key chunk types:**

| Type | Value | Purpose |
|------|-------|---------|
| `DEBUG_S_SYMBOLS` | `0xF1` | Symbol records (duplication of module stream) |
| `DEBUG_S_LINES` | `0xF2` | Source file + line number mapping |
| `DEBUG_S_FILECHKSMS` | `0xF4` | Source file checksums |
| `DEBUG_S_INLINEELINES` | `0xF6` | Inline function source line mapping |

### 11.2 DEBUG_S_LINES Structure

```
struct LinesChunk {
    uint32_t Offset;           // Section-relative offset
    uint16_t Segment;          // Section index
    uint16_t Padding;          
    uint32_t Length;           // Code length covered by this block
    uint32_t FileChecksumOffset; // Offset into FILECHKSMS for the source file
    uint32_t NumLines;         // Count of line number entries
    uint8_t  Flags;            // Flags for line entry size
    [Line entries...]          // NumLines entries (2 or 4 bytes each depending on flags)
};
```

Each line entry maps a code offset to a source line:

```
struct LineNumberEntry {
    uint32_t CodeOffset;  // Offset from the start of the section
    uint32_t LineNumber;  // Source line number (high 24 bits = line, low bit = start statement flag)
};
```

When `Flags & 1` is set, line entries are 4 bytes with the full `LineNumberEntry`. Otherwise they use a compact 2-byte format.

### 11.3 Source-Level RE from Line Numbers

The combination of:
- Module stream symbols (function names + addresses)
- Source file checksums (file paths + hash)
- Line number chunks (offset to source line mapping)

...enables full source-level decompilation: every function can be annotated with its source file and line numbers, and every source line can be mapped back to its compiled code range.

For RE: line number info reveals source file names and line ranges even when the source itself is unavailable. Combined with PDB type info, it provides the highest-fidelity source reconstruction possible from a binary [6][15].

---

## 12. PDB as RE Resource

### 12.1 Recovering Function Signatures

Using the TPI stream's type graph, each function symbol's `TypeIndex` leads to:

1. The `LF_PROCEDURE` record for its calling convention and return type
2. The `LF_ARGLIST` record listing all parameter types
3. Each parameter type resolves to its full definition (struct, pointer, enum, etc.)
4. Member functions additionally resolve `LF_MFUNCTION` (with `this` pointer type)

The full type graph traversal reconstructs C/C++ function prototypes with complete parameter types [14][17].

### 12.2 Recovering Struct/Class Layouts

`LF_CLASS`, `LF_STRUCTURE`, `LF_UNION` records contain:
- `Name`: the type name
- `Size`: total size in bytes
- `FieldList`: type index of an `LF_FIELDLIST` containing members
- `DerivationList`: type index of base class list
- `VShape`: type index of vtable shape
- `Count`: number of members

The `LF_FIELDLIST` contains member records (`LF_MEMBER`, `LF_BCLASS`, `LF_METHOD`, `LF_ONEMETHOD`, `LF_STMEMBER`, `LF_VFUNCTAB`, etc.) that describe every field with offset, type, and name [17].

For RE: this reconstructs complete C++ class hierarchies, vtable layouts, and member offsets -- essential for understanding C++ binaries.

### 12.3 Recovering Local Variables

For each function in the module stream:
- `S_BPREL32` records give stack local variable names, types, and offsets
- `S_REGISTER` records give register variable names and types
- `S_DEFRANGE_*` records give exact code ranges where each variable is live
- `S_FRAMEPROC` gives total stack frame size and /GS cookie info

The combination of type info (TPI) and symbol info (module stream) enables full local variable recovery: name, type, storage location, and lifetime [18].

### 12.4 PDB as Ground Truth for Decompilation

A PDB file provides the semantic ground truth that decompilers (Hex-Rays, Ghidra) synthesize from disassembly:

| Decompiler output | PDB equivalent |
|-------------------|----------------|
| Function names | `S_PUB32`, `S_GPROC32` names |
| Function prototypes | `LF_PROCEDURE` via type indices |
| Local variable names | `S_BPREL32`, `S_REGISTER` names |
| Local variable types | Type indices from BPREL/REGISTER |
| Struct definitions | `LF_STRUCTURE` + `LF_FIELDLIST` |
| Class hierarchies | `LF_CLASS` + `LF_BCLASS`/`LF_VFUNCTAB` |
| Switch cases | `S_LABEL32` + block structure |
| String literals | `S_CONSTANT` records |
| Inlined functions | `S_INLINESITE` + `S_INLINEES` |

When a PDB is available, decompilation becomes a matter of mapping PDB information to binary addresses rather than inferring semantics from assembly. This is why PDB-first RE workflows are exponentially more productive than working with a stripped binary [6][19].

### 12.5 Section Contributions: Mapping RVA to Source Module

The DBI stream's section contribution substream maps every byte range in the PE image to the module (object file) that produced it. Combined with the module info substream, this provides:

- Given an RVA: which .obj file generated the code at that address
- Given a module: which PE sections contain its code
- Given a module: which source files contributed to it (File Info substream)

This enables per-module analysis, allowing an RE to isolate code contributed by a specific library or translation unit [15].

---

## 13. Tool Reference

### 13.1 LLVM's lib/DebugInfo/PDB

LLVM provides the most complete open-source PDB parsing library. Key components [6][20]:

**`llvm::pdb::NativeSession`**: Top-level PDB access. Loads a PDB file and provides access to all streams.

**`llvm::pdb::TPIStream`** / **`IPIStream`**: Type record access. Key methods:

```cpp
auto& Tpi = Session.getPDBFile().getPDBTpiStream();
for (auto& Type : Tpi.types(nullptr)) {
    if (Type.kind() == LF_CLASS) {
        // Process struct/class definition
    }
}
```

**`llvm::pdb::DbiStream`**: Module, section, and source file access. Key methods:
- `modules()`: iterate all compilands
- `getSectionContribution()`: get section range for a module
- `getSourceFileForModule()`: get source file list for a module

**`llvm::pdb::PublicSymbolStream`** / **`GlobalSymbolStream`**: Symbol lookup by name or address.

**CodeView type introspection** via `llvm::codeview::TypeVisitorCallbackPipeline` and `TypeRecord` hierarchy.

**CLI tool:** `llvm-pdbutil` provides access to all PDB data from the command line [21]:

```bash
llvm-pdbutil dump -types -symbols -globals -publics target.pdb
llvm-pdbutil pretty -classes -enums -typedefs target.pdb
llvm-pdbutil dump -modules target.pdb        # Module/compiland info
llvm-pdbutil dump -dbiStream target.pdb       # DBI stream contents
```

### 13.2 Microsoft DIA SDK

The Debug Interface Access (DIA) SDK is the canonical Windows PDB API. It is a COM-based interface shipped with Visual Studio [22][23].

**Key interfaces:**

| Interface | Purpose |
|-----------|---------|
| `IDiaSession` | Top-level: created with `get_idia_create_session()` |
| `IDiaSymbol` | Represents any symbol (function, type, variable, etc.) |
| `IDiaEnumTables` | Enumeration of all tables in the PDB |
| `IDiaEnumSymbols` | Symbol enumeration (by name, address, parent) |
| `IDiaEnumSourceFiles` | Source file enumeration |
| `IDiaEnumLineNumbers` | Line number enumeration |
| `IDiaStackWalker` | Stack frame enumeration |
| `IDiaDataSource` | PDB file data source loader |

**Typical usage pattern [23]:**

```cpp
CoInitialize(NULL);
CComPtr<IDiaDataSource> pSource;
CComPtr<IDiaSession> pSession;

pSource.CoCreateInstance(CLSID_DiaSource);
pSource->loadDataFromPdb(L"target.pdb");
pSource->openSession(&pSession);
pSession->put_loadBase(0x140000000); // PE base address

// Find symbol by RVA
CComPtr<IDiaSymbol> pSym;
pSession->findSymbolByRVA(rva, SymTagFunction, &pSym);
```

**`dia2dump`**: The reference sample shipped with DIA SDK. It walks the entire symbol tree and dumps all properties. Instructions for building are in the Visual Studio samples directory [23].

### 13.3 Python: pdbparse (moyix)

`pdbparse` is a GPL-licensed Python library by Brendan Dolan-Gavitt (moyix) that parses PDB files cross-platform using the `construct` library [24].

**Key capabilities:**
- MSF container parsing (superblock, stream directory)
- TPI stream type record parsing
- DBI stream parsing (modules, sections)
- Global and public symbol streams
- OMAP stream support (address translation for stripped binaries)
- FPO (Frame Pointer Omission) support

**Usage:**

```python
import pdbparse
pdb = pdbparse.parse("target.pdb")

# Access the type stream
tpi = pdb.streams[2]
# Parse type records...

# Access module information
dbi = pdb.DebugInfo
for mod in dbi.modules:
    print(mod.name)
```

The `construct` library's declarative parsing makes `pdbparse` ideal for understanding PDB layout by reading the format definitions [24].

### 13.4 pdbpy

A pure-Python PDB parser by Pierre LeMoine, available on PyPI [25]:

```bash
pip install pdbpy
```

```python
import pdbpy
pdb = pdbpy.PDB("target.pdb")

# Find type by name
my_struct = pdb.find_type("MyStruct")

# Look up symbol by address
sym = pdb.find_symbol(0x140001234)

# Global and public symbol iteration
for sym in pdb.global_symbols():
    print(sym.name)
```

`pdbpy` lazily loads only requested data from memory-mapped MSF files. For a 1GB+ PDB, this avoids loading the entire file [25].

### 13.5 resym

A cross-platform tool by ergrelet that combines PDB type information with visual browsing [26]:

```bash
resym --pdb target.pdb
```

Features: browse all types, structures, enums; extract C/C++ type declarations; export as header files; dependency graph visualization. Built on top of pdbparse internally.

### 13.6 radare2 / r2pdb

Radare2 has built-in PDB support via the `r2pdb` plugin and `rabin2` [27][28]:

```bash
# Load PDB symbols for an EXE
rabin2 -P target.exe          # List PDB info
rabin2 -PP target.exe         # Download and load PDB
rabin2 -P target.pdb          # Dump PDB symbols

# In radare2 session
> idp target.pdb              # Load PDB
> il                          # List symbols from PDB
> ic                          # List classes/types from PDB
> is                          # List symbols
```

The PDB integration in r2 provides:
- Symbol name resolution at all virtual addresses
- Type information for structures and function signatures
- Class hierarchy information
- Source file and line number mapping

Security note: a 2026 vulnerability (CVE-2026-40517) was found in the r2 PDB parser's `print_gvars()` function where unsanitized symbol names could inject commands [29].

### 13.7 Ghidra PDB Plugin

Ghidra can load PDB files via its `pdb.exe` or `pdb.py` analyzers, which use Microsoft's DIA SDK on Windows or `pdbparse` cross-platform. When analysis is complete:
- All functions are named
- Data types are applied to structures
- Function signatures include parameter names and types
- Source file paths are listed in the project

### 13.8 IDA Pro PDB Support

IDA Pro uses the `pdb.dll` plugin (via DIA SDK on Windows or `pdbparse`/LLVM on other platforms). The `File > Load File > PDB File` command or `Ctrl+P` hotkey loads symbols. IDA's PDB parser:
- Applies all public and global function names
- Reconstructs structure/class types
- Sets function prototypes with parameter info
- Adds source-level comments with file:line information

### 13.9 Windbg / cdb

Windows debuggers use PDB files transparently through `DbgHelp.dll` API:
- `SymInitialize`, `SymLoadModule64`, `SymFromAddr`, `SymGetTypeInfo`, `SymEnumSymbols`
- These APIs abstract away MSF/CodeView format details

For programmatic RE on Windows, the `dbghelp` API is the simplest path to PDB data without dealing with format internals [30].

---

## 14. COFF-PE-PDB: The Complete Chain

```
Source Code
    ↓ (compiler: cl.exe / clang-cl)
COFF .obj files  +  .debug$T / .debug$S sections
    ↓
LIB .lib files (archive of COFF objects)
    |
    ├── First Linker Member (/): symbol→.obj map
    ├── Second Linker Member (//): long names
    └── COFF objects with import data
    ↓ (linker: link.exe / lld-link)
PE .exe/.dll  +  PDB .pdb
    |              |
    |              ├── MSF container (SuperBlock → FPM → StreamDir)
    |              ├── PDB Stream (GUID + Age — matches PE RSDS entry)
    |              ├── TPI Stream (type records DAG)
    |              ├── IPI Stream (function IDs, string IDs)
    |              ├── DBI Stream (modules, sections, source files)
    |              │   ├── Module Info Substream
    |              │   ├── Section Contribution Substream
    |              │   ├── Section Map Substream
    |              │   ├── File Info Substream
    |              │   └── Optional Debug Header Stream
    |              ├── Public Stream (mangled names + addresses)
    |              ├── Global Stream (all-linkage symbols)
    |              ├── Module streams (symbols + C13 line info)
    |              └── Hash streams (TPI, IPI, public, global)
    |
    └── PE headers
        ├── DOS stub + "PE\0\0" signature
        ├── COFF File Header (same struct as .obj!)
        ├── Optional Header (ImageBase, entry point, directories)
        ├── Section Headers (.text, .rdata, .data, .rsrc, .reloc, etc.)
        ├── Section Data (merged from COFF inputs)
        ├── .idata (import directory — synthesized by linker)
        ├── .edata (export directory — synthesized by linker)
        ├── .reloc (base relocations — for ASLR)
        ├── .pdata (exception handling)
        ├── .debug (points to PDB via RSDS GUID+Age)
        └── .tls (thread-local storage)
```

This chain is the complete lifecycle of debug information on Windows. Understanding every layer -- from COFF section merging to CodeView type DAGs to MSF stream layout -- is the difference between a reverse engineer who guesses at semantics and one who reads them directly from the metadata [2][6][11].

**For the RE practitioner:** A PDB is always worth attempting to find. Check the `.debug` section of the PE for the RSDS GUID, then query Microsoft's symbol server (`https://msdl.microsoft.com/download/symbols/`), check alongside the binary, or search build directories. The information density in a PDB is orders of magnitude higher than what any decompiler can infer [30].

---

## 14. References

| # | Source |
|---|--------|
| [1] | Wikipedia, "COFF" -- https://en.wikipedia.org/wiki/COFF |
| [2] | Microsoft, "PE Format" -- https://learn.microsoft.com/en-us/windows/win32/debug/pe-format |
| [3] | Microsoft, `IMAGE_FILE_HEADER` (winnt.h) -- https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-image_file_header |
| [4] | Microsoft, "Section Table (Section Headers)" -- https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#section-table-section-headers |
| [5] | Microsoft, "COMDAT Sections (Object Only)" -- https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#comdat-sections-object-only |
| [6] | LLVM, "The PDB File Format" -- https://releases.llvm.org/20.1.0/docs/PDB/index.html |
| [7] | Microsoft, "Auxiliary Symbol Records" -- https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#auxiliary-symbol-records |
| [8] | Stack Overflow, "How do relocations work in COFF object files" -- https://stackoverflow.com/questions/17896989/ |
| [9] | Stack Overflow, "What's the format of .lib in windows?" -- https://stackoverflow.com/a/22708457 |
| [10] | Microsoft, "Overview of LIB" -- https://learn.microsoft.com/en-us/cpp/build/reference/overview-of-lib/ |
| [11] | Fangrui Song, "Symbol processing" (linker internals) -- https://maskray.me/blog/2021-06-20-symbol-processing |
| [12] | LLVM, "The MSF File Format" -- https://releases.llvm.org/20.1.0/docs/PDB/MsfFile.html |
| [13] | Microsoft, "Debug Directory" -- https://learn.microsoft.com/en-us/windows/win32/debug/pe-format#the-debug-section |
| [14] | LLVM, "The PDB TPI and IPI Streams" -- https://releases.llvm.org/20.1.0/docs/PDB/TpiStream.html |
| [15] | LLVM, "The PDB DBI (Debug Info) Stream" -- https://releases.llvm.org/20.1.0/docs/PDB/DbiStream.html |
| [16] | LLVM, "The PDB Public Symbol Stream" -- https://releases.llvm.org/20.1.0/docs/PDB/PublicStream.html |
| [17] | LLVM, "CodeView Type Records" -- https://releases.llvm.org/20.1.0/docs/PDB/CodeViewTypes.html |
| [18] | LLVM, "CodeView Symbol Records" -- https://releases.llvm.org/18.1.4/docs/PDB/CodeViewSymbols.html |
| [19] | RetroReversing, "Using PDB files for Reverse Engineering" -- https://www.retroreversing.com/PDBFileReversing |
| [20] | LLVM, `lib/DebugInfo/PDB` source -- https://llvm.org/doxygen/group__PDB.html |
| [21] | LLVM, "llvm-pdbutil" -- https://www.llvm.org/docs/CommandGuide/llvm-pdbutil.html |
| [22] | Microsoft, "DIA SDK Overview" -- https://learn.microsoft.com/en-us/visualstudio/debugger/debug-interface-access/debug-interface-access-sdk |
| [23] | Microsoft, "Dia2dump Sample" -- https://learn.microsoft.com/en-us/visualstudio/debugger/debug-interface-access/dia2dump-sample |
| [24] | moyix, "pdbparse" (GitHub) -- https://github.com/moyix/pdbparse |
| [25] | pdbpy (PyPI) -- https://pypi.org/project/pdbpy/ |
| [26] | ergrelet, "resym" (GitHub) -- https://github.com/ergrelet/resym |
| [27] | Radare2 Book, "Debug Symbols / PDB" -- https://book.rada.re/tools/rabin2/debug_symbols.html |
| [28] | Radare2 Book, "Types" -- https://book.rada.re/analysis/types.html |
| [29] | CVE-2026-40517, "radare2 PDB Parser RCE" -- https://www.sentinelone.com/vulnerability-database/cve-2026-40517/ |
| [30] | Microsoft, "DbgHelp API" -- https://learn.microsoft.com/en-us/windows/win32/debug/dbghelp-reference |
| [31] | Microsoft, "PDB Files" (microsoft-pdb GitHub) -- https://github.com/Microsoft/microsoft-pdb |
| [32] | LLVM, "Improving Link Time on Windows with clang-cl and lld" -- https://blog.llvm.org/2018/01/improving-link-time-on-windows-with.html |
| [33] | Microsoft, "Storing debug information in PDB files" -- https://learn.microsoft.com/en-us/cpp/build/reference/debug-generation |
| [34] | getsentry, "pdb: A parser for Microsoft PDB files" (Rust) -- https://github.com/getsentry/pdb |
| [35] | LLVM, `llvm-debuginfo-analyzer` -- https://www.llvm.org/docs/CommandGuide/llvm-debuginfo-analyzer.html |
