# PE Headers, NT Headers, and Sections

TL;DR: Windows PE file layout, DOS header, Rich header, NT headers (File Header + Optional Header),
data directories, section headers, and RVA-to-file-offset conversion.

Cross-reference: See also `pe-imports-exports-relocs.md`, `pe-resources-debug-tools.md` in this directory.

A working reference for analysts examining Windows Portable Executable (PE) images
(`.exe`, `.dll`, `.sys`, `.ocx`, `.cpl`) during authorized analysis. Focus is on what
each structure means for a reverse engineer, with concrete byte offsets, the relevant
`winnt.h` C structures, and the tools that surface them.

Primary sources: Microsoft's official PE/COFF specification [1], the 0xRick PE
internals series [2][3][4][5][6], Microsoft's classic "Inside Windows" deep dive [7],
corkami PE101 [8], and tool/library docs for `pefile` and LIEF [9][10].

---

## 1. Layout at a glance

A PE file is a linear byte stream. On disk the order is fixed:

```
+-------------------------+  offset 0x00
| DOS Header (64 bytes)   |  IMAGE_DOS_HEADER, starts "MZ"
+-------------------------+  0x40
| DOS Stub (16-bit prog)  |  "This program cannot be run in DOS mode."
+-------------------------+
| Rich Header (MSVC only) |  XOR-encoded toolchain fingerprint (undocumented)
+-------------------------+  e_lfanew  ->
| NT Headers              |  "PE\0\0" + File Header + Optional Header
|   Signature  (4 bytes)  |
|   File Header (20 bytes)|  IMAGE_FILE_HEADER
|   Optional Header       |  IMAGE_OPTIONAL_HEADER32 / 64  (+ 16 Data Directories)
+-------------------------+
| Section Table           |  array of IMAGE_SECTION_HEADER (40 bytes each)
+-------------------------+  SizeOfHeaders (rounded to FileAlignment)
| Section bodies          |  .text .rdata .data .rsrc .reloc ...
+-------------------------+
| Overlay (optional)      |  appended data past last section (installers, sigs)
+-------------------------+
```

Two views of the same file matter constantly: the **on-disk (raw)** layout, aligned to
`FileAlignment`, and the **in-memory (virtual)** layout the loader maps, aligned to
`SectionAlignment` [1][5]. Addresses inside the image are almost always RVAs (see §6).

PE32 vs PE32+: the only structural difference between 32-bit and 64-bit images is the
Optional Header. PE32+ drops `BaseOfData` and widens five fields (`ImageBase`,
stack/heap reserve/commit) from `DWORD` to `ULONGLONG`. The `Optional Header.Magic`
field is the authoritative bitness indicator, not `File Header.Machine` [3].

---

## 2. DOS Header + DOS Stub

64-byte `IMAGE_DOS_HEADER` for MS-DOS backward compatibility. Only two fields matter on
modern Windows [3]:

| Offset | Field      | Size | Meaning                                                      |
|--------|------------|------|--------------------------------------------------------------|
| 0x00   | `e_magic`  | WORD | `0x5A4D` = ASCII `MZ` (Mark Zbikowski). Signature.           |
| 0x3C   | `e_lfanew` | LONG | File offset to the NT Headers ("PE\0\0"). The pivot field.   |

The **DOS stub** is a tiny real-mode program that prints "This program cannot be run in
DOS mode." and exits with code 1. Standard bytes begin `0E 1F BA 0E 00 B4 09 CD 21 ...`
(`int 21h` AH=9 print string, then AH=4Ch exit) [3]. A non-standard stub message is a
weak fingerprint of a custom linker or packer.

RE relevance: jump straight to `*(DWORD*)0x3C` to find the PE header. If `e_lfanew`
points to garbage or the bytes there aren't `50 45 00 00`, the file is malformed or
deliberately broken to confuse parsers.

---

## 3. Rich Header (MSVC fingerprint)

Sits between the DOS stub and the NT headers. Undocumented, present only in images built
with the Microsoft Visual Studio toolchain. It can be zeroed without breaking the file [3].

Structure: a block of XOR-encoded DWORDs, ending with the ASCII tag `Rich` followed by a
32-bit **checksum that is also the XOR key**. Decoded, it begins with the `DanS`
signature, three zero DWORDs of padding, then `(compid, count)` DWORD pairs. Each
`compid` packs a product/tool ID in the high word and a build number in the low word; the
paired DWORD is a use count [3][7].

RE relevance:
- Identifies the exact compiler/linker build numbers used (object counts, MASM, C/C++ FE).
- Powerful for malware clustering and attribution -- same toolchain leaves identical Rich
  data across samples.
- Also an attribution **trap**: the Olympic Destroyer malware copied another group's Rich
  Header as a false flag, so treat it as a strong-but-spoofable signal [3].

Decode: `key = DWORD at "Rich"+4`; XOR every preceding DWORD (from `DanS`) with the key.

---

## 4. NT Headers

```c
typedef struct _IMAGE_NT_HEADERS64 {
    DWORD Signature;                  // 0x50450000  "PE\0\0"
    IMAGE_FILE_HEADER FileHeader;     // 20 bytes
    IMAGE_OPTIONAL_HEADER64 OptionalHeader;
} IMAGE_NT_HEADERS64;
```

### 4.1 File Header (COFF) -- 20 bytes [3]

```c
typedef struct _IMAGE_FILE_HEADER {
    WORD  Machine;               // CPU target
    WORD  NumberOfSections;      // size of the section table
    DWORD TimeDateStamp;         // unix epoch build time
    DWORD PointerToSymbolTable;  // 0 (COFF debug deprecated)
    DWORD NumberOfSymbols;       // 0
    WORD  SizeOfOptionalHeader;  // varies (PE32 vs PE32+)
    WORD  Characteristics;       // attribute flags
} IMAGE_FILE_HEADER;
```

| Field | RE meaning |
|-------|------------|
| `Machine` | `0x14C` = i386, `0x8664` = AMD64, `0xAA64` = ARM64, `0x1C0` = ARM [3][1]. |
| `NumberOfSections` | Bounds the section table; absurdly high counts hint at tampering. |
| `TimeDateStamp` | Build timestamp; often faked/zeroed in malware, or used for clustering. |
| `Characteristics` | Bit flags. Most useful below. |

`Characteristics` flags worth knowing [1]:

| Flag | Value | Meaning |
|------|-------|---------|
| `IMAGE_FILE_EXECUTABLE_IMAGE` | 0x0002 | Valid runnable image. |
| `IMAGE_FILE_LARGE_ADDRESS_AWARE` | 0x0020 | Can use >2GB addresses. |
| `IMAGE_FILE_32BIT_MACHINE` | 0x0100 | 32-bit word machine. |
| `IMAGE_FILE_DLL` | 0x2000 | **This image is a DLL**, not an EXE. |
| `IMAGE_FILE_SYSTEM` | 0x1000 | System file (driver). |

### 4.2 Optional Header [3][7]

Not actually optional for images. Two flavors; PE32+ shown with notable fields.

Standard fields:

| Field | RE meaning |
|-------|------------|
| `Magic` | `0x10B` PE32, `0x20B` PE32+, `0x107` ROM. **Determines bitness.** |
| `MajorLinkerVersion` / `Minor` | Linker version; corroborates the Rich header. |
| `SizeOfCode` / `SizeOfInitializedData` / `SizeOfUninitializedData` | Aggregate section sizes. |
| `AddressOfEntryPoint` | **RVA of entry point.** For an EXE -> start of execution. For a DLL -> `DllMain` thunk, and may be `0` (no entry). |
| `BaseOfCode` | RVA of the code section. |
| `BaseOfData` | PE32 only -- dropped in PE32+. |

Windows-specific fields:

| Field | RE meaning |
|-------|------------|
| `ImageBase` | Preferred load address. Common defaults: `0x400000` (EXE), `0x10000000` (DLL), `0x180000000` (64-bit). With ASLR rarely honored -> relocations applied. |
| `SectionAlignment` | In-memory alignment (usually `0x1000`, one page). |
| `FileAlignment` | On-disk alignment (usually `0x200` = 512). |
| `SizeOfImage` | Total in-memory size, multiple of `SectionAlignment`. |
| `SizeOfHeaders` | All headers + section table, multiple of `FileAlignment`. |
| `CheckSum` | Validated for drivers / some signed images. |
| `Subsystem` | `2` = GUI, `3` = console, `1` = native/driver, `9`+ = EFI. |
| `DllCharacteristics` | Mitigation flags (see below) -- despite the name, applies to EXEs too. |
| `NumberOfRvaAndSizes` | Entry count of the Data Directory array (normally 16). |
| `DataDirectory[16]` | Array of `(RVA, Size)` locators (see §5). |

`DllCharacteristics` mitigation flags [1] -- directly relevant to exploit/RE work:

| Flag | Value | Meaning |
|------|-------|---------|
| `DYNAMIC_BASE` | 0x0040 | ASLR enabled (image can be relocated). |
| `FORCE_INTEGRITY` | 0x0080 | Code integrity checks enforced. |
| `NX_COMPAT` | 0x0100 | DEP / non-executable data. |
| `NO_SEH` | 0x0400 | No structured exception handlers. |
| `GUARD_CF` | 0x4000 | Control Flow Guard instrumented. |
| `HIGH_ENTROPY_VA` | 0x0020 | 64-bit high-entropy ASLR. |

Absent `DYNAMIC_BASE`/`NX_COMPAT` flags often flag old or deliberately weakened binaries.

---

## 5. Data Directories

The last Optional Header member is `IMAGE_DATA_DIRECTORY DataDirectory[16]`, each entry a
simple `(RVA, Size)` locator pointing into some section [5]:

```c
typedef struct _IMAGE_DATA_DIRECTORY { DWORD VirtualAddress; DWORD Size; } IMAGE_DATA_DIRECTORY;
```

| Idx | Name | Section usually | What it tells the analyst |
|-----|------|-----------------|---------------------------|
| 0 | EXPORT | `.edata`/`.rdata` | Functions this image exposes (critical for DLLs, §8). |
| 1 | IMPORT | `.idata`/`.rdata` | External APIs the image calls (§7) -- behavioral fingerprint. |
| 2 | RESOURCE | `.rsrc` | Icons, strings, manifest, version info, embedded payloads (§10). |
| 3 | EXCEPTION | `.pdata` | x64/ARM unwind info (`RUNTIME_FUNCTION`). |
| 4 | SECURITY | (overlay) | Authenticode signature (file offset, **not** an RVA). |
| 5 | BASERELOC | `.reloc` | Base relocation table (§9). |
| 6 | DEBUG | `.rdata` | Debug dir -> PDB path, build GUID/age (§11). |
| 7 | ARCHITECTURE | -- | Reserved (was x86 copyright). |
| 8 | GLOBALPTR | -- | RVA of global pointer (Itanium). |
| 9 | TLS | `.tls` | Thread-local storage + **TLS callbacks** (§9.2). |
| 10 | LOAD_CONFIG | `.rdata` | SafeSEH list, CFG tables, security cookie. |
| 11 | BOUND_IMPORT | (headers) | Bound import timestamps (§7.3). |
| 12 | IAT | `.idata`/`.rdata` | Direct pointer/size of the Import Address Table. |
| 13 | DELAY_IMPORT | `.rdata` | Delay-loaded DLL descriptors (§7.4). |
| 14 | COM_DESCRIPTOR | `.cor`/`.text` | `.NET`/CLR header -- managed assembly marker. |
| 15 | -- | -- | Reserved, must be zero. |

A `(0,0)` entry means that directory is absent. The `COM_DESCRIPTOR` being non-zero
immediately tells you this is a .NET image and you should switch to a CLR-aware tool
(dnSpy/ILSpy) rather than a native disassembler.

---

## 6. Sections, alignment, RVA <-> file offset

### 6.1 Section header -- 40 bytes [5]

```c
typedef struct _IMAGE_SECTION_HEADER {
    BYTE  Name[8];                 // e.g. ".text", not necessarily null-terminated
    union { DWORD PhysicalAddress; DWORD VirtualSize; } Misc;  // size in memory
    DWORD VirtualAddress;          // RVA when mapped
    DWORD SizeOfRawData;           // size on disk (multiple of FileAlignment)
    DWORD PointerToRawData;        // file offset of section body
    DWORD PointerToRelocations;    // 0 for images
    DWORD PointerToLinenumbers;    // 0 (deprecated)
    WORD  NumberOfRelocations;     // 0 for images
    WORD  NumberOfLinenumbers;     // 0
    DWORD Characteristics;         // r/w/x + content flags
} IMAGE_SECTION_HEADER;
```

Common sections [5]:

| Name | Contents | Typical flags |
|------|----------|---------------|
| `.text` | Executable code | R-X (CODE, EXECUTE, READ) |
| `.rdata` | Read-only data, imports, debug dir | R-- |
| `.data` | Initialized read/write data | RW- |
| `.bss` | Uninitialized data (no raw bytes) | RW- |
| `.idata` | Import tables (often folded into `.rdata`) | R-- |
| `.edata` | Export tables (often folded into `.rdata`) | R-- |
| `.rsrc` | Resources | R-- |
| `.reloc` | Base relocations | R-- (DISCARDABLE) |
| `.tls` | TLS template data | RW- |
| `.pdata` | Exception/unwind tables | R-- |

`Characteristics` flags of interest [1]: `IMAGE_SCN_CNT_CODE 0x20`,
`IMAGE_SCN_MEM_EXECUTE 0x20000000`, `IMAGE_SCN_MEM_READ 0x40000000`,
`IMAGE_SCN_MEM_WRITE 0x80000000`, `IMAGE_SCN_MEM_DISCARDABLE 0x02000000`.

### 6.2 Virtual size vs raw size [5]

- `SizeOfRawData > VirtualSize`: the real data is small but padded up to `FileAlignment`
  on disk.
- `VirtualSize > SizeOfRawData`: section reserves more memory than it stores on disk
  (uninitialized data / `.bss`-style expansion).

RE red flags: a section marked **writable AND executable** (`WX`), a `VirtualSize` hugely
larger than `SizeOfRawData` (room for unpacked code), high-entropy `.text`, or
unusual/random section names (`.UPX0`, `.themida`, `.vmp0`) signal packing/obfuscation.
Entry point landing in a writable section is another strong packer tell.

### 6.3 RVA -> file offset conversion [11]

An RVA is an offset from `ImageBase` once mapped. To read it from the file on disk you
must translate it through the section that contains it:

```
file_offset = (rva - section.VirtualAddress) + section.PointerToRawData
```

Algorithm: find the section where
`VirtualAddress <= rva < VirtualAddress + max(VirtualSize, SizeOfRawData)`, then apply the
formula. RVAs that fall inside the headers (below `SizeOfHeaders`) map 1:1 to file
offsets. An RVA matching no section usually means a malformed or crafted file.

Worked example (from a real PE32+ image [3]): `.text` at `VirtualAddress 0x1000`,
`PointerToRawData 0x400`. Entry point RVA `0x12C4` -> `0x12C4 - 0x1000 + 0x400 = 0x6C4`
file offset. Virtual addr = `ImageBase + 0x12C4`.
