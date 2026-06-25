# Symbol Recovery: FLIRT, PDB Symbols & Type Libraries

TL;DR: The recovery pipeline order, FLIRT/FunctionID for statically-linked library identification, PDB symbol servers, Lumina, and type libraries (.til/GDT) for IDA and Ghidra.
See also: `symbols-demangling-structs-bindiff.md`

---

## 0. The Recovery Pipeline (Order Matters)

Do these in order. Each step makes the next cheaper because IDA/Ghidra propagate information forward.

| # | Step | Why first |
|---|------|-----------|
| 1 | Identify & name library functions (FLIRT / FunctionID) | Removes 50-95% of functions from your workload [1] |
| 2 | Apply public symbols (PDB / Lumina / diffing) | Free names for OS + matching binaries |
| 3 | Import type libraries (.til / GDT) + API prototypes | Argument names/types propagate from API calls |
| 4 | Demangle C++ names, parse RTTI, rebuild vtables | Recovers class structure |
| 5 | Reconstruct structs from access patterns | Turns `*(a1+8)` into `cfg->timeout` |
| 6 | Recover function signatures (params, calling conv) | Fixes `__fastcall(a1,a2)` noise |
| 7 | Recognize STL containers (string/vector/map) | Collapses dozens of lines into one |
| 8 | Rename, retype, comment, propagate | The actual readability payoff |

Library functions can be 50% of a real program and up to 95% in trivial ones, so step 1 is the single highest-leverage action [1].

---

## 1. Identifying Statically-Linked Library Functions

### FLIRT (IDA -- Fast Library Identification and Recognition Technology)

FLIRT matches functions against precomputed signatures built from the original static libraries. A signature is a pattern of the first 32 bytes with variable bytes (relocations) masked out, plus a CRC16 over the tail and a length, to disambiguate collisions [1].

```
.lib / .a  ->  pelf/pcf/plb (FLAIR parser)  ->  .pat  ->  sigmake  ->  .sig
```

- FLAIR tools parse object/archive formats into `.pat` pattern files; `sigmake` compiles `.pat` -> `.sig` [1].
- Collisions during `sigmake` produce an `.exc` file you resolve by hand.
- Load via **File -> Load file -> FLIRT signature file**. IDA ships with sigs for common runtimes [1].
- FLARE's `idb2pat`/IDAPython scripts generate FLAIR patterns straight from an already-analyzed IDB [6].
- YARA-driven generation (`autoyara4FLIRT`) helps build sigs for stripped ELF malware [5].

### Ghidra FunctionID

Ghidra's equivalent. FID databases hash function bodies (full hash + specific hash that ignores operands) and store them in a `.fidb`. Apply via the **Function ID** analyzer.

### Why STL/Boost defeat signatures

Template-heavy libraries are instantiated at compile time, so the same logical function differs per type parameter. FLIRT-style byte signatures rarely match them [7]. Use type/struct recovery (section 7) instead.

---

## 2. Public Symbols: PDB Symbol Server & Lumina

### Microsoft public symbol server

Windows system binaries have downloadable PDBs. The PDB filename + GUID is embedded in the PE debug directory, so tools fetch the exact match [5].

Symbol path:
```
SRV*C:\symbols*https://msdl.microsoft.com/download/symbols
```

- **IDA**: configure the `_NT_SYMBOL_PATH` env var / `pdb` plugin [10].
- **Ghidra**: **File -> Download PDB File**, or set the symbol server URL in the PDB analyzer [3][9].

### Lumina (IDA, Hex-Rays hosted)

Crowdsourced function metadata keyed by a hash of the function. **Push** your named functions to the server; **pull** to auto-name matching functions in other binaries. Great for popular libraries and malware families others have already reversed.

---

## 3. Type Libraries & API Prototypes (.til / GDT)

### IDA -- Type Information Libraries (.til)

- Load C headers via **File -> Load file -> Parse C header file**.
- Prebuilt `.til` files ship for Win32, POSIX, VC++ runtimes.
- **IDAClang** parses real headers into `.til` [2].

Once a function is typed (e.g. an imported `CreateFileW`), IDA propagates the parameter names and types into every caller's decompilation.

### Ghidra -- Ghidra Data Types (GDT)

- GDT archives are Ghidra's type libraries. Apply via the **Data Type Manager**.
- Build custom GDTs by parsing headers: **File -> Parse C Source**, save as a `.gdt` [4].
