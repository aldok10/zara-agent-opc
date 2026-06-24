# Symbol & Type Recovery — Cleaning Up Decompiler Output

> Knowledge base reference. Goal: turn a stripped binary's raw decompiler
> output into code a programmer can actually read. Symbols, types, structs,
> vtables, and porting known symbols onto unknown binaries.

The end product of this whole discipline is readability. A function named
`sub_140012A0` with a parameter `a1` and locals `v3, v7, v12` tells you
nothing. The same function named `parse_config` with a `Config *cfg` argument
and a `std::string line` local tells you everything. Everything below is in
service of that transformation.

---

## 0. The Recovery Pipeline (Order Matters)

Do these in order. Each step makes the next cheaper because IDA/Ghidra
propagate information forward.

| # | Step | Why first |
|---|------|-----------|
| 1 | Identify & name library functions (FLIRT / FunctionID) | Removes 50–95% of functions from your workload [1] |
| 2 | Apply public symbols (PDB / Lumina / diffing) | Free names for OS + matching binaries |
| 3 | Import type libraries (.til / GDT) + API prototypes | Argument names/types propagate from API calls |
| 4 | Demangle C++ names, parse RTTI, rebuild vtables | Recovers class structure |
| 5 | Reconstruct structs from access patterns | Turns `*(a1+8)` into `cfg->timeout` |
| 6 | Recover function signatures (params, calling conv) | Fixes `__fastcall(a1,a2)` noise |
| 7 | Recognize STL containers (string/vector/map) | Collapses dozens of lines into one |
| 8 | Rename, retype, comment, propagate | The actual readability payoff |

Library functions can be 50% of a real program and up to 95% in trivial ones,
so step 1 is the single highest-leverage action [1].

---

## 1. Identifying Statically-Linked Library Functions

When a binary is statically linked, libc/MSVCRT/OpenSSL code is baked in with
no import names. You must fingerprint it.

### FLIRT (IDA — Fast Library Identification and Recognition Technology)

FLIRT matches functions against precomputed signatures built from the original
static libraries. A signature is a pattern of the first 32 bytes with variable
bytes (relocations) masked out, plus a CRC16 over the tail and a length, to
disambiguate collisions [1].

```
.lib / .a  →  pelf/pcf/plb (FLAIR parser)  →  .pat  →  sigmake  →  .sig
```

- FLAIR tools (`pelf`, `pcf`, `plb`, `ppc`...) parse object/archive formats
  into `.pat` pattern files; `sigmake` compiles `.pat` → `.sig` [1].
- Collisions during `sigmake` produce an `.exc` file you resolve by hand.
- Load via **File → Load file → FLIRT signature file**. IDA ships with sigs for
  common runtimes (VC++, Borland, glibc variants) [1].
- For Linux, signatures must match the exact libc build; community sets and
  generators exist for common distros [3].
- FLARE's `idb2pat`/IDAPython scripts generate FLAIR patterns straight from an
  already-analyzed IDB so you can reuse names across samples [6].
- YARA-driven generation (`autoyara4FLIRT`) helps build sigs for stripped ELF
  malware where you lack the original `.a` [5].

Tools: `idaflirt-detector` detects statically-linked libs in stripped ELF [8].

### Ghidra FunctionID

Ghidra's equivalent. FID databases hash function bodies (full hash + specific
hash that ignores operands) and store them in a `.fidb`. Apply via the
**Function ID** analyzer; generate from a library program with the FidDb
plugin. Good for matching whole library versions; weaker than FLIRT on
heavily-templated code.

### Why STL/Boost defeat signatures

Template-heavy libraries are instantiated at compile time, so the same logical
function differs per type parameter and per inline decision. FLIRT-style byte
signatures rarely match them [7]. Use type/struct recovery (section 7) instead.

---

## 2. Public Symbols: PDB Symbol Server & Lumina

### Microsoft public symbol server

Windows system binaries (ntdll, kernel32, the public bits of many components)
have downloadable PDBs. The PDB filename + GUID is embedded in the PE debug
directory, so tools fetch the exact match [5].

Symbol path:

```
https://msdl.microsoft.com/download/symbols
SRV*C:\symbols*https://msdl.microsoft.com/download/symbols
```

- **IDA**: configure the `_NT_SYMBOL_PATH` env var / `pdb` plugin; IDA pulls the
  matching PDB and applies names + types automatically [10].
- **Ghidra**: **File → Download PDB File**, or set the symbol server URL in the
  PDB analyzer, then **File → Load PDB File** [3][9].
- Public PDBs carry function names and some types but usually *not* private
  locals or full struct layouts for closed-source components.

### Lumina (IDA, Hex-Rays hosted)

Crowdsourced function metadata keyed by a hash of the function. **Push** your
named functions to the server; **pull** to auto-name matching functions in
other binaries. Public Lumina is shared; the Private Lumina add-on lets a team
keep an internal DB [10]. Great for popular libraries and malware families
others have already reversed.

---

## 3. Type Libraries & API Prototypes (.til / GDT)

Names alone are not enough; you want types so arguments self-document.

### IDA — Type Information Libraries (.til)

- **SDKs → Parse**: load C headers via **File → Load file → Parse C header
  file**, or maintain types in the **Local Types** window.
- Prebuilt `.til` files ship for Win32, POSIX, VC++ runtimes; load via
  **File → Load file → Type library** (or the TIL chooser, Shift+F11).
- **IDAClang** parses real headers (including generated ones) into `.til`.
  NVISO's workflow: MSVC converts a Windows `.tlb` → C++ headers → IDAClang
  → `.til` [2].
- Hexacorn's older trick builds `.idt`/`.ids` from MS libraries that import by
  ordinal, so even ordinal-only imports get named [7-style; 7 ref].

Once a function is typed (e.g. an imported `CreateFileW`), IDA propagates the
parameter names and types into every caller's decompilation.

### Ghidra — Ghidra Data Types (GDT)

- GDT archives are Ghidra's type libraries. Apply via the **Data Type Manager**.
- Ghidra ships GDTs for the Windows SDK, common C runtimes, etc.
- Build custom GDTs by parsing headers: **File → Parse C Source**, point it at
  SDK headers, save as a `.gdt`, then apply to your program [4].
- Use custom GDTs when a target uses a known third-party SDK whose headers you
  have but Ghidra doesn't ship [4].

---

## 4. Demangling C++ & Rebuilding Classes

### Demanglers

| ABI / Compiler | Mangling | Tool |
|----------------|----------|------|
| Itanium (GCC, Clang) | `_Z...` | `c++filt`, `__cxa_demangle`, `llvm-cxxfilt` [3][7] |
| MSVC | `?name@@...` | `undname.exe`, `UnDecorateSymbolName`, `dumpbin` (shows demangled in parens) [6][10] |

```bash
c++filt _ZN7android14BatteryService11cleanupImplEj
# android::BatteryService::cleanupImpl(unsigned int)

undname "?cleanupImpl@BatteryService@android@@QAEXI@Z"
```

IDA and Ghidra demangle automatically in the listing; the CLI tools matter when
you script symbol porting (you must add the *mangled* form back, see §6) [1 port].
Note MSVC mangling encodes the calling convention, class, return type, and
parameter types, so a demangled MSVC name gives you a full signature for free.

### RTTI → class hierarchy

If RTTI is present (common in MSVC builds with exceptions/`dynamic_cast`):

- MSVC emits `RTTI Complete Object Locator`, `Class Hierarchy Descriptor`,
  `Base Class Array`, and `Type Descriptor` (the `.?AV<name>@@` string). Parsing
  these reconstructs the inheritance graph and gives you real class names.
- Itanium emits `type_info` structures (`_ZTI...`, `_ZTV...`) you can walk
  similarly.
- Tooling: IDA's "RTTI" parsing, **classinformer**, **HexRaysPyTools**,
  Ghidra's `RecoverClassesFromRTTIScript`, and `OOAnalyzer`.

### vftable / vtable analysis

- A vtable is a contiguous array of function pointers. The object's first
  pointer-sized field usually points at it (`*this == &vftable`).
- Find vtables: locate the address written into an object at construction, or
  start from the COL that RTTI points back to.
- Define the vtable as a struct of function pointers, type the `this` pointer,
  and indirect calls `(*(this+0))(this, ...)` become named virtual calls.
- Order of entries = declaration order of virtuals, which helps map a class
  across binary versions even without symbols.

---

## 5. Struct Reconstruction From Access Patterns

The decompiler shows `*(a1 + 0x18)`. Your job: prove `a1` is a struct and what
field `0x18` is.

Workflow (Hex-Rays; Ghidra is analogous):

1. Spot a pointer that's accessed at several constant offsets.
2. Right-click the variable → **Convert to struct \*** / **Create new struct
   type**, or build it in **Local Types**. Ghidra: **Auto Create Structure**
   then edit in the structure editor.
3. Each `*(p + off)` access gives you a field at `off`; infer size from the
   access width (byte/word/dword/qword) and signedness from usage [8 hr].
4. Name fields as meaning emerges: a value compared to a loop bound is a
   `count`, a value that's called is a function pointer [8 hr].
5. Apply the struct to the variable (press **T** / **Y**). Every access reskins
   to `p->field_name`, and the type propagates to callers and callees.

Hints for field typing:
- Multiplied by a constant before indexing → array stride / element size.
- Passed to a known API → take the type from the prototype.
- Dereferenced again → it's a pointer; recurse.
- Compared against `0`/`1` near branches → bool/flag.

Reset a function's accumulated guesses with **Reset decompiler info** if you
poisoned it with a wrong type early [6 reset].

---

## 6. Function Signature Recovery

Goal: replace `__int64 __fastcall sub_x(__int64 a1, int a2, ...)` with a real
prototype.

- **Calling convention** tells you where args live: x64 Windows = RCX, RDX, R8,
  R9 then stack; SysV x64 = RDI, RSI, RDX, RCX, R8, R9. `__fastcall`/`__thiscall`
  on x86 differ. The decompiler infers this but often gets arg *count* wrong.
- **Parameter count**: count distinct incoming registers/stack slots read before
  being written. Variadic functions (printf-family) read a format string then a
  variable tail.
- **`this` pointer**: an x86 `__thiscall` passes `this` in ECX; if the first arg
  is dereferenced as an object, type it as a class pointer and the convention
  flips to `__thiscall`/`__fastcall` cleanly.
- **Return type**: whether callers use EAX/RAX (and how wide) reveals
  `void` vs `int` vs pointer.
- Edit the prototype directly in Hex-Rays (**Y** on the function name) using C
  syntax; the decompiler re-lifts with your signature [1 hr][9 hr]. In Ghidra,
  use **Edit Function Signature** and **Commit Params/Return**.
- Scripting: Hex-Rays ctree / microcode APIs let you derive a name or signature
  from how a function is called and rename callers automatically [7 ctree][3 mc].

---

## 7. Recognizing STL Containers In Decompiled Output

STL types have no FLIRT signature but a *stable memory layout per compiler ABI*.
Recognize the layout, define a struct, apply it [STL1][STL3].

### Layout cheat sheet (element type `T`)

| Type | MSVC | libstdc++ (GCC, Itanium) | libc++ (Clang) |
|------|------|--------------------------|----------------|
| `std::string` | ptr/union buf, size, capacity | data ptr, len, cap | SSO union (16B) + size [STL1] |
| `std::vector<T>` | first, last, end | start, finish, end_of_storage | begin, end, cap [STL1] |
| `std::shared_ptr<T>` | ptr, ctrl-block | ptr, ctrl-block | ptr, ctrl-block [STL1] |
| `std::unique_ptr<T>` | single ptr | single ptr | single ptr [STL1] |
| `std::map/set` | RB-tree node\* + size | RB-tree node-base\* + size | RB-tree node\* + size [STL1] |

### Tells in the pseudocode

- **`std::vector` iteration**: a pointer walked from `+0` toward `+8`, with
  `(end - begin) / sizeof(T)` for size; growth path calls an allocator.
- **`std::string`**: small-string optimization means a branch on a capacity
  flag/length deciding between an inline buffer and a heap pointer. MSVC's
  `_Bx` union and libc++'s 16-byte union are the giveaway [STL1].
- **`std::map`/`set`**: red-black tree node with parent/left/right + a color
  byte; lookups recurse comparing keys [STL5].
- **Pick the right ABI first**: `??`-prefixed symbols or `msvcp*.dll` imports →
  MSVC; `_Z` mangling → libstdc++/libc++ [STL1].

### Apply it

Import a prepared multi-compiler STL header (define the matching
`COMPILER_MSVC` / `COMPILER_LIBSTDCXX` / `COMPILER_LIBCXX` macro), then press
**T** on the variable to assign `std_string`, `std_vector_int`, etc. [STL1].
Möbius Strip RE shows scripting the discrimination (vector vs set) and the
element type, then auto-applying types [STL4].

---

## 8. Porting Symbols Between Binaries (BinDiff / Diaphora)

When you have version A *with* symbols and version B *stripped* (or a similar
binary), diff them and copy names across. This is often the fastest route for a
new version of something you already reversed [9 re].

### BinDiff (Google, free)

1. Export both with BinExport (or use `python-bindiff` directly from binaries).
2. Diff to produce a `.BinDiff` with function matches scored by structural
   similarity [PORT].
3. Import matches into the stripped IDB to port names/comments.

`python-bindiff` + LIEF lets you script it end-to-end, even onto an ELF that has
no IDA DB: diff, map `address1 → mangled symbol`, then `add_static_symbol` on
the second binary and `write()` a new ELF carrying the ported symbols [PORT].
Remember to add the **mangled** name back, since the matcher reports demangled
names [PORT].

### Diaphora (Joxean Koret, open source)

- Pure-Python plugin for IDA (also Radare2/Ghidra exports); generally more
  capable than BinDiff and free [8d][7d].
- Exports each DB to SQLite, then diffs into best/partial/unreliable/unmatched
  buckets shown in IDA choosers [6d].
- Ports function names, prototypes, comments, and some struct/enum info between
  versions. It does **not** port stack/local variable names [9 re].
- For patch-diffing the same product across versions, only export the functions
  you actually renamed/commented to keep it fast on huge IDBs (180k functions,
  GB-scale DBs choke otherwise) [4d][9 re].

### When to use which

| Situation | Tool |
|-----------|------|
| Two builds of the same product, quick name port | BinDiff |
| Deep diff, prototypes + comments, scriptable, free | Diaphora |
| Stripped ELF + symbolized sibling, automated | python-bindiff + LIEF [PORT] |
| Many people reversed this already | Lumina (§2) |

---

## 9. The Readability Pass (Making It Programmer-Friendly)

After the mechanical recovery, do the human pass in the decompiler [1 hr][8 hr]:

- **Rename** every `sub_*`, `a1`, `v3` to intent-revealing names. **N** in
  Hex-Rays; do it as meaning emerges, not all at once.
- **Retype** locals and args (**Y**) so casts disappear and the C reads cleanly.
- **Define structs/enums** and apply them so offset math becomes field access.
- **Propagate**: typing a callee's signature cleans up every caller; do leaf
  functions first, work outward.
- **Comment** non-obvious logic: anchor (`/* ... */`) and repeatable comments;
  record *why*, not *what*.
- **Split/group** with named locals instead of reused temporaries.
- **Reset** (`Reset decompiler info`) if an early wrong type cascaded garbage,
  then redo cleanly [6 reset].

Quality bar: a teammate who never saw the binary should read the function and
understand it without touching the disassembly.

---

## Sources

- [1] Hex-Rays — IDA F.L.I.R.T. Technology In-Depth: https://docs.hex-rays.com/ida-9.2/user-guide/signatures/flirt/ida-f.l.i.r.t.-technology-in-depth
- [3] Booz Allen — IDA FLIRT Signatures for Linux Binaries: https://www.boozallen.com/insights/cyber/tech/ida-flirt-signatures-for-linux-binaries.html
- [5] JPCERT/CC — Creating FLIRT signatures with YARA (autoyara4FLIRT): https://blogs.jpcert.or.jp/en/2023/06/autoyara4flirt.html
- [6] Google/Mandiant FLARE — Generating FLAIR patterns with IDAPython: https://cloud.google.com/blog/topics/threat-intelligence/flare-ida-pro-script
- [8] idaflirt-detector: https://github.com/SecureBrain/idaflirt-detector
- [7] RE StackExchange — FLIRT for C++ static binaries / STL limits: https://reverseengineering.stackexchange.com/questions/3890
- [3 demangle] c++filt usage: https://stackoverflow.com/questions/4465872
- [6 undname] undname.exe: https://stackoverflow.com/questions/3006438
- [10 dumpbin] dumpbin demangled output: https://stackoverflow.com/questions/13777681/demangling-in-msvc
- [2 til] NVISO — Generating IDA TILs from Windows Type Libraries: https://blog.nviso.eu/2023/11/07/generating-ida-type-information-libraries-from-windows-type-libraries/
- [4 gdt] Everyday Ghidra — When to Create Custom GDTs: https://medium.com/@clearbluejar/everyday-ghidra-ghidra-data-types-when-to-create-custom-gdts-part-1-143fe45777eb
- [3 pdb] Ghidra 101 — Loading Windows Symbols (PDB): https://securityboulevard.com/2021/07/ghidra-101-loading-windows-symbols-pdb-files-in-ghidra-10-x/amp/
- [9 pdb] RE StackExchange — Load symbols from server in Ghidra: https://reverseengineering.stackexchange.com/questions/20950
- [10 pdb-ida] RE StackExchange — IDA + MS public symbol server: https://reverseengineering.stackexchange.com/q/21453
- [5 dbgsym] Microsoft — Debugging with Symbols: https://learn.microsoft.com/en-us/windows/win32/dxtecharts/debugging-with-symbols/
- [STL1] Travis Mathison — Reverse Engineering With C++ STL Types: https://tdmathison.github.io/posts/Reverse-Engineering-With-CPP-STL-Types/
- [STL3] GrandpaGameHacker — MSVC STL Decompile Guide: https://github.com/GrandpaGameHacker/MSVC_STL_Decompile_Guide
- [STL4] Möbius Strip RE — Automation in RE of C++ Template Code: https://www.msreverseengineering.com/blog/2021/9/21/automation-in-reverse-engineering-c-template-code
- [STL5] RE StackExchange — STL map structures for IDA/HexRays: https://reverseengineering.stackexchange.com/questions/16486
- [1 hr] Hex-Rays — Renaming and retyping in the decompiler: https://hex-rays.com/blog/igors-tip-of-the-week-42-renaming-and-retyping-in-the-decompiler
- [8 hr] Hex-Rays Decompiler Primer (structs from fields): https://docs.hex-rays.com/user-guide/decompiler/primer
- [6 reset] Hex-Rays — Resetting decompiler information: https://hex-rays.com/blog/igors-tip-of-the-week-102-resetting-decompiler-information
- [7 ctree] Möbius Strip RE — Automated Contextual Function Renaming: http://www.msreverseengineering.com/blog/2018/10/9/hex-rays-ctree-api-scripting-automated-contextual-function-renaming
- [3 mc] Elastic Security Labs — Hex-Rays decompilation internals: https://www.elastic.co/security-labs/introduction-to-hexrays-decompilation-internals
- [PORT] Quarkslab Diffing Portal — Symbol Porting (python-bindiff + LIEF): http://diffing.quarkslab.com/tutorials/03a_diffing_porting_symbols.html
- [8d] Ringzer0 — Advanced Binary Diffing with Diaphora: https://ringzer0.training/advanced-binary-diffing-with-diaphora/
- [3d/7d] Diaphora: https://github.com/joxeankoret/diaphora
- [9 re] RE StackExchange — Moving names/comments/structs to a new version: https://reverseengineering.stackexchange.com/questions/27974
- [4d] Diaphora wiki — exporting only changed functions: https://github.com/joxeankoret/diaphora/wiki/Diaphora-takes-too-long-exporting!
- [2 bindiff] Google BinDiff: https://github.com/google/bindiff
- [10 lumina] Hex-Rays — Diaphora / Lumina overview: https://hex-rays.com/blog/plugin-focus-diaphora
