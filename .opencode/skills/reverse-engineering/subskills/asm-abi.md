# Subskill: x86/x64 ASM & Calling Conventions

Scope: read disassembly and map it back to C constructs; recover function signatures.

## What you must know
- **Win64 ABI** (this is what Windows DLLs use): args in RCX, RDX, R8, R9, then stack; 32-byte shadow
  space; return in RAX; caller-cleaned. (The MT5 `MTManagerVersion` proved this: `rcx` = first arg.)
- **System V AMD64** (Linux/macOS): RDI, RSI, RDX, RCX, R8, R9; 128-byte red zone.
- 32-bit: cdecl / stdcall / fastcall / thiscall — and the matching name decoration (`_f`, `_f@8`, `@f@8`).
- Prologue/epilogue, stack frames, local vars, `lea` for address math, `call`/`jmp` (tail call).

## Patterns to recognize
if/else (cmp+jcc), loops (back-edge jcc), switch (jump table via indexed `jmp`), struct access
(`[reg+offset]`), C++ virtual call (`mov rax,[obj]; call [rax+off]` = vtable), string ops, canaries.

## Signature recovery
Count/types of args from which arg-registers are read before being written + how they're used.
Return type from how RAX is consumed. Calling convention from the prologue + cleanup.

## Knowledge
`knowledge_read("asm-abi.md")` — register tables, all conventions, mangling, pattern catalog.

## Routing
Sibling: native-decompile, symbol-recovery.
