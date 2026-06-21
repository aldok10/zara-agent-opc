# Delphi & C++Builder Binary Reverse Engineering

> Reference document covering PE structure, VCL internals, RTTI, DFM forms, decompilation tooling, obfuscation, and DLL reverse engineering for Embarcadero/Borland Delphi and C++Builder compiled binaries.

---

## Table of Contents

1. [Toolchain Identification](#1-toolchain-identification)
2. [Delphi PE Structure](#2-delphi-pe-structure)
3. [Virtual Method Table (VMT) & Class Layout](#3-virtual-method-table-vmt--class-layout)
4. [Run-Time Type Information (RTTI)](#4-run-time-type-information-rtti)
5. [Delphi String Types](#5-delphi-string-types)
6. [DFM Form Resources](#6-dfm-form-resources)
7. [Visual Component Library (VCL) Patterns](#7-visual-component-library-vcl-patterns)
8. [C++Builder Variations](#8-cbuilder-variations)
9. [Decompilation & Analysis Tools](#9-decompilation--analysis-tools)
10. [DLL & BPL Package Reverse Engineering](#10-dll--bpl-package-reverse-engineering)
11. [Obfuscation & Deobfuscation](#11-obfuscation--deobfuscation)
12. [References](#12-references)

---

## 1. Toolchain Identification

Identifying the compiler and version is the first step. Key signals exist in the PE image.

| Signal | Confidence | Recovers |
|--------|------------|----------|
| Embarcadero build string (e.g. `Embarcadero Delphi for Win64 compiler version 36.0`) | High | Exact compiler version, marketing release name, target OS, arch |
| `DVCLAL` resource | High | SKU (Personal / Professional / Enterprise) |
| `PACKAGEINFO` resource | High | Unit list + required-package list |
| Namespaced unit names (`Vcl.Controls`, `System.SysUtils`) | Medium | XE2-or-later Delphi |
| `TPF0` magic bytes in RCDATA resources | Medium | Binary is form-bearing |
| Validated VMT structure scan | Medium | Structurally Delphi/FPC even if strings stripped |

[1](https://docwiki.embarcadero.com/RADStudio/en/Delphi_RTTI_and_C++Builder), [2](https://github.com/BinFlip/undelphi)

Compiler version strings follow the pattern `DCC v<major>` for Delphi and map to marketing names (e.g. Delphi 12 Athens = DCC v36). C++Builder versions follow the same release cadence. The `PACKAGEINFO` resource structure includes version, flags, and a count of contained units followed by unit name entries [3](https://docwiki.embarcadero.com/Libraries/en/System.PackageInfoTable).

---

## 2. Delphi PE Structure

Delphi and C++Builder produce standard PE32/PE32+ executables, DLLs, and BPLs. The structure differs from MSVC-compiled binaries in several ways.

### 2.1 Sections

A typical Delphi PE contains:

| Section | Characteristics |
|---------|-----------------|
| `.text` | Executable code; may be large due to VCL/RTL linking |
| `.data` | Initialized global data, VMT pointers |
| `.rdata` | Read-only data; RTTI structures, string constants, import tables |
| `.rsrc` | Resources including DFM binary forms (TPF0), DVCLAL, PACKAGEINFO |
| `.bss` | Uninitialized data |
| `.tls` | Thread-local storage (if used) |
| `.idata` | Import directory |

Unlike MSVC, Delphi often embeds significant RTTI metadata in `.rdata`. The `.rsrc` section is critical because it stores form definitions as RCDATA entries [4](https://www.fravia-reverse.sever.com.hr/aitodelp.html).

### 2.2 Entry Point

The Delphi RTL entry point wraps the user's `Program` source. The startup sequence is:

1. `_Startup` (assembler stub in `SysInit`)
2. `InitUnits` (calls initialization sections of all used units)
3. `HaltProg` (registered via `Application.Run`)
4. User's `begin..end.` block from the `.dpr` file

Entry point patterns:
- Console: `_PascalMain` called from `_start`
- GUI: `TApplication.Create` -> `Application.Initialize` -> `Application.CreateForm` -> `Application.Run`

The ESET DelphiHelper plugin searches for references to `CreateForm`, `InitExe`, and `InitLib` to locate the entry point function [5](https://github.com/eset/DelphiHelper).

### 2.3 Special Resources

**DVCLAL** — A small resource identifying the Delphi SKU. Contains a 4-byte integer: 0 = Personal, 1 = Professional, 2 = Enterprise/Architect [2](https://github.com/BinFlip/undelphi).

**PACKAGEINFO** — Contains flags, version info, unit list, and package dependency list. Struct (from `System.Pas`):

```
TPackageInfo = packed record
  Flags         : Cardinal;      // pfRuntime, pfDesignOnly, etc.
  Version       : Cardinal;
  UnitCount     : Cardinal;
  UnitNames     : array[0..UnitCount-1] of ShortString;
  // followed by required package names
end;
```

[3](https://docwiki.embarcadero.com/Libraries/en/System.PackageInfoTable)

---

## 3. Virtual Method Table (VMT) & Class Layout

### 3.1 Instance Memory Layout

Every Delphi object instance is a heap-allocated block. The first field is a pointer to the VMT, followed by instance fields in declaration order.

| 32-bit Offset | 64-bit Offset | Field |
|---------------|---------------|-------|
| +0 | +0 | Pointer to VMT |
| +4 | +8 | Instance fields (declaration order) |

[6](https://docwiki.embarcadero.com/RADStudio/en/Internal_Data_Formats_(Delphi))

### 3.2 VMT Layout (Delphi 2009+)

The VMT contains bothsystem-managed slots (negative offsets) and user-defined virtual methods (positive offsets). Adapted from `System.pas`:

| 32-bit Offset | 64-bit Offset | Field | Purpose |
|---------------|---------------|-------|---------|
| -44 | -76 | vmtSelfPtr | Points to start of VMT |
| -40 | -68 | vmtIntfTable | Interface table pointer |
| -36 | -60 | vmtAutoTable | Automation dispatch table |
| -32 | -52 | vmtInitTable | Managed field init table |
| -28 | -44 | vmtTypeInfo | Class RTTI pointer |
| -24 | -36 | vmtFieldTable | Published field table |
| -20 | -28 | vmtMethodTable | Published method table |
| -16 | -20 | vmtDynamicTable | Dynamic method table |
| -12 | -12 | vmtClassName | ShortString class name pointer |
| -8 | -8 | vmtInstanceSize | Instance size in bytes |
| -4 | -4 | vmtParent | Parent class VMT pointer |
| +0 | +0 | vmtSafeCallException | First built-in virtual method |
| +4 | +8 | vmtAfterConstruction | |
| +8 | +16 | vmtBeforeDestruction | |
| +12 | +24 | vmtDispatch | |
| +16 | +32 | vmtDefaultHandler | |
| +20 | +40 | vmtNewInstance | |
| +24 | +48 | vmtFreeInstance | |
| +28 | +56 | vmtDestroy | Destructor |
| +32+ | +64+ | User-defined | User virtual method pointers |

[7](https://hallvards.blogspot.com/2006/03/hack-8-explicit-vmt-calls.html), [8](https://stackoverflow.com/questions/760513/where-can-i-find-information-on-the-structure-of-the-delphi-vmt)

### 3.3 VMT Scanning Strategy

Tools like NCC Group's Pythia and undelphi scan PE code sections for forward pointers pointing `+0x4C` ahead (the vmtSelfPtr pattern). Validation checks include:

- `vmtInstanceSize` must be reasonable
- Method pointers must resolve to executable sections
- `vmtParent` must point to a valid VMT or be null (TObject)
- `vmtClassName` must be a valid ShortString with printable ASCII

[9](https://github.com/nccgroup/pythia), [2](https://github.com/BinFlip/undelphi)

### 3.4 Published Method Table

Referenced by `vmtMethodTable`. Structure:

```
TPmt = packed record
  Count   : Word;
  Methods : array {of TPublishedMethod};
end;

TPublishedMethod = packed record
  Size    : Word;      // total size of this record
  Address : Pointer;   // method entry point
  Name    : ShortString;  // length-prefixed
end;
```

[10](https://hallvards.blogspot.com/2006/05/under-hood-of-published-methods.html)

### 3.5 Published Field Table

Each entry contains field name, type reference (via `PPTypeInfo`), and byte offset from the instance base. This is how the IDE's Object Inspector walks published fields at design-time, and how tooling recovers field names from a binary [5](https://github.com/eset/DelphiHelper).

---

## 4. Run-Time Type Information (RTTI)

### 4.1 Classic RTTI (Pre-Delphi 2010)

Classic RTTI is tied to the `$TYPEINFO` / `$M` directives and the `published` section. Key structures:

```
TTypeInfo = packed record
  Kind: TTypeKind;         // tkClass = 7 (Delphi), 15 (FPC)
  Name: ShortString;       // type name
  {Trailer varies by Kind}
end;
```

TTypeKind values:
| Value | Kind | Description |
|-------|------|-------------|
| 0 | tkInteger | Ordinal integer types |
| 1 | tkChar | AnsiChar |
| 2 | tkEnumeration | Enumerated types |
| 3 | tkFloat | Floating point |
| 4 | tkString | ShortString |
| 5 | tkSet | Set types |
| 6 | tkClass | Class (most common for VMT scanning) |
| 7 | tkMethod | Method pointers (event handlers) |
| 8 | tkWChar | WideChar |
| 9 | tkLString | AnsiString |
| 10 | tkWString | WideString |
| 11 | tkVariant | Variant |
| 12 | tkArray | Dynamic arrays |
| 18 | tkUString | UnicodeString (Delphi 2009+) |
| 19 | tkClassRef | Metaclass references |
| 20 | tkRecord | Records with RTTI |
| 21 | tkInterface | Interfaces |
| 22 | tkDynArray | DynArray type info |

[11](https://docwiki.embarcadero.com/Libraries/en/System.TypInfo.TTypeKind)

### 4.2 Extended RTTI (Delphi 2010+)

Introduced via `{$RTTI EXPLICIT ...}` directive. Extended RTTI adds:

- Per-method visibility flags
- Parameter names and types
- Attributes (`[attribute]` annotations)
- Constructor argument extraction for attributes

The extended RTTI blocks are separate from classic RTTI and linked via a different indirection in the VMT. They are decodable by tools like `undelphi` which parse the `extrtti` module [2](https://github.com/BinFlip/undelphi).

### 4.3 RTTI Discovery in the Binary

RTTI pointers are reachable through:
1. `vmtTypeInfo` in the VMT -> `tkClass` entry -> class name
2. `vmtFieldTable` -> array of field entries with type references
3. `vmtMethodTable` -> published method addresses and names
4. Global `PackageInfoTable` (for runtime packages) -> unit list -> class list

The Pythia tool finds VMTs by brute-force scanning code sections for the vmtSelfPtr signature (`pointer_to_self + 0x4C`) [9](https://github.com/nccgroup/pythia). DelphiReSym reconstructs fully qualified symbol names from embedded metadata and creates Ghidra VT structures [12](https://github.com/WenzWenzWenz/DelphiReSym).

---

## 5. Delphi String Types

Delphi's unique string types are a distinguishing feature in RE.

### 5.1 ShortString

- Maximum 255 characters
- Statically allocated (256 bytes)
- First byte = length, subsequent bytes = character data
- Indexed from 1 (`S[0]` = length via `Ord(S[0])`)
- No null terminator
- Used for class names in VMT (`vmtClassName`)

```
Offset:  [0] [1]     [2]     ... [n]
Content: len chr[1]  chr[2]  ... chr[len]
```

[13](https://docwiki.embarcadero.com/RADStudio/en/String_Types_(Delphi))

### 5.2 AnsiString

- Dynamically allocated, heap-managed
- Reference counted with copy-on-write
- Null-terminated (compatible with PAnsiChar)
- Code page aware (Delphi 2009+)

Memory layout (32-bit):

| Offset from data pointer | Size | Field |
|--------------------------|------|-------|
| -12 | 2 bytes | Code page |
| -10 | 2 bytes | Reserved |
| -8 | 4 bytes | Reference count |
| -4 | 4 bytes | Length (char count) |
| +0 | variable | Character data |
| +len | 1 byte | Null terminator (#0) |

For 64-bit: reference count and length are 8 bytes each.

String constant literals have refcount = -1 (never freed). Empty strings are nil pointers. [14](https://docwiki.embarcadero.com/Libraries/en/System.AnsiString)

### 5.3 UnicodeString (Default from Delphi 2009)

- Same memory layout as AnsiString
- Characters are UTF-16 (`WideChar`, 2 bytes each)
- Reference counted, copy-on-write semantics
- `string` keyword aliases to `UnicodeString`

| Offset from data pointer | Size (32-bit) | Field |
|--------------------------|---------------|-------|
| -12 | 2 bytes | Code page |
| -10 | 2 bytes | Reserved |
| -8 | 4 bytes | Reference count |
| -4 | 4 bytes | Length (char count) |
| +0 | variable | UTF-16 char data |
| +len*2 | 2 bytes | Null terminator (#0#0) |

[15](https://docwiki.embarcadero.com/Libraries/en/System.UnicodeString)

### 5.4 WideString

- Same semantics as COM `BSTR`
- Not reference counted (uses COM allocator)
- UTF-16 encoded
- Prefixed with length (4 bytes) before the pointer, not before the data

### 5.5 RE Detection of String Types

- Heap-allocated strings with refcount headers -> AnsiString/UnicodeString
- Stack-allocated 256-byte blocks with length prefix -> ShortString
- Functions calling `_UStrFromPCharLen`, `_UStrCat`, `_UStrAsg` -> UnicodeString operations
- Functions calling `_LStrFromPCharLen`, `_LStrCat`, `_LStrAsg` -> AnsiString operations
- `WideString` translated through COM (`SysAllocString`, `SysFreeString`)

---

## 6. DFM Form Resources

### 6.1 Overview

DFM (Delphi Form Module) files are binary representations of form designs. At compile time, `.dfm` files are compiled into binary TPF0 resources and embedded as RCDATA entries in the `.rsrc` section [16](https://www.fravia-reverse.sever.com.hr/aitodelp.html).

### 6.2 Binary Format (TPF0)

Header:
```
Offset 0:  "TPF0" (4 bytes, $54 $50 $46 $30)
Offset 4:  Object class name (ShortString)
Next:      Object name (ShortString)
```

Properties follow as tagged value pairs. Each property:
```
Name: ShortString (symbol)
Value: TValueType byte + value data
```

TValueType enum:
| Byte | Type | Description |
|------|------|-------------|
| 0x00 | vaNull | End of list |
| 0x01 | vaList | Nested list |
| 0x02 | vaInt8 | Signed 8-bit int |
| 0x03 | vaInt16 | Signed 16-bit int |
| 0x04 | vaInt32 | Signed 32-bit int |
| 0x05 | vaExtended | Extended float (10 bytes) |
| 0x06 | vaString | ShortString |
| 0x07 | vaIdent | Identifier reference |
| 0x08 | vaFalse | Boolean false |
| 0x09 | vaTrue | Boolean true |
| 0x0A | vaBinary | Binary blob |
| 0x0B | vaSet | Set type |
| 0x0C | vaLString | AnsiString |
| 0x0D | vaNil | nil reference |
| 0x0E | vaCollection | Collection |
| 0x0F | vaSingle | Single float (4 bytes) |
| 0x10 | vaCurrency | Currency (8 bytes) |
| 0x11 | vaDate | TDateTime (8 bytes) |
| 0x12 | vaWString | WideString |
| 0x13 | vaInt64 | Signed 64-bit int |
| 0x14 | vaUTF8String | UTF-8 string |
| 0x15 | vaUString | UnicodeString |
| 0x16 | vaQWord | Unsigned 64-bit int |

[17](https://is4code.blogspot.com/2022/03/delphi-form-data-tpf0-binary-format.html), [18](https://github.com/BinFlip/undelphi)

Nested objects follow the property list. Each nested object:
```
Class name (ShortString)
Object name (ShortString)
Properties...
Nested objects...
0x00 (vaNull) terminates
```

### 6.3 Text Format

Delphi can serialize DFM to text using `ObjectBinaryToText`. Text format:
```
object MainForm: TMainForm
  Left = 0
  Top = 0
  Caption = 'Test'
  object Button1: TButton
    Left = 8
    Top = 16
    Caption = 'Click Me'
    OnClick = Button1Click
  end
end
```

### 6.4 DFM Extraction & Reconstruction

Four key API functions in `System.Classes`:
- `ObjectBinaryToText` — binary DFM -> text representation
- `ObjectTextToBinary` — text -> binary DFM
- `ObjectResourceToText` — resource stream -> text (handles header)
- `ObjectTextToResource` — text -> resource stream

Methods for extraction:
1. Enumerate `RT_RCDATA` resources with `EnumResourceNames`
2. Read each resource, check first 4 bytes for `TPF0` (Delphi) or `TPF1` (FMX)
3. Call `ObjectResourceToText` or manual binary parsing
4. Extract embedded event handler names and component class references

Tools: XN Resource Editor, MiTeC DFM Editor, resourcetools [19](https://cc.embarcadero.com/item/25783)

### 6.5 DFM in Event Handler Reconstruction

Event handlers in DFM appear as property assignments like `OnClick = Button1Click`. The referenced method name can be matched to published method table entries. Tools like IDR and DelphiHelper cross-reference DFM event names against the published method table to resolve the handler address [5](https://github.com/eset/DelphiHelper).

### 6.6 FMX (FireMonkey) Forms

FireMonkey uses `TPF1` as magic bytes instead of `TPF0`. The format follows a similar tagged-value structure but includes additional cross-platform metadata. FMX frames can be embedded in Mach-O (macOS, iOS) and ELF (Android) binaries, not just PE. The form data lives in `RT_RCDATA` on Windows or in the `.fpc.resources` section on FPC-compiled targets [2](https://github.com/BinFlip/undelphi).

---

## 7. Visual Component Library (VCL) Patterns

### 7.1 Class Hierarchy

The VCL hierarchy starts with `TObject`:
```
TObject
  TPersistent
    TComponent
      TControl
        TWinControl
          TButtonControl
            TButton
          TEdit
          TPanel
          TCustomForm
            TForm
        TGraphicControl
          TLabel
          TImage
      TApplication
      TDataModule
      TForm (via TCustomForm)
  TList, TCollection, TStream, etc.
```

### 7.2 Event Handler Pattern

Delphi event handlers are method pointers implementing `TNotifyEvent = procedure(Sender: TObject) of object;`. In the binary:

- The method table entry for an event handler stores the address
- The DFM references the handler by name (e.g. `OnClick = Button1Click`)
- Event handler signatures are recoverable from extended RTTI

Dispatched via:
```asm
MOV  EAX, [EBP-Offset]   ; Self
MOV  EDX, [EBP-Sender]   ; Sender
CALL [EAX + VMT_OFFSET]  ; virtual dispatch
```

For published events:
```asm
MOV  EAX, [EBP-Self]
MOV  EDX, Sender
MOV  ECX, [EAX + FieldOffset]  ; load method pointer (TMethod.Code)
CALL ECX
```

[20](https://hallvards.blogspot.com/2006/03/method-calls-compiler-implementation.html)

### 7.3 Message Handler Dispatch

Delphi uses a message dispatch system for Windows messages. The `vmtDynamicTable` contains message handler entries:

```
TDynamicTable = packed record
  Count: Word;
  Entries: array of TDynamicEntry;
end;

TDynamicEntry = packed record
  MessageID: Word;    // WM_xxx constant
  HandlerVA: Pointer; // method address
end;
```

Dispatch method calls `MainWndProc` -> `WndProc` -> `Dispatch(var Message)` which walks the dynamic table and parent class chain.

### 7.4 Component Creation Pattern

Forms are constructed at runtime:
```asm
MOV  EAX, [VMT_Address]    ; class reference
CALL TApplication.CreateForm
```

The compiler-generated `FormCreate` wrapper calls `TCustomForm.Create` then assigns properties from the DFM stream via `InitInheritedComponent`.

### 7.5 RTL Runtime Function Detection

Key runtime functions to identify in disassembly:

| Function | Purpose |
|----------|---------|
| `_UStrAsg` | UnicodeString assignment |
| `_UStrCat` | UnicodeString concatenation |
| `_LStrAsg` | AnsiString assignment |
| `_LStrCat` | AnsiString concatenation |
| `_UStrFromPCharLen` | PChar to UnicodeString |
| `_NewInstance` | Class instantiation (via VMT) |
| `_FreeMem` | Memory deallocation |
| `_ClassCreate` | Instance constructor |
| `_CallDynaInst` | Dynamic method dispatch |
| `_IntfCall` | Interface call dispatch |

---

## 8. C++Builder Variations

### 8.1 Key Differences from MSVC

C++Builder (bcc32/bcc64/bcc64x) produces binaries with significant structural differences from MSVC:

| Feature | MSVC | C++Builder |
|---------|------|------------|
| Name mangling | `?<name>@@YA...` | `@<unit>@<method>$q...` |
| Exception handling | SEH-based (`__except_handler3/4`) | Delphi EH model (for VCL classes) + SEH |
| RTTI | C++ RTTI (type_info) | Delphi-style RTTI for `__declspec(delphiclass)` |
| VTable layout | MSVC ABI | Delphi VMT layout for VCL-derived classes |
| Stdlib | MSVC STL | Dinkumware STL (modern), Rogue Wave (legacy) |
| Calling convention | `__thiscall` (methods) | `__fastcall` (register-based) |

[21](https://docwiki.embarcadero.com/RADStudio/en/Delphi_RTTI_and_C++Builder)

### 8.2 Delphi-Style RTTI in C++Builder

C++Builder generates Delphi-style RTTI when using `__declspec(delphiclass)` or `__declspec(delphirtti)`. This allows C++ classes to be used in Delphi packages and vice versa. The RTTI is different from standard C++ RTTI:
- Standard C++ RTTI: identifies type, allows `typeid` comparison
- Delphi RTTI: exposes fields, methods, properties, parameter types, attributes

Control via:
- `__declspec(delphirtti)` — per-class toggle
- `__declspec(delphiclass)` — marks class as Delphi-compatible
- `#pragma explicit_rtti` — fine-grained control
- `__published` — section keyword for published members

[1](https://docwiki.embarcadero.com/RADStudio/en/Delphi_RTTI_and_C++Builder)

### 8.3 Name Mangling

Symbol mangling in C++Builder follows the pattern used by Delphi for BPL exports:

```
@UnitName@FunctionName$qqrv
```

Where:
- `@` delimits namespace/unit, class, and method
- `$q` introduces parameter signatures
- `qr` = register (fastcall), `qv` = void parameters
- `x` = const parameter modifier
- Parameter types encoded as `<len><type>` (e.g. `4Word` for `Word`)

Example: `@Dbcommon@GetTableNameFromSQLEx$qqrx17System@WideString25Dbcommon@IDENTIFIEROption` unmangles to `Dbcommon::GetTableNameFromSQLEx(const System::WideString, Dbcommon::IDENTIFIEROption)` [22](https://stackoverflow.com/questions/1591030/delphi-unmangle-names-in-bpls).

### 8.4 Exception Handling

C++Builder uses two exception handling models:

**Delphi-style (default for VCL):**
- Based on `try..except` and `try..finally`
- Exception classes derived from `System.TObject`
- Raised with `throw` or `raise`
- Uses `_RaiseException` in the RTL

**SEH (Structured Exception Handling):**
- Available via `__try`/`__except`/`__finally`
- Raised via `RaiseException()` API
- Cannot be mixed with C++ EH in the same function (bcc64x enforces this strictly)
- Clang-based modern compilers (bcc64x) reject mixing entirely

C++Builder 12.2+ enforces strict separation: "cannot use C++ 'try' in the same function as SEH '__try'" [23](https://docwiki.embarcadero.com/RADStudio/en/Exception_Handling_in_the_Modern_C++_Toolchain), [24](https://stackoverflow.com/questions/79243789/cbuilder-12-2-error-cannot-use-c-try-in-the-same-function-as-seh-try).

### 8.5 Calling Conventions

| Convention | Register Usage | Cleanup |
|------------|---------------|---------|
| `__fastcall` (default) | EAX = Self (methods), EDX/ECX = first two params | Callee |
| `__stdcall` | Stack | Callee |
| `__cdecl` | Stack | Caller |
| `__msfastcall` | ECX/EDX (MSVC compatible) | Callee |

Delphi methods default to `register` (__fastcall) with Self in EAX.

### 8.6 Win64 Modern Toolchain (bcc64x)

Introduced in RAD Studio 12.1, uses:
- Clang-based frontend
- COFF format object files (not ELF like legacy Win64)
- Standard C++17/20 support
- Mixing C++ EH and SEH in the same function is rejected at compile time

Package support (BPLs) for the modern toolchain was completed in 12.2 [25](https://blogs.embarcadero.com/dynamic-packages-in-cbuilder-12-2/).

---

## 9. Decompilation & Analysis Tools

### 9.1 Interactive Delphi Reconstructor (IDR)

**IDR** is the most complete Delphi decompiler. It performs static analysis on EXE/DLL files compiled with Delphi 2 through XE4.

**Capabilities:**
- Unit/class/method tree reconstruction
- DFM form viewer with event handler navigation
- RTTI parsing with method signature recovery
- Knowledge base (KB) system for RTL function signatures
- MAP/IDC generation for IDA integration
- String reference cross-referencing

**Architecture:**
- Written in C++ (Borland C++Builder 6)
- Uses a disassembler engine (`dis.dll`)
- KB files contain pre-computed signatures per Delphi version
- Knowledge bases required for each Delphi version; auto-detection attempts matching

**Limitations:**
- 32-bit only (no x64 support)
- Stops at Delphi XE4
- Cannot fully reconstruct source code — produces well-commented ASM with structure annotations
- External dependencies: `dis.dll`, `icons.dll`, KB files

[26](https://github.com/crypto2011/IDR), [27](https://www.aldeid.com/wiki/IDR-Interactive-Delphi-Reconstructor)

### 9.2 DeDe

**DeDe** is an older Delphi decompiler supporting Delphi 3-7. It is faster but less comprehensive than IDR.

**Output:**
- Complete DFM files (editable in Delphi IDE)
- Published methods as commented ASM
- Unit dependency trees
- Try-Except and Try-Finally block identification
- Can reconstruct Delphi project folders (.dpr, .pas, .dfm)

**Limitations:**
- `.pas` files contain ASM, not compilable Pascal
- Only published methods decompiled by default
- Development stopped at Delphi 7 (though source-ported experimental versions exist for Berlin 10.1)

[28](https://forum.exetools.com/showthread.php?p=119459)

### 9.3 DelphiHelper (IDA Pro Plugin)

ESET's Python plugin for IDA Pro:

**Features:**
- DFM Finder: locates and parses TPF0 resources, displays form tree
- VMT Parser: cursor-based VMT structure extraction
- Automated field table -> IDA enum/structure creation
- Method table parser with event handler identification
- IDR KB signature loader
- Entry point finder (searches for `CreateForm`, `InitExe`, `InitLib`)
- DFM embedded binary extraction

**Versions:** Supports x86/x64, IDA 8.4+, cross-platform [5](https://github.com/eset/DelphiHelper).

### 9.4 Pythia (NCC Group)

Python tool for VMT and RTTI extraction:

**Method:**
- Brute-force VMT candidate scanning via vmtSelfPtr pattern
- Validation against instance size and executable pointer ranges
- Parent chain reconstruction by VMT pointer comparison
- Inherited vs. overloaded method identification

**Output:** JSON with class hierarchy, method addresses, and inheritance info [9](https://github.com/nccgroup/pythia).

### 9.5 undelphi (Rust Library)

BinFlip's Rust library for comprehensive Delphi/C++Builder binary analysis:

**Capabilities:**
- Toolchain detection (Delphi, C++Builder, FPC, Lazarus)
- Complete class hierarchy recovery with parent-chain resolution
- TPF0/TPF1 DFM parser with full TValueType set
- Extended RTTI decoding (Delphi 2010+)
- Symbolic property rendering (e.g. `Align = alClient`)
- Instance memory layout reconstruction
- Event handler binding resolution
- Multi-format support: PE32/PE32+, Mach-O, ELF

**Output:** Structured data for further processing (no decompilation) [2](https://github.com/BinFlip/undelphi).

### 9.6 DelphiReSym (Ghidra Plugin)

Python script for Ghidra that:

- Recovers fully qualified Delphi symbol names from metadata
- Creates Ghidra VT structures from VMT data
- Populates inherited and virtual function signatures
- Requires Ghidra 11.3+, Python 3, pyghidra
- Works on unpacked Delphi binaries only

[12](https://github.com/WenzWenzWenz/DelphiReSym)

### 9.7 Additional Tools

| Tool | Purpose |
|------|---------|
| **XN Resource Editor** | View/edit DFM resources, export binary forms |
| **MiTeC DFM Editor** | Tree-view DFM explorer |
| **Resource Hacker** | Resource viewing and extraction |
| **KBBUILDER** | Build IDR knowledge bases for custom Delphi versions |
| **TDump** | BPL/DLL symbol export dumping with name unmangling |
| **DCU32Int** | DCU introspection tool (supports up to Berlin 10.2) |

[29](https://hmelnov.icc.ru/DCU/)

### 9.8 IDR Knowledge Base System

IDR uses `.kb` files containing pre-extracted RTTI signatures for RTL/VCL units per Delphi version. KB files map function addresses to symbolic names. The ESET DelphiHelper plugin can load these KBs into IDA to name imported RTL functions. Building custom KBs requires `KBBUILDER` and a reference compilation of the target Delphi version [26](https://github.com/crypto2011/IDR).

---

## 10. DLL & BPL Package Reverse Engineering

### 10.1 BPL as DLL

A **BPL** (Borland Package Library) is a PE DLL with extra metadata:
- Standard PE header and import/export tables
- Exports specific functions for VCL runtime linkage
- Contains `PACKAGEINFO` and `DVCLAL` resources
- Unit initialization/finalization procedures exported

BPL exports follow a mangled naming scheme:
```
@<unit>@<function>$qqrv
```

System imports/exports use conventions checked by the package loader at runtime. A BPL can be loaded via `LoadPackage` (Delphi) or standard `LoadLibrary` [30](https://borland.public.delphi.non-technical.narkive.com/UZ8JGroY/reverse-engineering-a-bpl).

### 10.2 Package Dependency Analysis

BPL dependency analysis examines the PE import table for `.bpl` references. Tools like `BPLDeps` read the Import Directory and filter for BPL imports, supporting both direct and recursive dependency analysis [31](https://github.com/JavierusTk/BPLDEPS).

The `PACKAGEINFO` resource also lists required packages by name, which can be extracted with `GetPackageInfo`:
```
GetPackageInfo(Module, nil, Flags, Version);
// Flags include: pfRuntimeOnly, pfDesignOnly, pfNeverBuild
// Flags also indicate producer: c++ (bit 2), Pascal (bit 3)
```

[32](https://stackoverflow.com/questions/5042588/how-can-i-determine-which-libraries-are-used-in-a-delphi-program-i-dont-have-th)

### 10.3 DLL Export Name Unmangling

The `tdump -e` utility unmangles C++Builder/Delphi exported names:
```
tdump -e dbrtl150.bpl | grep GetTableNameFromSQLEx
```

Output:
```
__fastcall Dbcommon::GetTableNameFromSQLEx(const System::WideString, Dbcommon::IDENTIFIEROption)
```

The unmangling logic is in `$(BDS)\source\cpprtl\Source\misc\unmangle.c` [22](https://stackoverflow.com/questions/1591030/delphi-unmangle-names-in-bpls).

### 10.4 Delphi DLL RE Considerations

- **RTTI presence**: DLLs compiled with Delphi contain the same RTTI as EXEs. VMT structures, class names, and form definitions are all present if the DLL uses classes.
- **Package dependencies**: A DLL may depend on runtime BPLs. Without those BPLs, VMT parent pointers may be unresolvable (external parent).
- **Entry point**: `DLLProc` is set in the `begin..end.` block. `DLLEntryProc` in `SysInit` dispatches `DLL_PROCESS_ATTACH`, `DLL_THREAD_ATTACH`, etc.
- **Export table**: Delphi DLLs export functions with decorated names unless explicit `exports` directives use standard names.
- **DFM in DLLs**: DLLs can contain forms. Enumerate `RT_RCDATA` the same way as for EXEs.

### 10.5 Static vs. Dynamic Linking

When runtime packages are disabled, Delphi statically links RTL/VCL code into the binary. This results in:
- Larger binary size (can be 5-50+ MB)
- Multiple copies of the same RTL code across binaries on the same system
- Self-contained binary not dependent on BPLs

When runtime packages are enabled:
- Smaller EXE, depends on BPL files
- Shared RTL/VCL memory across processes
- BPL files must be present at load time
- Version compatibility between BPLs must be maintained

---

## 11. Obfuscation & Deobfuscation

### 11.1 DProtector

DProtector is a commercial protector targeting Delphi applications specifically. Techniques include:
- **Code encryption**: Decrypts code sections at runtime before execution
- **Import table obfuscation**: Hides API imports
- **Anti-debugging**: `IsDebuggerPresent`, `NtQueryInformationProcess`, timing checks
- **Integrity checks**: CRC verification of code sections
- **RTTI stripping**: Removes or obfuscates VMT/RTTI metadata (breaks decompilers)

Deobfuscation approach: dump the process memory after the loader has decrypted sections, then apply standard Delphi RE tools to the dumped image.

### 11.2 VMProtect for Delphi

VMProtect virtualizes selected code regions into custom bytecode executed by an embedded VM interpreter.

**VMProtect 2 characteristics:**
- Multiple VM types per binary (configurable)
- Threaded-code dispatch (no centralized decode-dispatch loop)
- Mixed Boolean-Arithmetic (MBA) expression obfuscation
- Operand encryption
- Opaque predicates and dead store insertion
- Context switch with real/decoy pairs (same stack depth)

**VM entry detection:**
- Abrupt control flow change
- Context saving (push all registers)
- JMP into handler array
- Unique encrypted preamble

**Deobfuscation approaches:**

1. **Static analysis** — Identify VM handlers, profile them, lift virtual bytecode to IL, convert back to native
   - Requires per-handler profiling
   - Brittle across VMProtect versions
   - Projects: vmp2 [33](https://github.com/backengineering/vmp2)

2. **Dynamic tracing** (more effective) — Execute the function, record trace T', filter VM noise
   - T' = T + VM(T): original instructions + VM machinery
   - Use symbolic execution to isolate input->output relations
   - Lift to LLVM-IR for optimization and recompilation
   - Jonathan Salwan's VMProtect-devirtualization project: Pin tracing + Triton symbolic execution + LLVM [34](https://github.com/JonathanSalwan/VMProtect-devirtualization)

3. **VMPredator** — Core-structure-based automated analysis using semantic anchors:
   - Define triple <VM Entry, VM Exit, set of handlers> as anchor
   - Extract operational sequences from execution traces
   - Symbolic execution to produce pre/post state expressions

4. **Pushan** — Trace-free deobfuscation:
   - VPC-sensitive, constraint-free symbolic emulation
   - Recovers complete CFG of virtualized function
   - Decompiles to C pseudocode
   - Obfuscator-specific simplifications for VMProtect patterns [35](https://arxiv.org/pdf/2603.18355)

**Limitations:**
- Devirtualization typically recovers one execution path per trace
- Full CFG coverage requires systematic path exploration
- MBA expressions reduce but do not fully eliminate with standard LLVM passes
- Obfuscator version updates break handler-specific analysis

### 11.3 Themida / WinLicense

Themida and WinLicense are commercial protectors that also target Delphi. Features:
- Code virtualization (multiple VM layers)
- API hook detection
- Anti-debugger and anti-emulator
- Import protection
- Resource encryption (including DFM resources)

DFM resources are encrypted in the `.rsrc` section and decrypted at runtime. Extraction requires running the binary to trigger decryption, then dumping the process memory and reading the decrypted TPF0 resources [36](https://arxiv.org/abs/1909.01752).

### 11.4 General Deobfuscation Strategy

For Delphi-specific protectors:

1. **Unpack first**: Use process dumping (Scylla, x64dbg + OllyDump) after the unpacking stub runs
2. **Rebuild imports**: Check for stolen/hooked import tables
3. **Check for RTTI stripping**: If VMT scanning finds no classes, look for user-mode callbacks or compare .text section size against typical Delphi binaries
4. **DFM extraction from memory**: If DFM resources are encrypted on disk, attach a debugger post-initialization and enumerate RCDATA resources from the process heap
5. **Apply standard tools to dumped image**: IDR, IDA + DelphiHelper, or undelphi
6. **Check for anti-IDR measures**: Some protectors detect IDR by window class/section name and alter behavior

---

## 12. References

1. Embarcadero. "Delphi RTTI and C++Builder." RAD Studio Documentation. https://docwiki.embarcadero.com/RADStudio/en/Delphi_RTTI_and_C++Builder
2. BinFlip. "undelphi — Rust static-analysis library." GitHub. https://github.com/BinFlip/undelphi
3. Embarcadero. "System.PackageInfoTable." RAD Studio API Documentation. https://docwiki.embarcadero.com/Libraries/en/System.PackageInfoTable
4. Fravia. "aitodelp.htm: Delphi Reverse Engineering - DFM Files." https://www.fravia-reverse.sever.com.hr/aitodelp.html
5. ESET. "DelphiHelper — IDA Pro plugin." GitHub. https://github.com/eset/DelphiHelper
6. Embarcadero. "Internal Data Formats (Delphi)." RAD Studio Documentation. https://docwiki.embarcadero.com/RADStudio/en/Internal_Data_Formats_(Delphi)
7. Hallvard Vassbotn. "Hack #8: Explicit VMT calls." Hallvard's Blog. https://hallvards.blogspot.com/2006/03/hack-8-explicit-vmt-calls.html
8. Stack Overflow. "Where can I find information on the structure of the Delphi VMT?" https://stackoverflow.com/questions/760513
9. NCC Group. "Pythia — Delphi RTTI extraction tool." GitHub. https://github.com/nccgroup/pythia
10. Hallvard Vassbotn. "Under the hood of published methods." Hallvard's Blog. https://hallvards.blogspot.com/2006/05/under-hood-of-published-methods.html
11. Embarcadero. "System.TypInfo.TTypeKind." RAD Studio API Documentation. https://docwiki.embarcadero.com/Libraries/en/System.TypInfo.TTypeKind
12. WenzWenzWenz. "DelphiReSym — Ghidra plugin." GitHub. https://github.com/WenzWenzWenz/DelphiReSym
13. Embarcadero. "String Types (Delphi)." RAD Studio Documentation. https://docwiki.embarcadero.com/RADStudio/en/String_Types_(Delphi)
14. Embarcadero. "System.AnsiString." RAD Studio API Documentation. https://docwiki.embarcadero.com/Libraries/en/System.AnsiString
15. Embarcadero. "System.UnicodeString." RAD Studio API Documentation. https://docwiki.embarcadero.com/Libraries/en/System.UnicodeString
16. Fravia. "Delphi Reverse Engineering - DFM Files, Windows RCDATA and Object Conversion Routines." http://www.woodmann.com/fravia/dafix_t1.htm
17. IS4. "Delphi form data (TPF0) binary format." IS4 Code Blog. https://is4code.blogspot.com/2022/03/delphi-form-data-tpf0-binary-format.html
18. undelphi DFM parser documentation. https://docs.rs/undelphi/latest/undelphi/dfm
19. XN Resource Editor. Embarcadero Code Central. https://cc.embarcadero.com/item/25783
20. Hallvard Vassbotn. "Method calls compiler implementation." Hallvard's Blog. https://hallvards.blogspot.com/2006/03/method-calls-compiler-implementation.html
21. Embarcadero. "Exception Handling in the Modern C++ Toolchain." RAD Studio Documentation. https://docwiki.embarcadero.com/RADStudio/en/Exception_Handling_in_the_Modern_C++_Toolchain
22. Stack Overflow. "Delphi - unmangle names in BPL's." https://stackoverflow.com/questions/1591030
23. Microsoft. "Structured Exception Handling (C/C++)." https://learn.microsoft.com/en-us/cpp/cpp/structured-exception-handling-c-cpp
24. Stack Overflow. "C++Builder 12.2 error: cannot use C++ 'try' in the same function as SEH '__try'." https://stackoverflow.com/questions/79243789
25. Embarcadero Blogs. "Dynamic Packages in C++Builder 12.2!" https://blogs.embarcadero.com/dynamic-packages-in-cbuilder-12-2
26. crypto2011. "IDR — Interactive Delphi Reconstructor." GitHub. https://github.com/crypto2011/IDR
27. Aldeid. "IDR-Interactive-Delphi-Reconstructor." https://www.aldeid.com/wiki/IDR-Interactive-Delphi-Reconstructor
28. exetools Forum. "DeDe 3.10 Source Code Ported for Berlin 10.1." https://forum.exetools.com/showthread.php?p=119459
29. Alexey Hmelnov. "DCU32Int — DCU introspection tool." http://hmelnov.icc.ru/DCU/
30. Narkive. "Reverse engineering a BPL." https://borland.public.delphi.non-technical.narkive.com/UZ8JGroY
31. JavierusTk. "BPLDeps — BPL Dependency Analyzer." GitHub. https://github.com/JavierusTk/BPLDEPS
32. Stack Overflow. "How can I determine which libraries are used in a Delphi program?" https://stackoverflow.com/questions/5042588
33. backengineering. "vmp2 — VMProtect 2 analysis tools." GitHub. https://github.com/backengineering/vmp2
34. Jonathan Salwan. "VMProtect-devirtualization." GitHub. https://github.com/JonathanSalwan/VMProtect-devirtualization
35. Pushan. "Trace-Free Deobfuscation of Virtualization-Obfuscated Binaries." arXiv. https://arxiv.org/pdf/2603.18355
36. VMAttack. "Deobfuscating Virtualization-Based Packed Binaries." https://arxiv.org/pdf/1909.01752
