# PE Resources, Debug Directory, DLL Specifics, and Tools

TL;DR: PE resource tree (.rsrc), debug directory (PDB path), DLL-specific concerns,
PE analysis tools (dumpbin, pefile, LIEF, CFF Explorer), and analyst triage checklist.

Cross-reference: See also `pe-headers-nt-sections.md`, `pe-imports-exports-relocs.md` in this directory.

---

## 10. Resources and manifest

The `.rsrc` section (Data Directory 2) is a tree of `IMAGE_RESOURCE_DIRECTORY` nodes:
three conventional levels -- **Type** (icon, string, RT_MANIFEST, RT_VERSION, RT_RCDATA...),
then **Name/ID**, then **Language** -- with leaves pointing at
`IMAGE_RESOURCE_DATA_ENTRY { DWORD OffsetToData; DWORD Size; ... }` whose `OffsetToData`
is an RVA to the raw bytes [1][7].

RE relevance:
- **Embedded payloads**: droppers stash a second-stage EXE/DLL as `RT_RCDATA` or a custom
  type. Look for an `MZ`/`PE` signature inside resource blobs.
- **Version info** (`RT_VERSION` -> `VS_FIXEDFILEINFO`): company, product, original
  filename, version -- frequently spoofed to impersonate legit software.
- **Manifest** (`RT_MANIFEST`, ID 1/2/3): XML declaring `requestedExecutionLevel`
  (`asInvoker` / `requireAdministrator`), `dpiAware`, and assembly dependencies. Tells you
  whether the binary wants elevation.
- High-entropy or oversized resources suggest encrypted/compressed embedded data.

---

## 11. Debug directory and PDB

Data Directory 6 -> array of `IMAGE_DEBUG_DIRECTORY`. The common `IMAGE_DEBUG_TYPE_CODEVIEW`
(type 2) entry carries an `RSDS` record: a **PDB GUID + age + PDB path** [1][7]. RE
relevance:
- The embedded PDB path can leak the developer's build directory, project name, even
  usernames (`C:\Users\dev\source\repos\implant\x64\Release\implant.pdb`).
- The GUID+age is the symbol-server key -- match it to pull public symbols.
- Build IDs link related samples. Stripped/zeroed debug dirs are common in malware but the
  RSDS path is a frequent OPSEC failure.

---

## 12. DLL specifics

| Concern | Detail |
|---------|--------|
| Identity | `IMAGE_FILE_DLL` (0x2000) set in `File Header.Characteristics`. |
| Entry point | `AddressOfEntryPoint` -> `DllMain`. May be `0` (no init code). |
| `DllMain` | Called with `DLL_PROCESS_ATTACH` / `_DETACH` / `THREAD_ATTACH` / `_DETACH`. Loader-lock context -- minimal work expected; malware that does heavy work here is noisy/suspicious. |
| Exports | The DLL's reason to exist -- see §8. Named + ordinal. |
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

1. `MZ` at 0x00, follow `e_lfanew` (0x3C) to `PE\0\0`. Malformed -> crafted/packed.
2. `Optional Header.Magic` for true bitness; `File Header.Machine` for arch; `IMAGE_FILE_DLL` for type.
3. Rich Header -> toolchain fingerprint (spoofable; cluster, don't trust blindly).
4. Section table: WX sections, `VirtualSize` >> `SizeOfRawData`, weird names, high entropy -> packing.
5. Import table: behavioral profile; tiny imports -> dynamic resolution / packer.
6. Export table (DLLs): named vs ordinal-only, forwarders.
7. **TLS callbacks**: enumerate and breakpoint before the entry point.
8. Relocations present? Affects whether base is fixed for static analysis.
9. Resources: embedded `MZ`/`PE`, manifest elevation, spoofed version info.
10. Debug dir: leaked PDB path / build GUID.
11. Authenticode (Security dir, file offset): signed? valid? who?
12. Overlay past last section: appended payload / installer data / signature.

---

## Sources

1. Microsoft, "PE Format" (official PE/COFF specification) -- https://learn.microsoft.com/en-us/windows/win32/debug/pe-format
2. 0xRick, "A dive into the PE file format -- Part 1: Overview" -- https://0xrick.github.io/win-internals/pe2/
3. 0xRick, "Part 2: DOS Header, DOS Stub and Rich Header" -- https://0xrick.github.io/win-internals/pe3/
4. 0xRick, "Part 3: NT Headers" -- https://0xrick.github.io/win-internals/pe4/
5. 0xRick, "Part 4: Data Directories, Section Headers and Sections" -- https://0xrick.github.io/win-internals/pe5/
6. 0xRick, "Part 5: PE Imports (Import Directory Table, ILT, IAT)" -- https://0xrick.github.io/win-internals/pe6/
7. 0xRick, "Part 6: PE Base Relocations" -- https://0xrick.github.io/win-internals/pe7/
8. Matt Pietrek, "Inside Windows: Win32 Portable Executable File Format in Detail", MSDN Magazine -- https://learn.microsoft.com/en-us/archive/msdn-magazine/2002/february/inside-windows-win32-portable-executable-file-format-in-detail
9. corkami, "PE101" visual PE walkthrough -- https://github.com/corkami/pics/blob/master/binary/pe101/README.md
10. pefile documentation (Ero Carrera) -- https://github.com/erocarrera/pefile
11. LIEF, "PE imports modification" -- https://lief.re/doc/latest/formats/pe/modifications/imports.html
12. cnblogs/peanut, "Rva2Offset" conversion reference -- https://www.cnblogs.com/peanut/p/1083597.html
13. windows-docs-rs, `IMAGE_EXPORT_DIRECTORY` definition -- https://microsoft.github.io/windows-docs-rs/doc/windows/Win32/System/SystemServices/struct.IMAGE_EXPORT_DIRECTORY.html
14. InfoSec Institute, "The export directory" -- https://www.infosecinstitute.com/resources/reverse-engineering/the-export-directory/
15. Reverse Engineering SE, "Base field in the PE Export Directory" -- https://reverseengineering.stackexchange.com/q/22918
16. InfoSec Institute, "Debugging TLS callbacks" -- https://prep.infosecinstitute.com/resources/reverse-engineering/debugging-tls-callbacks/
17. RingZero Labs, "Analyzing TLS Callbacks" -- https://www.ringzerolabs.com/2019/08/analyzing-tls-callbacks.html
18. MITRE ATT&CK, "Process Injection: Thread Local Storage (T1055.005)" -- https://attack.mitre.org/techniques/T1055/005
19. Unprotect Project, "TLS Callback" anti-debug technique -- https://unprotect.it/technique/tls-callback/
