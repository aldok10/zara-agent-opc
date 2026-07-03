# Swift Runtime, ABI, and macOS/iOS Calling Conventions

TL;DR: Swift runtime model (type metadata, type descriptors, witness tables,
vtable layout, name mangling with demangling tools, generics specialization),
and OS X/iOS ABI specifics (System V AMD64 on macOS, ARM64 AAPCS64, PAC/arm64e
additions, Swift calling convention quirks).

See also: macos-objc-runtime.md, macos-fairplay-app-analysis.md, macos-lldb-re-workflow.md, macos-kernel-antire-dtrace.md

---

## 4. Swift Runtime

Swift's runtime model differs fundamentally from ObjC. Where ObjC is
dynamic-by-default, Swift prefers static dispatch but provides runtime metadata
for reflection, generics, and ObjC interop [4][25][26].

### 4.1 Swift vs ObjC Calling Convention Differences

| Aspect | Objective-C | Swift |
|--------|-------------|-------|
| Dispatch | Dynamic via `objc_msgSend` | Static by default; virtual via vtable |
| Method tables | Method lists per class (flat) | Vtable per class (array of IMPs) |
| Protocol dispatch | ObjC message send | Witness table (protocol conformance metadata) |
| Namespace | Global (flat) | Module-qualified mangled names |
| ABI stability | Stable (v2, 2006) | Stable since Swift 5.0 (2019) |
| `self` / `self` | Explicit parameter in msgSend | Hidden first parameter in registers |
| Struct ABI | Not applicable (ObjC objects are ref-counted heap) | Returned in registers or hidden sret |
| Error handling | NSError** pattern | `throws` → error in hidden autoreleased pointer |

### 4.2 Swift Type Metadata

Every Swift type has a metadata record reachable via a global symbol [4][27]:

```c
struct Metadata {
    const MetadataKind kind;    // low bits encode kind (class, struct, enum, etc.)
};
```

For classes, the full structure is:

```c
struct ClassMetadata {
    MetadataKind kind;           // = Class (with ObjC flag bit)
    Class superClass;            // ObjC-compatible superclass pointer
    CacheData cache;             // (reserved for runtime cache)
    Data data;                   // (reserved for runtime data)
    // Class-specific:
    uint32_t classFlags;
    uint32_t instanceAddressPoint;
    uint32_t instanceSize;
    uint16_t instanceAlignMask;
    uint16_t runtimeReserved;
    uint32_t classObjectSize;
    uint32_t classObjectAddressPoint;
    const void *description;     // TypeDescriptor (nominal type descriptor)
    // ... vtable entries follow
};
```

### 4.3 Type Descriptors

Nominal type descriptors describe the structure of a type [4][27]:

```c
struct TargetTypeDescriptor {
    uint32_t flags;
    uint32_t parent;
    int32_t name;               // relative offset to demangled name string
    int32_t accessFunction;
    int32_t fieldDescriptor;
};
```

Flags encode: kind (class/struct/enum/protocol), resilience, and generic
parameters. The `name` is a relative offset from the descriptor's address.

Use `dsdump --swift` to dump Swift type information:

```bash
dsdump --swift /path/to/binary
```

### 4.4 Witness Tables (Protocol Conformance)

Protocol conformance metadata has the general structure [25][28]:

```c
struct ProtocolConformanceDescriptor {
    int32_t protocolDescriptor;    // relative offset to protocol descriptor
    int32_t nominalTypeDescriptor; // relative offset to type descriptor
    int32_t conformanceFlags;      // bits: isRetroactive, isConcrete, ...
    int32_t witnessTable;          // relative offset to witness table
};
```

The **witness table** is an array of function pointers implementing protocol
requirements. When a generic function calls a protocol method, Swift:
1. Loads the protocol conformance descriptor for the concrete type
2. Accesses the witness table from the conformance
3. Calls the specific function pointer at a fixed index

Format:
```c
struct WitnessTable {
    void *protocolRequirements[];  // ordered as declared in the protocol
    // Entries: function pointers, type metadata, associated type descriptors
};
```

### 4.5 Vtable Layout

Swift classes use a virtual table (vtable) for method dispatch (unless methods
are `final` or non-overridable). The vtable is appended **after** the class
metadata struct in memory [25]:

```
[ClassMetadata fields...]
[description pointer]
[vtable entry 0]   // first overridable method
[vtable entry 1]   // second overridable method
...
```

The vtable order matches the **source declaration order** of overridable
methods across the class hierarchy. Base class methods appear first, then
overrides at the same offset in the derived class's vtable.

To reconstruct the vtable from a binary:
1. Find the `__DATA,__objc_data` or `__DATA,__const` entry for the class metadata
2. Locate the `description` pointer (which is a type descriptor)
3. The vtable follows immediately after the metadata struct
4. Read function pointer addresses and cross-reference them to functions

### 4.6 Swift Name Mangling

Swift mangling uses a distinct scheme based on the Itanium ABI but with major
differences. Only the prefix is shared; the encoding is entirely Swift-specific
[4][29].

**Prefix evolution:**
- Swift 1-3: `_T0` prefix
- Swift 4+: `_$s` prefix

**Mangling structure:**
```
_$s<module><declaration><type>
```

| Component | Example | Meaning |
|-----------|---------|---------|
| Module | `14MyAppModule` | Length-prefixed module name |
| Declaration | `7MyClassC` | 7 chars class name + Kind |
| Kind suffix | `C` = Class, `V` = Struct, `O` = Enum, `P` = Protocol |
| Function | `4func` | 4 chars function name |
| Type list | `ySS_SitF` | (String, Int) -> Void |

Concrete example:
```
_$s4MyApp7MyClassC4funcSaySiG5countyF
```

Demangling:
```
_$s              - Swift prefix
4MyApp           - Module="MyApp"
7MyClassC        - Type="MyClass" (Class)
4func            - function="func"
SaySiG           - Array<Int> (Say = Array, Si = Int)
5count           - argument name="count"
y                - return type (void/y = Void)
F                - function
```

Demangling tools:

```bash
# Swift's built-in demangler
xcrun swift-demangle _$s4MyApp7MyClassC4funcSaySiG5countyF

# Inline demangling
nm binary | xcrun swift-demangle

# In code
import Foundation
let mangled = "_$s4MyApp7MyClassC4funcSaySiG5countyF"
let demangled = _stdlib_demangleName(mangled)
```

**Key kind identifiers:**

| Suffix | Meaning |
|--------|---------|
| C | Class |
| V | Struct |
| O | Enum |
| P | Protocol |
| M | Metatype |
| m | Metatype metaclass |
| c | Function (closure) |
| p | Tuple |
| q | Existential (any Protocol) |
| X | Special (box, etc.) |
| y | Void return |
| S | Standard type prefix |
| Sa | Array (actually Say) |
| SDS | Dictionary |
| Si | Int |
| Sf | Float |
| Sb | Bool |
| SS | String |

### 4.7 Generics Specialization

Swift specializes generic functions at compile time for concrete types. Each
specialization creates a new copy of the function with concrete types baked
in. In disassembly, look for:

- Multiple copies of similar functions with different type metadata references
- Calls passing type metadata pointers in hidden parameters
- `__swift_instantiateConcreteTypeFromMangledName` calls
- Access to field descriptors for generic struct layout

COW (Copy-on-Write) structures (Array, String, Dictionary, Set) use a
`_swift_bridgeObject` tag to inline small values. The tag is encoded in the
low bits of the pointer/bridge object. When reversing, check the size and
retain count fields before assuming heap allocation.

---

## 6. OS X / iOS ABI Specifics

### 6.1 System V AMD64 ABI on macOS (x86-64)

macOS x86-64 follows the System V AMD64 ABI with Apple-specific variations
[5][30]:

- **Register order:** RDI, RSI, RDX, RCX, R8, R9 (same as Linux)
- **Stack alignment:** 16-byte before `call`
- **Red zone:** 128 bytes below RSP (available for leaf functions)
- **No shadow space** (unlike Windows x64)
- **ObjC ABI:** `self` in RDI, `_cmd` in RSI, args in RDX, RCX, R8, R9
- **Block ABI:** Block object passed in RDI, `self` in RSI (for block invocations)

**Apple-specific differences from Linux:**

| Feature | macOS | Linux |
|---------|-------|-------|
| TLS storage | `%gs:0x0` base | `%fs:0x0` base |
| Stack probe | `___stack_chk_fail` | `__stack_chk_fail` |
| PIC model | Default (PIE) | Position-dependent default |
| Dynamic linking | dyld | ld-linux.so |
| Syscall ABI | Mach traps via libSystem | Direct `syscall` instruction |
| C++ demangling | Itanium ABI | Itanium ABI (same) |
| Section names | `__TEXT,__text` | `.text` |

### 6.2 ARM64 macOS/iOS (AAPCS64)

Apple platforms use ARMv8-A (arm64) following the AAPCS64 (Procedure Call
Standard for the ARM 64-bit Architecture) with Apple modifications [31]:

- **Register X0-X7**: Parameter passing (integer/pointer)
- **X0**: Return value
- **X8 (x8)**: Indirect result location (hidden struct return pointer)
- **X9-X15**: Scratch (caller-saved)
- **X19-X28**: Callee-saved
- **X29**: Frame pointer (FP)
- **X30**: Link register (LR)
- **SP**: Stack pointer (must be 16-byte aligned)
- **PC**: Program counter
- **V0-V7**: FP/SIMD parameter passing (float, double, vector types)
- **V8-V15**: Callee-saved (only lower 64 bits per register)

**Apple ARM64e (Pointer Authentication) additions:**
- Aarch64e adds PAC instructions: `pacibsp`, `autibsp`, `paciza`, `autiza`
- Function pointers and return addresses are signed with a hardware key
- The high 16 bits of the pointer contain the PAC signature
- Before dereferencing: `autiax`/`autib` instructions authenticate and strip PAC
- Reverse engineering impact: disassembly shows PAC instructions that must be
  emulated by the tool; breakpoints on authenticating instructions may trigger
  if the signature is invalid

**Prologue pattern (arm64):**
```asm
stp    x29, x30, [sp, #-0x10]!   ; save FP + LR
mov    x29, x30                    ; set FP
sub    sp, sp, #0x20               ; allocate 32 bytes for locals
...
; Epilogue
add    sp, sp, #0x20
ldp    x29, x30, [sp], #0x10      ; restore FP + LR
ret
```

**Apple "stretched" return convention:**
- Structs larger than 16 bytes: returned via hidden pointer in X8
- Structs 16 bytes or smaller: returned in X0, X1 (or X0 alone)
- `objc_msgSend_stret` used for ObjC methods returning large structs

### 6.3 Swift Calling Convention Quirks [25][26]

| Aspect | Swift behavior |
|--------|---------------|
| `self` in register | First non-parameter register (X0 for ARM64, RDI for x86-64) |
| Error out-param | When `throws` is used, a hidden `NSError**` pointer follows the last parameter |
| Protocol method call via existential | Witness table pointer passed as a hidden parameter alongside the value |
| Inline struct return | Small structs returned in registers X0-X1 (not via X8) |
| COW optimization | Access to `Array`/`String` via `isUnique` check before mutation |
| ObjC interop | `@objc` methods use ObjC calling convention (msgSend dispatch) |
| Thick vs thin function pointers | Thick pointers = function ptr + context (metadata); thin = just function ptr |
