# Delphi & C++Builder Binary Reverse Engineering

TL;DR: Delphi binaries contain rich RTTI (VMT, class names, method tables, DFM forms). Identify via DVCLAL resource, TPF0 magic, VMT self-pointer pattern. Use IDR, IDA+DelphiHelper, or undelphi for analysis. VMProtect/Themida are common protectors.

---

## Toolchain Identification

| Signal | Recovers |
|--------|----------|
| `DVCLAL` resource | SKU (Personal/Pro/Enterprise) |
| `PACKAGEINFO` resource | Unit list + package deps |
| `TPF0` in RCDATA | Binary is form-bearing |
| Namespaced units (`Vcl.Controls`) | XE2+ Delphi |
| VMT self-pointer scan | Structurally Delphi |

## VMT Layout (Delphi 2009+)

| Offset (32-bit) | Field |
|-----------------|-------|
| -44 | vmtSelfPtr (points to VMT start) |
| -28 | vmtTypeInfo (RTTI pointer) |
| -24 | vmtFieldTable |
| -20 | vmtMethodTable |
| -12 | vmtClassName (ShortString ptr) |
| -8 | vmtInstanceSize |
| -4 | vmtParent (parent VMT pointer) |
| +0 | vmtSafeCallException |
| +28 | vmtDestroy |
| +32+ | User virtual methods |

VMT scanning: Find forward pointer to self + 0x4C. Validate: reasonable instance size, method pointers in .text, valid ShortString at className.

## String Types

| Type | Layout | Detection |
|------|--------|-----------|
| ShortString | [len:1][chars:len] max 255 | Stack-allocated 256-byte blocks |
| AnsiString | [-12:codepage][-8:refcount][-4:length][data][null] | `_LStrAsg`, `_LStrCat` calls |
| UnicodeString | Same layout, UTF-16 chars | `_UStrAsg`, `_UStrCat` calls |

String constants: refcount = -1 (never freed). Empty strings = nil pointers.

## DFM Form Resources

Magic: `TPF0` (4 bytes: $54 $50 $46 $30). FMX uses `TPF1`.

Structure: Object class name + Object name + Tagged property pairs + Nested objects + vaNull terminator.

Event handlers in DFM: `OnClick = Button1Click` -> match to published method table entries.

Extraction: Enumerate RT_RCDATA resources, check for TPF0/TPF1 magic.

## Published Method Table

```
Count: Word
Methods[]: { Size: Word, Address: Pointer, Name: ShortString }
```

Cross-reference DFM event names against method table to resolve handler addresses.

## RTTI (TTypeKind)

Key values: 0=tkInteger, 6=tkClass, 7=tkMethod, 9=tkLString, 18=tkUString, 20=tkRecord, 21=tkInterface.

Extended RTTI (2010+): per-method visibility, parameter names/types, attributes.

## C++Builder Differences

| Feature | MSVC | C++Builder |
|---------|------|------------|
| Name mangling | `?name@@YA...` | `@Unit@Method$q...` |
| RTTI | C++ type_info | Delphi-style for `__declspec(delphiclass)` |
| VTable | MSVC ABI | Delphi VMT for VCL classes |
| Default calling | `__thiscall` | `__fastcall` (register) |

Unmangling: `@Dbcommon@GetTableNameFromSQLEx$qqrx17System@WideString...` -> `Dbcommon::GetTableNameFromSQLEx(const WideString, ...)`

## Decompilation Tools

| Tool | Scope | Output |
|------|-------|--------|
| IDR | Delphi 2-XE4, 32-bit | Annotated ASM + class tree |
| DeDe | Delphi 3-7 | DFM + ASM methods |
| DelphiHelper (IDA) | x86/x64, IDA 8.4+ | VMT/DFM parsing, KB loading |
| Pythia (NCC Group) | VMT extraction | JSON class hierarchy |
| undelphi (Rust) | Full analysis, multi-format | Structured data |
| DelphiReSym (Ghidra) | Symbol recovery | VT structures |

## BPL Package RE

BPL = PE DLL with PACKAGEINFO + DVCLAL resources. Exports use mangled names: `@Unit@Function$qqrv`.

Unmangling: `tdump -e package.bpl` or parse the `unmangle.c` logic.

## Obfuscation

**DProtector**: Code encryption, import obfuscation, RTTI stripping. Bypass: dump after loader decrypts.

**VMProtect**: Virtualizes code into custom bytecode VM. Deobfuscation approaches:
1. Static: Profile VM handlers, lift to IL
2. Dynamic (preferred): Trace + Triton symbolic exec + LLVM
3. Pushan: Trace-free VPC-sensitive emulation

**Themida**: Code virtualization, DFM resource encryption. Extract DFM from memory post-initialization.

## General Deobfuscation Strategy

1. Unpack (Scylla/x64dbg dump after stub runs)
2. Rebuild imports
3. Check RTTI presence (if VMT scan fails, RTTI stripped)
4. Extract DFM from memory if encrypted on disk
5. Apply standard tools to dumped image
