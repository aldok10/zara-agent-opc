# Symbol Recovery: C++ Demangling, Struct Reconstruction & BinDiff

TL;DR: Demangling C++ names, RTTI/vtable reconstruction, struct recovery from access patterns, function signature recovery, STL container recognition, and porting symbols with BinDiff/Diaphora.
See also: `symbols-flirt-pdb-typelibs.md`

---

## 4. Demangling C++ & Rebuilding Classes

### Demanglers

| ABI / Compiler | Mangling | Tool |
|----------------|----------|------|
| Itanium (GCC, Clang) | `_Z...` | `c++filt`, `__cxa_demangle`, `llvm-cxxfilt` |
| MSVC | `?name@@...` | `undname.exe`, `UnDecorateSymbolName`, `dumpbin` |

```bash
c++filt _ZN7android14BatteryService11cleanupImplEj
# android::BatteryService::cleanupImpl(unsigned int)
```

MSVC mangling encodes calling convention, class, return type, and parameter types, so a demangled MSVC name gives you a full signature for free.

### RTTI -> class hierarchy

If RTTI is present (common in MSVC builds with exceptions/`dynamic_cast`):
- MSVC emits `RTTI Complete Object Locator`, `Class Hierarchy Descriptor`, `Base Class Array`, and `Type Descriptor` (the `.?AV<name>@@` string).
- Tooling: IDA's RTTI parsing, **classinformer**, **HexRaysPyTools**, Ghidra's `RecoverClassesFromRTTIScript`, and `OOAnalyzer`.

### vftable / vtable analysis

- A vtable is a contiguous array of function pointers. The object's first pointer-sized field usually points at it (`*this == &vftable`).
- Define the vtable as a struct of function pointers, type the `this` pointer, and indirect calls become named virtual calls.
- Order of entries = declaration order of virtuals.

---

## 5. Struct Reconstruction From Access Patterns

Workflow (Hex-Rays; Ghidra is analogous):

1. Spot a pointer that's accessed at several constant offsets.
2. Right-click -> **Convert to struct \*** / **Create new struct type**. Ghidra: **Auto Create Structure**.
3. Each `*(p + off)` access gives you a field at `off`; infer size from the access width.
4. Name fields as meaning emerges.
5. Apply the struct (**T** / **Y**). Every access reskins to `p->field_name`.

Hints for field typing:
- Multiplied by a constant before indexing -> array stride / element size.
- Passed to a known API -> take the type from the prototype.
- Dereferenced again -> it's a pointer; recurse.
- Compared against `0`/`1` near branches -> bool/flag.

---

## 6. Function Signature Recovery

Goal: replace `__int64 __fastcall sub_x(__int64 a1, int a2, ...)` with a real prototype.

- **Calling convention** tells you where args live: x64 Windows = RCX, RDX, R8, R9 then stack; SysV x64 = RDI, RSI, RDX, RCX, R8, R9.
- **Parameter count**: count distinct incoming registers/stack slots read before being written.
- **`this` pointer**: x86 `__thiscall` passes `this` in ECX.
- **Return type**: whether callers use EAX/RAX reveals `void` vs `int` vs pointer.
- Edit the prototype directly in Hex-Rays (**Y** on the function name). In Ghidra, use **Edit Function Signature**.

---

## 7. Recognizing STL Containers In Decompiled Output

STL types have no FLIRT signature but a *stable memory layout per compiler ABI*.

### Layout cheat sheet

| Type | MSVC | libstdc++ (GCC) | libc++ (Clang) |
|------|------|-----------------|----------------|
| `std::string` | ptr/union buf, size, capacity | data ptr, len, cap | SSO union (16B) + size |
| `std::vector<T>` | first, last, end | start, finish, end_of_storage | begin, end, cap |
| `std::shared_ptr<T>` | ptr, ctrl-block | ptr, ctrl-block | ptr, ctrl-block |
| `std::map/set` | RB-tree node* + size | RB-tree node-base* + size | RB-tree node* + size |

### Tells in the pseudocode
- **`std::vector` iteration**: a pointer walked from `+0` toward `+8`, with `(end - begin) / sizeof(T)` for size.
- **`std::string`**: small-string optimization means a branch on a capacity flag deciding between an inline buffer and a heap pointer.
- **Pick the right ABI first**: `??`-prefixed symbols or `msvcp*.dll` imports -> MSVC; `_Z` mangling -> libstdc++/libc++.

---

## 8. Porting Symbols Between Binaries (BinDiff / Diaphora)

When you have version A *with* symbols and version B *stripped*, diff them and copy names across.

### BinDiff (Google, free)

1. Export both with BinExport.
2. Diff to produce a `.BinDiff` with function matches scored by structural similarity.
3. Import matches into the stripped IDB to port names/comments.

`python-bindiff` + LIEF lets you script it end-to-end: diff, map `address1 -> mangled symbol`, then `add_static_symbol` on the second binary [PORT].

### Diaphora (Joxean Koret, open source)

- Pure-Python plugin for IDA; generally more capable than BinDiff and free.
- Exports each DB to SQLite, then diffs into best/partial/unreliable/unmatched buckets.
- Ports function names, prototypes, comments, and some struct/enum info between versions. Does **not** port stack/local variable names.

### When to use which

| Situation | Tool |
|-----------|------|
| Two builds of the same product, quick name port | BinDiff |
| Deep diff, prototypes + comments, scriptable, free | Diaphora |
| Stripped ELF + symbolized sibling, automated | python-bindiff + LIEF |
| Many people reversed this already | Lumina |

---

## 9. The Readability Pass

After mechanical recovery, do the human pass:

- **Rename** every `sub_*`, `a1`, `v3` to intent-revealing names.
- **Retype** locals and args so casts disappear.
- **Define structs/enums** and apply them.
- **Propagate**: typing a callee's signature cleans up every caller; do leaf functions first.
- **Comment** non-obvious logic: record *why*, not *what*.
- **Reset** (`Reset decompiler info`) if an early wrong type cascaded garbage.

Quality bar: a teammate who never saw the binary should read the function and understand it without touching the disassembly.

---

## Sources
- [1] Hex-Rays FLIRT In-Depth: https://docs.hex-rays.com/ida-9.2/user-guide/signatures/flirt/ida-f.l.i.r.t.-technology-in-depth
- [STL1] Travis Mathison -- Reverse Engineering With C++ STL Types: https://tdmathison.github.io/posts/Reverse-Engineering-With-CPP-STL-Types/
- [PORT] Quarkslab Diffing Portal -- Symbol Porting: http://diffing.quarkslab.com/tutorials/03a_diffing_porting_symbols.html
- [8d] Ringzer0 -- Advanced Binary Diffing with Diaphora: https://ringzer0.training/advanced-binary-diffing-with-diaphora/
- Full source list in sibling file `symbols-flirt-pdb-typelibs.md`
