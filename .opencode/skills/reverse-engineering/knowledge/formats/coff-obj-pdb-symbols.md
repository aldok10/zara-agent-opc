# COFF/OBJ/PDB Internals

TL;DR: COFF is the object file format behind PE. PDB files are MSF containers holding CodeView type/symbol records. A PDB provides ground truth for decompilation: function names, prototypes, local variables, struct layouts, line numbers. Always attempt to find a PDB before reversing a Windows binary.

---

## COFF Object File (.obj)

### File Header (IMAGE_FILE_HEADER, 20 bytes)

```
Offset  Field                Size  Notes
0       Machine              2     0x14C=x86, 0x8664=x64, 0xAA64=ARM64
2       NumberOfSections     2
4       TimeDateStamp        4
8       PointerToSymbolTable 4
12      NumberOfSymbols      4
16      SizeOfOptionalHeader 2     0 for .obj, non-zero for PE
18      Characteristics      2
```

### Section Characteristics (Key Flags)

| Flag | Value | Meaning |
|------|-------|---------|
| CNT_CODE | 0x00000020 | Contains code |
| CNT_INITIALIZED_DATA | 0x00000040 | Initialized data |
| LNK_COMDAT | 0x00001000 | COMDAT (deduplicable) |
| MEM_EXECUTE | 0x20000000 | Executable |
| MEM_READ | 0x40000000 | Readable |
| MEM_WRITE | 0x80000000 | Writable |

### Common Sections

| Section | Contents |
|---------|----------|
| `.text` | Code (EXECUTE+READ) |
| `.data` | R/W initialized data |
| `.rdata` | Read-only data |
| `.bss` | Uninitialized data |
| `.debug$T` | CodeView type records |
| `.debug$S` | CodeView symbol records |
| `.drectve` | Linker directives (ASCII) |

### The `$` Merging Convention

All `.text$X` sections from all .obj files merge into PE's `.text`, ordered lexicographically by suffix. Example: `.CRT$XCA` through `.CRT$XCZ` = CRT init table.

---

## COFF Relocations

### Entry Format (10 bytes each)

```
Offset  Field             Size
0       VirtualAddress    4     Location to patch
4       SymbolTableIndex  4     Target symbol
8       Type              2     Architecture-specific
```

### x64 Types

| Type | Value | Description |
|------|-------|-------------|
| REL32 | 0x0004 | 32-bit relative (calls) |
| ADDR64 | 0x0001 | 64-bit absolute |
| ADDR32NB | 0x0003 | 32-bit RVA |
| SECREL | 0x000B | Section-relative offset |

**RE value**: Every relocation maps a code location to a named symbol. Preserved .obj files reveal the entire call graph.

---

## LIB Archive Format

Unix `ar` format with Microsoft extensions. Contains COFF objects + index.

Special members:
- `/` (First Linker Member): symbol -> member offset map
- `//` (Long names): long symbol name strings
- Import libraries contain `.idata$2/4/5` sections with DLL function names

---

## PDB Format

### MSF Container

Magic: `Microsoft C / C++ MSF 7.00\r\n\x1ADS\0\0\0` (31 bytes)

```
SuperBlock {
    FileMagic[32], BlockSize(4096), FreeBlockMapBlock,
    NumBlocks, NumDirectoryBytes, BlockMapAddr
}
```

Streams are virtual files divided into 4096-byte blocks (can be discontiguous).

### Fixed Stream Indices

| Index | Name | Contents |
|-------|------|----------|
| 0 | Old Directory | Previous MSF directory |
| 1 | PDB Stream | GUID/Age for EXE matching, named stream map |
| 2 | TPI Stream | Type records (structs, functions, pointers) |
| 3 | DBI Stream | Module info, section contributions, source files |
| 4 | IPI Stream | ID records (function IDs, string IDs) |
| 5+ | Various | Module streams, hash streams, /names |

### PDB-to-EXE Matching

PE's `.debug` section contains RSDS entry with same GUID+Age as PDB stream. Query Microsoft symbol server: `https://msdl.microsoft.com/download/symbols/`

---

## TPI Stream (Type Information)

Type records form a topologically sorted DAG. Type indices start at 0x1000.

### Key Type Record Kinds

| Leaf | Value | Purpose |
|------|-------|---------|
| LF_POINTER | 0x1002 | Pointer with attributes |
| LF_PROCEDURE | 0x1008 | Function: return type, calling conv, params |
| LF_MFUNCTION | 0x1009 | Member function (+ this pointer) |
| LF_ARGLIST | 0x1201 | Parameter type list |
| LF_FIELDLIST | 0x1203 | Struct/class member container |
| LF_CLASS | 0x1504 | Class definition |
| LF_STRUCTURE | 0x1505 | Struct definition |
| LF_UNION | 0x1506 | Union definition |
| LF_ENUM | 0x1507 | Enum definition |
| LF_BITFIELD | 0x1205 | Bitfield |

### Fundamental Type Encoding (below 0x1000)

```
4 bits Mode | 8 bits Kind
Mode: Direct(0), NearPtr32(4), NearPtr64(6)
Kind: Void(0x03), Int32(0x12), UInt32(0x22), Float64(0x41)
```

---

## CodeView Symbol Records

### Key Symbols

| Symbol | Value | Purpose |
|--------|-------|---------|
| S_GPROC32 | 0x1110 | Global function (opens scope) |
| S_LPROC32 | 0x110F | Local/static function |
| S_BPREL32 | 0x110B | Stack local variable |
| S_REGISTER | 0x1106 | Register variable |
| S_LOCAL | 0x113E | Local variable info |
| S_GDATA32 | 0x110D | Global data |
| S_PUB32 | - | Public symbol (mangled name + address) |
| S_INLINESITE | 0x114D | Inline expansion |
| S_COMPILE3 | 0x113C | Compiler version |
| S_FRAMEPROC | 0x1012 | Stack frame layout |

### S_GPROC32 Structure

```
Parent, End, Next, ProcLen, DebugStart, DebugEnd,
TypeIndex (-> LF_PROCEDURE), Offset, Segment, Flags, Name[]
```

---

## DBI Stream (Module/Section Info)

Contains 7 substreams:
1. **Module Info**: per-compiland records (obj path, symbol stream index)
2. **Section Contribution**: maps PE sections to source modules
3. **Section Map**: segment-to-section bridge
4. **File Info**: module-to-source-file mapping
5. Type Server Map
6. EC (Edit & Continue)
7. Optional Debug Header (FPO, exception, OMAP)

---

## PDB as RE Resource

| Decompiler output | PDB equivalent |
|-------------------|----------------|
| Function names | S_PUB32, S_GPROC32 |
| Function prototypes | LF_PROCEDURE via TypeIndex |
| Local variable names | S_BPREL32, S_REGISTER |
| Struct definitions | LF_STRUCTURE + LF_FIELDLIST |
| Class hierarchies | LF_CLASS + LF_BCLASS |
| Inlined functions | S_INLINESITE |
| Source file:line | C13 line info chunks |

---

## Tools

| Tool | Purpose |
|------|---------|
| `llvm-pdbutil dump -types -symbols` | Full PDB dump (CLI) |
| DIA SDK (COM) | Canonical Windows PDB API |
| `pdbparse` (Python) | Cross-platform PDB parsing |
| `pdbpy` (Python) | Lazy-loading PDB parser |
| `resym` | Visual PDB type browser |
| `rabin2 -P target.pdb` | radare2 PDB symbols |
| Ghidra PDB plugin | Load symbols + types |
| IDA `Ctrl+P` | Load PDB file |
| `symchk` / `symstore` | Microsoft symbol server tools |

### COFF-to-PE Chain

```
Source -> compiler -> COFF .obj (.debug$T/$S)
       -> linker -> PE .exe/.dll + PDB .pdb
                    PE .debug section has RSDS GUID pointing to PDB
```
