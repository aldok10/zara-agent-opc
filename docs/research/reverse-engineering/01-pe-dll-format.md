# Windows PE / DLL File Format — Reverse Engineering Reference

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
- Powerful for malware clustering and attribution — same toolchain leaves identical Rich
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

### 4.1 File Header (COFF) — 20 bytes [3]

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
| `AddressOfEntryPoint` | **RVA of entry point.** For an EXE → start of execution. For a DLL → `DllMain` thunk, and may be `0` (no entry). |
| `BaseOfCode` | RVA of the code section. |
| `BaseOfData` | PE32 only — dropped in PE32+. |

Windows-specific fields:

| Field | RE meaning |
|-------|------------|
| `ImageBase` | Preferred load address. Common defaults: `0x400000` (EXE), `0x10000000` (DLL), `0x180000000` (64-bit). With ASLR rarely honored → relocations applied. |
| `SectionAlignment` | In-memory alignment (usually `0x1000`, one page). |
| `FileAlignment` | On-disk alignment (usually `0x200` = 512). |
| `SizeOfImage` | Total in-memory size, multiple of `SectionAlignment`. |
| `SizeOfHeaders` | All headers + section table, multiple of `FileAlignment`. |
| `CheckSum` | Validated for drivers / some signed images. |
| `Subsystem` | `2` = GUI, `3` = console, `1` = native/driver, `9`+ = EFI. |
| `DllCharacteristics` | Mitigation flags (see below) — despite the name, applies to EXEs too. |
| `NumberOfRvaAndSizes` | Entry count of the Data Directory array (normally 16). |
| `DataDirectory[16]` | Array of `(RVA, Size)` locators (see §5). |

`DllCharacteristics` mitigation flags [1] — directly relevant to exploit/RE work:

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
| 1 | IMPORT | `.idata`/`.rdata` | External APIs the image calls (§7) — behavioral fingerprint. |
| 2 | RESOURCE | `.rsrc` | Icons, strings, manifest, version info, embedded payloads (§10). |
| 3 | EXCEPTION | `.pdata` | x64/ARM unwind info (`RUNTIME_FUNCTION`). |
| 4 | SECURITY | (overlay) | Authenticode signature (file offset, **not** an RVA). |
| 5 | BASERELOC | `.reloc` | Base relocation table (§9). |
| 6 | DEBUG | `.rdata` | Debug dir → PDB path, build GUID/age (§11). |
| 7 | ARCHITECTURE | — | Reserved (was x86 copyright). |
| 8 | GLOBALPTR | — | RVA of global pointer (Itanium). |
| 9 | TLS | `.tls` | Thread-local storage + **TLS callbacks** (§9.2). |
| 10 | LOAD_CONFIG | `.rdata` | SafeSEH list, CFG tables, security cookie. |
| 11 | BOUND_IMPORT | (headers) | Bound import timestamps (§7.3). |
| 12 | IAT | `.idata`/`.rdata` | Direct pointer/size of the Import Address Table. |
| 13 | DELAY_IMPORT | `.rdata` | Delay-loaded DLL descriptors (§7.4). |
| 14 | COM_DESCRIPTOR | `.cor`/`.text` | `.NET`/CLR header — managed assembly marker. |
| 15 | — | — | Reserved, must be zero. |

A `(0,0)` entry means that directory is absent. The `COM_DESCRIPTOR` being non-zero
immediately tells you this is a .NET image and you should switch to a CLR-aware tool
(dnSpy/ILSpy) rather than a native disassembler.

---

## 6. Sections, alignment, RVA ↔ file offset

### 6.1 Section header — 40 bytes [5]

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

### 6.3 RVA → file offset conversion [11]

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
`PointerToRawData 0x400`. Entry point RVA `0x12C4` → `0x12C4 - 0x1000 + 0x400 = 0x6C4`
file offset. Virtual addr = `ImageBase + 0x12C4`.

---

## 7. Imports — what the binary calls

The single most informative structure for behavioral triage: it lists every external API
the image binds to [4][6].

### 7.1 Import Directory Table

Array of `IMAGE_IMPORT_DESCRIPTOR`, one per imported DLL, terminated by an all-zero entry
(Data Directory index 1) [4]:

```c
typedef struct _IMAGE_IMPORT_DESCRIPTOR {
    union { DWORD Characteristics; DWORD OriginalFirstThunk; }; // RVA of ILT/INT
    DWORD TimeDateStamp;   // 0 = not bound; -1 = bound (real stamp in bound dir)
    DWORD ForwarderChain;  // forwarder index
    DWORD Name;            // RVA of ASCII DLL name, e.g. "USER32.dll"
    DWORD FirstThunk;      // RVA of the IAT
} IMAGE_IMPORT_DESCRIPTOR;
```

### 7.2 ILT / INT and IAT [4][6][9]

Each descriptor references two parallel arrays of thunks (32-bit for PE32, 64-bit for
PE32+), each terminated by a zero entry:

- **ILT** (Import Lookup Table, a.k.a. INT / Import Name Table) at `OriginalFirstThunk` —
  the immutable "what to import" list.
- **IAT** (Import Address Table) at `FirstThunk` — identical to the ILT on disk, but the
  loader **overwrites each slot with the resolved function address** at load time [6].

Thunk encoding:
- **MSB set** (bit 31 PE32 / bit 63 PE32+): import **by ordinal**; low 16 bits are the
  ordinal number.
- **MSB clear**: low 31 bits are an RVA to an `IMAGE_IMPORT_BY_NAME`:

```c
typedef struct _IMAGE_IMPORT_BY_NAME {
    WORD Hint;     // index hint into the target's export name table
    CHAR Name[1];  // null-terminated function name, e.g. "MessageBoxA"
} IMAGE_IMPORT_BY_NAME;
```

Worked example [4]: `USER32.dll` descriptor → follow `OriginalFirstThunk` to a single
64-bit thunk whose MSB is clear, pointing at RVA `0x29F8` → `Hint = 0x283`, name
`MessageBoxA`.

RE relevance:
- The import list is a behavioral fingerprint: `VirtualAllocEx` + `WriteProcessMemory` +
  `CreateRemoteThread` screams process injection; `InternetOpenUrlA` + `WinHttpConnect`
  signal C2; `CryptEncrypt` + `FindFirstFile` suggest ransomware.
- A near-empty import table (only `LoadLibrary` + `GetProcAddress`, or just
  `kernel32!GetProcAddress`) means imports are resolved dynamically at runtime — a packer
  / shellcode loader hallmark. Reconstruct the real IAT after unpacking.
- **Ordinal-only imports** hide function names; you must resolve them against the target
  DLL's export table by ordinal (§8).
- At runtime, breakpointing on IAT slots is a cheap way to trace API usage.

### 7.3 Bound imports [4]

To save loader work, the linker can pre-resolve addresses and stamp them in. Then the
descriptor's `TimeDateStamp = -1` and `IMAGE_BOUND_IMPORT_DESCRIPTOR` entries (Data
Directory 11) carry the real DLL timestamps. If the bound addresses no longer match
(different DLL version), the loader re-resolves and fixes the IAT.

### 7.4 Delay imports [5][9]

`IMAGE_DELAYLOAD_DESCRIPTOR` (Data Directory 13). The DLL is **not** loaded until the
first call to one of its functions; a helper stub (`__delayLoadHelper2`) does a
`LoadLibrary` + `GetProcAddress` on demand. RE relevance: APIs here won't appear in the
normal IAT and may be missed by static import listing — check the delay directory
explicitly.

---

## 8. Exports — what a DLL provides

Critical for DLLs. Data Directory 0 points at one `IMAGE_EXPORT_DIRECTORY` [5][9][12]:

```c
typedef struct _IMAGE_EXPORT_DIRECTORY {
    DWORD Characteristics;
    DWORD TimeDateStamp;
    WORD  MajorVersion;
    WORD  MinorVersion;
    DWORD Name;                  // RVA of ASCII DLL name
    DWORD Base;                  // ordinal base (often 1)
    DWORD NumberOfFunctions;     // count of EAT entries
    DWORD NumberOfNames;         // count of named exports (<= NumberOfFunctions)
    DWORD AddressOfFunctions;    // RVA -> EAT  (Export Address Table)
    DWORD AddressOfNames;        // RVA -> ENT  (Export Name Pointer Table)
    DWORD AddressOfNameOrdinals; // RVA -> ordinal table (WORDs)
} IMAGE_EXPORT_DIRECTORY;
```

Three parallel arrays [12][13]:

- **EAT** (`AddressOfFunctions`): `NumberOfFunctions` DWORD RVAs to exported code/data.
  Indexed by `ordinal - Base`.
- **ENT** (`AddressOfNames`): `NumberOfNames` RVAs to null-terminated names, **sorted**
  for binary search.
- **Ordinal table** (`AddressOfNameOrdinals`): `NumberOfNames` WORDs; the i-th entry is
  the EAT index for the i-th name.

### 8.1 Resolution algorithms [12][14]

By name: binary-search `AddressOfNames[i]` for the string → take `idx =
AddressOfNameOrdinals[i]` → `func_rva = AddressOfFunctions[idx]`.

By ordinal: `func_rva = AddressOfFunctions[ordinal - Base]`. Note the **ordinal base
subtraction** — if `Base = 1`, ordinal 1 maps to EAT index 0 [14][15]. This is exactly
how `GetProcAddress` works internally, and how the loader resolves an importer's
ordinal-only imports.

Not every exported function has a name: functions present in the EAT but absent from the
ENT are **export-by-ordinal only**. Reversers must match these by ordinal against the
importer's thunks.

### 8.2 Export forwarding [4][9]

If an EAT entry's RVA points **inside the export directory's own range**, it is not code
but a forwarder string of the form `"OTHERDLL.FunctionName"` or `"NTDLL.#123"`. The loader
transparently redirects the import to that other module. Classic example:
`kernel32!HeapAlloc` forwards to `ntdll!RtlAllocateHeap`. RE relevance: a forwarder export
is a string, not an address — chasing it as code is a common mistake.

### 8.3 Name mangling (decoration)

Exported C++ symbols are **mangled** to encode signatures:
- **MSVC**: names like `?func@Class@@QAEHXZ` (leading `?`, `@@` separators). Demangle with
  `undname.exe` or `dumpbin /EXPORTS` (the `UnDecorateSymbolName` API).
- **Itanium/GCC/Clang** (MinGW, cross builds): names like `_ZN5Class4funcEv` (leading
  `_Z`). Demangle with `c++filt`.
- `extern "C"` exports are undecorated (or just leading `_` + `@N` stdcall suffix on x86).

A `.def` file or `dllexport` controls which symbols land in the export table. The
companion **import library** (`.lib`) produced alongside a DLL is an archive of tiny
import thunks that the linker uses so an EXE can bind to the DLL's exports at link time.

---

## 9. Relocations, TLS callbacks

### 9.1 Base relocations [6]

When the image can't load at its preferred `ImageBase` (ASLR, conflict), every hardcoded
absolute address must be patched by the **delta** `actual_base - preferred_base`. The
`.reloc` section (Data Directory 5) lists what to fix, grouped per 4 KB page [6]:

```c
typedef struct _IMAGE_BASE_RELOCATION {
    DWORD VirtualAddress;  // RVA of the 4K page this block covers
    DWORD SizeOfBlock;     // total bytes incl. this header
} IMAGE_BASE_RELOCATION;   // followed by (SizeOfBlock-8)/2 WORD entries
```

Each trailing WORD: high 4 bits = relocation **type**, low 12 bits = offset within the
page. Common types [1]: `IMAGE_REL_BASED_ABSOLUTE 0` (padding/no-op),
`IMAGE_REL_BASED_HIGHLOW 3` (32-bit, the usual x86 type), `IMAGE_REL_BASED_DIR64 10`
(64-bit, the usual x64 type). Target address = `ImageBase + block.VirtualAddress +
entry.offset` [6].

Example [6]: a block of `SizeOfBlock = 0x28` → `0x28 - 8 = 0x20` bytes of entries → 16
WORD entries. RE relevance: a stripped `.reloc` (no relocations) forces the image to a
fixed base, easing static analysis; many EXEs strip relocs, DLLs rarely can.

### 9.2 TLS directory and callbacks [16][17]

TLS (Data Directory 9) provides per-thread storage, but its security significance is the
**callback array** — code that runs **before** `AddressOfEntryPoint` [16][17][18]:

```c
typedef struct _IMAGE_TLS_DIRECTORY64 {
    ULONGLONG StartAddressOfRawData;
    ULONGLONG EndAddressOfRawData;
    ULONGLONG AddressOfIndex;
    ULONGLONG AddressOfCallBacks;  // -> null-terminated array of PIMAGE_TLS_CALLBACK
    DWORD     SizeOfZeroFill;
    DWORD     Characteristics;
} IMAGE_TLS_DIRECTORY64;
```

`AddressOfCallBacks` points to a null-terminated array of function pointers. Each is
invoked by the loader on process start (and thread create/exit) **before** the official
entry point [16][18]. RE relevance:
- Classic **anti-debug / anti-analysis** trick: malware places unpacking, debugger
  detection, or even its whole payload in a TLS callback so a debugger that breaks on the
  entry point has already been bypassed [16][17][19].
- Also abused for **process injection** (MITRE T1055.005) [18].
- Always enumerate TLS callbacks before trusting the entry point. Set breakpoints on each
  callback; tools like x64dbg can auto-stop on TLS callbacks.

---

## 10. Resources and manifest

The `.rsrc` section (Data Directory 2) is a tree of `IMAGE_RESOURCE_DIRECTORY` nodes:
three conventional levels — **Type** (icon, string, RT_MANIFEST, RT_VERSION, RT_RCDATA…),
then **Name/ID**, then **Language** — with leaves pointing at
`IMAGE_RESOURCE_DATA_ENTRY { DWORD OffsetToData; DWORD Size; ... }` whose `OffsetToData`
is an RVA to the raw bytes [1][7].

RE relevance:
- **Embedded payloads**: droppers stash a second-stage EXE/DLL as `RT_RCDATA` or a custom
  type. Look for an `MZ`/`PE` signature inside resource blobs.
- **Version info** (`RT_VERSION` → `VS_FIXEDFILEINFO`): company, product, original
  filename, version — frequently spoofed to impersonate legit software.
- **Manifest** (`RT_MANIFEST`, ID 1/2/3): XML declaring `requestedExecutionLevel`
  (`asInvoker` / `requireAdministrator`), `dpiAware`, and assembly dependencies. Tells you
  whether the binary wants elevation.
- High-entropy or oversized resources suggest encrypted/compressed embedded data.

---

## 11. Debug directory and PDB

Data Directory 6 → array of `IMAGE_DEBUG_DIRECTORY`. The common `IMAGE_DEBUG_TYPE_CODEVIEW`
(type 2) entry carries an `RSDS` record: a **PDB GUID + age + PDB path** [1][7]. RE
relevance:
- The embedded PDB path can leak the developer's build directory, project name, even
  usernames (`C:\Users\dev\source\repos\implant\x64\Release\implant.pdb`).
- The GUID+age is the symbol-server key — match it to pull public symbols.
- Build IDs link related samples. Stripped/zeroed debug dirs are common in malware but the
  RSDS path is a frequent OPSEC failure.

---

## 12. DLL specifics

| Concern | Detail |
|---------|--------|
| Identity | `IMAGE_FILE_DLL` (0x2000) set in `File Header.Characteristics`. |
| Entry point | `AddressOfEntryPoint` → `DllMain`. May be `0` (no init code). |
| `DllMain` | Called with `DLL_PROCESS_ATTACH` / `_DETACH` / `THREAD_ATTACH` / `_DETACH`. Loader-lock context — minimal work expected; malware that does heavy work here is noisy/suspicious. |
| Exports | The DLL's reason to exist — see §8. Named + ordinal. |
| Forwarding | Re-export to another DLL via `"DLL.Func"` strings (§8.2). |
| Import library | `.lib` archive of import thunks; links an EXE against the DLL's exports. |
| Mangling | MSVC `?...@@...` vs Itanium `_Z...`; `extern "C"` undecorated (§8.3). |
| Load methods | Static (import table) vs dynamic (`LoadLibrary`+`GetProcAddress`) vs delay-load (§7.4). |
| Hijacking surface | Search-order and phantom DLL hijacking exploit how the loader resolves DLL names; exported function set + forwarders define the attack interface. |

A DLL exporting a single odd function plus a populated TLS callback, or exporting names
that match a known legit DLL while forwarding elsewhere, are classic proxy/sideloading
patterns.

---

## 13. Tools

| Tool | Use | Notes |
|------|-----|-------|
| `dumpbin` (MSVC) | `/HEADERS /IMPORTS /EXPORTS /RELOCATIONS /DIRECTIVES` | Ships with Visual Studio; text output, scriptable. |
| **CFF Explorer** | GUI structure editor | Edits headers, rebuilds imports, hex view. |
| **PE-bear** (hasherezade) | GUI analysis | Parses Rich Header, imports/exports, sections; great for learning [2]. |
| **PEview / PEstudio** | GUI triage | PEstudio flags suspicious imports/indicators. |
| **pefile** (Python) | Scripted parsing | `pe.OPTIONAL_HEADER`, `pe.DIRECTORY_ENTRY_IMPORT`, `pe.DIRECTORY_ENTRY_EXPORT`, `pe.get_offset_from_rva()` [9]. |
| **LIEF** (Py/C++/Rust) | Parse **and rebuild** | Abstracts PE/ELF/Mach-O; can add/modify imports, rewrite binaries [10]. |
| **Ghidra / IDA / radare2** | Disassembly | Auto-parse all of the above; IDA/Ghidra apply symbols from PDB. |
| `x64dbg` | Dynamic | Auto-breaks on TLS callbacks and entry point; IAT tracing. |

### 13.1 Quick recipes

```bash
# Imports / exports / headers (MSVC dev prompt)
dumpbin /IMPORTS target.dll
dumpbin /EXPORTS target.dll
dumpbin /HEADERS /RELOCATIONS target.exe
```

```python
# pefile: enumerate imports, exports, TLS callbacks, convert an RVA
import pefile
pe = pefile.PE("target.dll")
print(hex(pe.OPTIONAL_HEADER.AddressOfEntryPoint), hex(pe.OPTIONAL_HEADER.ImageBase))
for imp in pe.DIRECTORY_ENTRY_IMPORT:
    print(imp.dll.decode())
    for fn in imp.imports:
        print("  ", fn.name or f"ordinal {fn.ordinal}", hex(fn.address))
if hasattr(pe, "DIRECTORY_ENTRY_EXPORT"):
    for e in pe.DIRECTORY_ENTRY_EXPORT.symbols:
        print(e.name, "ord", e.ordinal, hex(e.address))
if hasattr(pe, "DIRECTORY_ENTRY_TLS") and pe.DIRECTORY_ENTRY_TLS.struct.AddressOfCallBacks:
    print("TLS callbacks present")  # enumerate before trusting the entry point
print("file offset of EP:", hex(pe.get_offset_from_rva(pe.OPTIONAL_HEADER.AddressOfEntryPoint)))
```

```python
# LIEF: parse + modify
import lief
b = lief.parse("target.dll")
print(b.header.machine, b.optional_header.magic)
for lib in b.imports:
    print(lib.name, [f.name for f in lib.entries])
```

---

## 14. Analyst triage checklist

1. `MZ` at 0x00, follow `e_lfanew` (0x3C) to `PE\0\0`. Malformed → crafted/packed.
2. `Optional Header.Magic` for true bitness; `File Header.Machine` for arch; `IMAGE_FILE_DLL` for type.
3. Rich Header → toolchain fingerprint (spoofable; cluster, don't trust blindly).
4. Section table: WX sections, `VirtualSize` >> `SizeOfRawData`, weird names, high entropy → packing.
5. Import table: behavioral profile; tiny imports → dynamic resolution / packer.
6. Export table (DLLs): named vs ordinal-only, forwarders.
7. **TLS callbacks**: enumerate and breakpoint before the entry point.
8. Relocations present? Affects whether base is fixed for static analysis.
9. Resources: embedded `MZ`/`PE`, manifest elevation, spoofed version info.
10. Debug dir: leaked PDB path / build GUID.
11. Authenticode (Security dir, file offset): signed? valid? who?
12. Overlay past last section: appended payload / installer data / signature.

---

## Sources

1. Microsoft, "PE Format" (official PE/COFF specification) — https://learn.microsoft.com/en-us/windows/win32/debug/pe-format
2. 0xRick, "A dive into the PE file format — Part 1: Overview" — https://0xrick.github.io/win-internals/pe2/
3. 0xRick, "Part 2: DOS Header, DOS Stub and Rich Header" — https://0xrick.github.io/win-internals/pe3/
4. 0xRick, "Part 3: NT Headers" — https://0xrick.github.io/win-internals/pe4/
5. 0xRick, "Part 4: Data Directories, Section Headers and Sections" — https://0xrick.github.io/win-internals/pe5/
6. 0xRick, "Part 5: PE Imports (Import Directory Table, ILT, IAT)" — https://0xrick.github.io/win-internals/pe6/
7. 0xRick, "Part 6: PE Base Relocations" — https://0xrick.github.io/win-internals/pe7/
8. Matt Pietrek, "Inside Windows: Win32 Portable Executable File Format in Detail", MSDN Magazine — https://learn.microsoft.com/en-us/archive/msdn-magazine/2002/february/inside-windows-win32-portable-executable-file-format-in-detail
9. corkami, "PE101" visual PE walkthrough — https://github.com/corkami/pics/blob/master/binary/pe101/README.md
10. pefile documentation (Ero Carrera) — https://github.com/erocarrera/pefile
11. LIEF, "PE imports modification" — https://lief.re/doc/latest/formats/pe/modifications/imports.html
12. cnblogs/peanut, "Rva2Offset" conversion reference — https://www.cnblogs.com/peanut/p/1083597.html
13. windows-docs-rs, `IMAGE_EXPORT_DIRECTORY` definition — https://microsoft.github.io/windows-docs-rs/doc/windows/Win32/System/SystemServices/struct.IMAGE_EXPORT_DIRECTORY.html
14. InfoSec Institute, "The export directory" — https://www.infosecinstitute.com/resources/reverse-engineering/the-export-directory/
15. Reverse Engineering SE, "Base field in the PE Export Directory" — https://reverseengineering.stackexchange.com/q/22918
16. InfoSec Institute, "Debugging TLS callbacks" — https://prep.infosecinstitute.com/resources/reverse-engineering/debugging-tls-callbacks/
17. RingZero Labs, "Analyzing TLS Callbacks" — https://www.ringzerolabs.com/2019/08/analyzing-tls-callbacks.html
18. MITRE ATT&CK, "Process Injection: Thread Local Storage (T1055.005)" — https://attack.mitre.org/techniques/T1055/005
19. Unprotect Project, "TLS Callback" anti-debug technique — https://unprotect.it/technique/tls-callback/
