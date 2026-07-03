# Subskill: Symbol & Type Recovery

Scope: make decompiler output readable — names, types, structs, signatures. The difference between
"pseudocode soup" and code a programmer can re-implement.

## Identify library code (don't reverse what you can label)
- **FLIRT** (IDA) / **FunctionID** (Ghidra) — fingerprint statically-linked libc/MSVCRT/OpenSSL funcs.
- Public **PDB** symbols (Microsoft symbol server) — apply when available.
- **Lumina** (IDA) — crowdsourced symbols.

## C++ specifics
- Demangle: MSVC `undname`, Itanium `c++filt`. Exported MT5 names are `extern "C"` (no mangling).
- Recover classes from **RTTI** + **vftables**: a `mov [obj], vtable_addr` in a constructor reveals the
  class; the vtable lists virtual methods in order. COM-style interfaces (like `IMTManagerAPI`) are pure
  vtables — recover method order to call them.

## Types & structs
Infer struct layout from access patterns (`[reg+0x8]`, `[reg+0x10]`...). Recognize STL: `std::string`
(ptr+len+cap or SSO), `std::vector` (begin/end/cap). Apply Windows API prototypes (IDA `.til` / Ghidra GDT).

## Port symbols across binaries
BinDiff / Diaphora / `python-bindiff` — migrate names from a known build to a stripped one (great for
versioned DLLs).

## Knowledge
`knowledge_read("symbol-type-recovery.md")`.

## Routing
Sibling: native-decompile, asm-abi. Downstream: rebuild.
