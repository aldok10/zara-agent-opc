# Subskill: PE/DLL Format

Scope: read a PE/DLL's structure, especially exports (the API surface) and imports (capabilities).

## Fast facts
- PE32 (`magic 0x10b`) vs PE32+ (`0x20b`, 64-bit). `IMAGE_FILE_DLL` = Characteristics & 0x2000.
- Data directories: index **0** = Export table, **1** = Import table, **14** = CLR header (.NET marker).
- RVA→file offset: find the section whose `[VirtualAddress, VirtualAddress+VirtualSize)` contains the
  RVA, then `fileOffset = RVA - VirtualAddress + PointerToRawData`.

## Exports (the rebuild target)
Export Directory layout (offsets from directory start): `+0x10` OrdinalBase, `+0x14` NumberOfFunctions
(EAT), `+0x18` NumberOfNames (ENT), `+0x1c` AddressOfFunctions, `+0x20` AddressOfNames, `+0x24`
AddressOfNameOrdinals. A function RVA that falls *inside* the export directory range is a **forwarder**
("OTHERDLL.Func"). Our `dllscan` parses all of this; `rabin2 -E` confirms.

## Imports → capabilities
`rabin2 -i` / `dumpbin /imports`. The imported API names reveal what the binary can do (WS2_32 →
network, CRYPT32 → crypto, etc.). `dllscan` prints a capability profile automatically.

## Tools
`dllscan <dll>` (ours, fastest), `rabin2 -I/-i/-E`, `dumpbin /headers /exports /imports`, `pefile`, LIEF.

## Knowledge
`knowledge_read("pe-dll-format.md")` (deep), `knowledge_read("dll-exports-interop.md")`.

## Routing
Upstream: triage. Downstream: dll-interop, native-decompile, dotnet-decompile.
