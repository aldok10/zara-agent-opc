# PE Imports, Exports, and Relocations/TLS

TL;DR: PE import tables (IAT/ILT, bound imports, delay imports), export tables
(EAT, forwarding, mangling), base relocations, and TLS callbacks.

Cross-reference: See also `pe-headers-nt-sections.md`, `pe-resources-debug-tools.md` in this directory.

---

## 7. Imports -- what the binary calls

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

- **ILT** (Import Lookup Table, a.k.a. INT / Import Name Table) at `OriginalFirstThunk` --
  the immutable "what to import" list.
- **IAT** (Import Address Table) at `FirstThunk` -- identical to the ILT on disk, but the
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

Worked example [4]: `USER32.dll` descriptor -> follow `OriginalFirstThunk` to a single
64-bit thunk whose MSB is clear, pointing at RVA `0x29F8` -> `Hint = 0x283`, name
`MessageBoxA`.

RE relevance:
- The import list is a behavioral fingerprint: `VirtualAllocEx` + `WriteProcessMemory` +
  `CreateRemoteThread` screams process injection; `InternetOpenUrlA` + `WinHttpConnect`
  signal C2; `CryptEncrypt` + `FindFirstFile` suggest ransomware.
- A near-empty import table (only `LoadLibrary` + `GetProcAddress`, or just
  `kernel32!GetProcAddress`) means imports are resolved dynamically at runtime -- a packer
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
normal IAT and may be missed by static import listing -- check the delay directory
explicitly.

---

## 8. Exports -- what a DLL provides

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

By name: binary-search `AddressOfNames[i]` for the string -> take `idx =
AddressOfNameOrdinals[i]` -> `func_rva = AddressOfFunctions[idx]`.

By ordinal: `func_rva = AddressOfFunctions[ordinal - Base]`. Note the **ordinal base
subtraction** -- if `Base = 1`, ordinal 1 maps to EAT index 0 [14][15]. This is exactly
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
is a string, not an address -- chasing it as code is a common mistake.

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

Example [6]: a block of `SizeOfBlock = 0x28` -> `0x28 - 8 = 0x20` bytes of entries -> 16
WORD entries. RE relevance: a stripped `.reloc` (no relocations) forces the image to a
fixed base, easing static analysis; many EXEs strip relocs, DLLs rarely can.

### 9.2 TLS directory and callbacks [16][17]

TLS (Data Directory 9) provides per-thread storage, but its security significance is the
**callback array** -- code that runs **before** `AddressOfEntryPoint` [16][17][18]:

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
