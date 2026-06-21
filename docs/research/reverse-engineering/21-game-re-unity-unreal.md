# Game Reverse Engineering — Unity (Mono + IL2CPP), Unreal Engine, and General Game Hacking

Authorized-analysis knowledge base. Scope: decompiling, disassembling, and modifying video
game binaries and assets across Unity (Mono and IL2CPP), Unreal Engine 4/5, and common game
hacking toolchains. Use only on binaries you own or are explicitly authorized to analyze.
Modifying game binaries almost always breaches EULAs and may violate anti-cheat policies.

---

## 1. Unity Mono — Managed Assembly Structure

Unity Mono games ship managed DLLs (CIL bytecode + metadata) that are trivially
decompilable with standard .NET tools. The scripting backend compiles C# into platform-independent
IL assemblies stored in `Managed/` subdirectories.

### Assembly layout

```
<game>/<AppName>_Data/Managed/
├── Assembly-CSharp.dll        # Game-specific user code (primary target)
├── Assembly-CSharp-firstpass.dll  # Code in Standard Assets / Plugins folders
├── UnityEngine*.dll           # Engine API (UnityEngine.CoreModule, etc.)
├── Unity.*.dll                # Unity package assemblies
├── Mono.*.dll                 # Mono runtime libraries
├── mscorlib.dll               # Core .NET library (Unity 2018 and earlier)
├── System*.dll                # Standard .NET libraries
└── *.dll                      # Third-party plugins, other assemblies
```

`Assembly-CSharp.dll` is the crown jewel. It contains every `MonoBehaviour` script, game
manager, UI handler, and core game logic. Decompile with ILSpy, dnSpyEx, or dotPeek for
near-complete C# recovery [1](https://github.com/icsharpcode/ILSpy).

### GameObject → Component hierarchy

Unity's scene object model is a tree of `GameObject` entities, each holding an ordered list
of `Component` instances. In memory (Mono):

```
GameObject
├── m_Component (array of PPtr<Component>)
├── m_Name (string)
├── m_Tag (int)
├── m_Layer (int)
├── m_Scene (Scene)
├── m_IsActive (bool)
└── m_StaticEditorFlags (int)

Component (abstract base)
├── gameObject (PPtr<GameObject>)
├── m_Enabled (bool)
└── --- concrete subtypes:
    ├── Transform (position, rotation, scale, parent, children)
    ├── MonoBehaviour (scripts via m_Script PPtr)
    ├── Renderer, Collider, Rigidbody...
    └── ...
```

In managed memory, a `MonoBehaviour` is referenced by a `PPtr<MonoBehaviour>` which pairs
a `m_FileID` (0 for current asset) with a `m_PathID` (a 64-bit identifier). Finding the
actual `MonoBehaviour` gives you access to the fields you care about [2](https://github.com/Perfare/AssetStudio).

### Decompiling with dnSpy/ILSpy

```bash
# Cross-platform CLI (ILSpy)
dotnet tool install --global ilspycmd
ilspycmd --list-type Assembly-CSharp.dll   # list all classes
ilspycmd -il Assembly-CSharp.dll           # show IL bytecode
ilspycmd Assembly-CSharp.dll -p -o ./src/  # whole-project decompile

# ILSpy GUI / dnSpyEx GUI
# Open DLL -> Tree view of namespaces -> methods -> decompiled C#
# dnSpyEx: right-click method -> Edit Method (IL) -> patch -> Save Module
```

dnSpyEx is the preferred tool for patching because it can modify IL bytecode inline and
re-save the assembly [3](https://github.com/dnSpyEx/dnSpy).

### Mono metadata — global-metadata.dat (pre-IL2CPP note)

In Mono mode, the metadata is embedded in each DLL as ECMA-335 metadata tables. There is
no separate `global-metadata.dat`. That file only ships with IL2CPP builds (see
Section 2). For Mono, the metadata tables (`#Strings`, `#US`, `#Blob`, `#GUID`, `#~`) are
inside the PE file itself [4](https://www.ecma-international.org/publications-and-standards/standards/ecma-335/).

---

## 2. Unity IL2CPP — Native Code Generation

IL2CPP (Intermediate Language To C++) converts managed CIL bytecode into C++ source, then
compiles that C++ into a native binary (`.so` on Android, `.dll` on Windows, `.dylib` on
macOS). This removes the JIT step and makes reversing much harder — but not impossible.

### The IL2CPP pipeline

```
C# source
    ──csc──▶ CIL assemblies (DLLs)
    ──il2cpp──▶ Generated C++ (.cpp per assembly + bulk files)
    ──clang/msvc──▶ Native shared library (libil2cpp.so / GameAssembly.dll)
```

The C++ output is not human-readable source. Method names are mangled, strings are stored in
a separate metadata file, and reflection data is stripped from the binary into
`global-metadata.dat` [5](https://github.com/Perfare/Il2CppDumper).

### Key files

| File | Role |
|------|------|
| `global-metadata.dat` | Symbol names, type definitions, field/method names, string literals |
| `libil2cpp.so` (Android) / `GameAssembly.dll` (Windows) | Compiled C++ — contains code and runtime data |
| `il2cpp_data/` (Unity Editor only) | Intermediate generated C++ before native compilation |

`global-metadata.dat` is the offset key. Without it, you have a native binary with no symbol
names. With it, you can map every function pointer back to its C# origin [6](https://katyscode.wordpress.com/2021/02/23/il2cpp-finding-obfuscated-global-metadata/).

### global-metadata.dat structure

```
Offset  Size  Field
0x00    4     Sanity check (usually signature)
0x04    4     Version
0x08    4     String pool offset
0x0C    4     String pool size
0x10    4     Type definitions offset
...     ...   ...

String pool: contiguous null-terminated UTF-8 strings
TypeDef: array of type information records
MethodDef: method name, class, signature, method pointer offset
FieldDef: field name, type, offset in object
```

Perfare's Il2CppDumper reads this structure and uses the method pointer offsets to locate
functions in the native binary. The two files must match (same Unity build) [7](https://github.com/Perfare/Il2CppDumper).

### Symbol recovery with Il2CppDumper

```bash
# Basic usage (Windows/Linux/macOS)
Il2CppDumper <libil2cpp> <global-metadata> <output-dir>

# Output files:
#   dump.cs           — All classes, methods, fields (readable summary)
#   script.json       — Structured metadata (machine-parsable)
#   il2cpp.h          — C++ header with offsets and signatures
#   string.json       — All string literals from the game
```

Example `dump.cs` output:

```csharp
// Namespace: GameName
public class PlayerController : MonoBehaviour
{
    // RVA: 0x4A23B0 Offset: 0x4A23B0 VA: 0x1804A23B0
    public int m_Health; // 0x4, 0x4
    public string m_PlayerName; // 0x8, 0x8
    public float m_Speed; // 0xC, 0xC

    // RVA: 0x4A2100 Offset: 0x4A2100 VA: 0x1804A2100
    public void Awake();

    // RVA: 0x4A2200 Offset: 0x4A2200 VA: 0x1804A2200
    public void Update();
}
```

The method addresses (RVA/Offset) tell you exactly where in the native binary each function
lives. You can then set breakpoints, hook, or read those functions in IDA/Ghidra [7](https://github.com/Perfare/Il2CppDumper).

### Il2CppInspector — Python-based analysis

Il2CppInspector takes a different approach: it scans the binary for IL2CPP runtime data
structures (method tables, type info) and reconstructs metadata without needing every file
to match perfectly. It produces Ghidra/IDA Python scripts for auto-renaming [8](https://github.com/djkaty/Il2CppInspector).

```bash
# Il2CppInspector CLI
python il2cpp_inspector.py --binary libil2cpp.so --metadata global-metadata.dat

# Generates:
#   il2cpp_inspector _script.py  — Ghidra/IDA script
#   il2cpp_inspector _types.cs   — Type layout definitions
#   il2cpp_inspector _dump.cs    — Similar to Il2CppDumper output
```

Key difference: Il2CppInspector scans the binary's actual runtime structures (type info
page, method pointer tables) rather than just parsing offsets from the metadata file. This
makes it more resilient to metadata tampering [8](https://github.com/djkaty/Il2CppInspector).

### Method pointer reconstruction

IL2CPP stores method pointers in a `MethodPointerTable` at a known offset in the binary.
Each method has two entries:

| Entry | Purpose |
|-------|---------|
| **methodPointer** | Executable code address — the actual function |
| **invokerMethodPointer** | Thunk that handles the `MethodInfo*` calling convention |

Il2CppDumper reads the `codeGenModule` or `genericMethodPointers` array to locate these
entries. On Unity 2020+, generic methods use a separate pointer table with indirection [9](https://gist.github.com/toasterparty/57a50eddc2203fc6ca24cf96789f5dd2).

### il2cpp_string_new and runtime strings

IL2CPP stores string literals in `global-metadata.dat`, not in the binary. At runtime,
strings are created via `il2cpp_string_new(const char* str)` — a function in `libil2cpp`
that allocates and initializes an `Il2CppString` object. To find runtime-decrypted strings,
hook `il2cpp_string_new`:

```csharp
// C++ MinHook example
Il2CppString* (*original_il2cpp_string_new)(const char* str);
Il2CppString* hook_il2cpp_string_new(const char* str) {
    printf("[String] %s\n", str);
    return original_il2cpp_string_new(str);
}

MH_CreateHook((LPVOID)il2cpp_string_new_addr, hook_il2cpp_string_new,
              (LPVOID*)&original_il2cpp_string_new);
MH_EnableHook((LPVOID)il2cpp_string_new_addr);
```

This captures every string literal and runtime decrypted string [10](https://github.com/vfsfitvnm/frida-il2cpp-bridge).

### Metadata obfuscation detection

Some games encrypt or compress `global-metadata.dat`. Signs:
- Magic bytes are not the expected signature (e.g. `0x00 0x00 0x00 0x00`)
- Il2CppDumper fails with "wrong magic" or "invalid metadata"
- File size is unexpectedly small or large

Mitigation: find the Unity `il2cpp::vm::MetadataLoader::LoadMetadataFile` call in the
binary, set a breakpoint, dump the buffer after decryption. This is where the game calls
its custom decryption before handing data to the IL2CPP runtime [6](https://katyscode.wordpress.com/2021/02/23/il2cpp-finding-obfuscated-global-metadata/).

### frida-il2cpp-bridge (runtime hooking)

Frida-based module for hooking IL2CPP at runtime without static analysis. It scans the
IL2CPP runtime structures in memory and provides a high-level JS API [11](https://github.com/vfsfitvnm/frida-il2cpp-bridge).

```javascript
// frida-il2cpp-bridge example
const PlayerController = Il2Cpp.Domain.Assembly("Assembly-CSharp")
    .Class("PlayerController");

const Update = PlayerController.Method("Update");
Update.Implement(function() {
    this.Method("set_Health").Invoke(999);  // godmode
    this.Update();  // call original
});
```

Works on both Android (rooted device + frida-server) and Windows (Frida gadget injection)
[11](https://github.com/vfsfitvnm/frida-il2cpp-bridge).

---

## 3. Unity Asset RE — AssetBundles, Assets, and Extraction

Unity stores game assets (textures, meshes, audio, shaders, ScriptableObjects) in one of
two formats:

| Format | Extension | Typical use |
|--------|-----------|-------------|
| **SerializedFile** | `.assets`, `.unity3d` | Standalone asset files |
| **AssetBundle** | `.bundle`, `.unity3d`, any | Compressed/archive of multiple assets |

### UnityFS / BundleFile format

AssetBundles use the **UnityFS** format (or legacy `.unity3d` format). The BundleFile
header:

```
Offset  Size  Field
0x00    6     Signature ("UnityFS")
0x06    4     Version (e.g. 6)
0x0A    4     Unity version string offset
0x0E    4     Unity version string size
...     ...   ...
0x1A    8     Total file size
0x22    8     Compressed data header size
0x2A    12    Flags (compression type: None, LZMA, LZ4, LZ4HC)
...     ...   Block entries...
```

Streamed blocks follow the header. Each block may be individually compressed. The blocks
contain individual SerializedFile entries (the actual assets) [12](https://github.com/Perfare/AssetStudio).

### AssetStudio — extraction and export

[AssetStudio](https://github.com/Perfare/AssetStudio) is the gold standard for Unity asset
extraction. It parses BundleFile, SerializedFile, and resource files, then exports assets
to usable formats.

```bash
# AssetStudioGUI.exe
# File -> Open Folder -> select game's Data directory or a .assets file
# Loads all assets, shows tree by type (Texture2D, GameObject, etc.)
# Export -> Selected assets / All assets / Filtered

# Export formats:
#   Texture2D → PNG/TGA/BMP/DDS
#   Mesh      → OBJ/STL/PLY
#   AudioClip → WAV/MP3/OGG
#   TextAsset → raw text
#   MonoBehaviour → JSON (with type info)
```

Key feature: AssetStudio decompiles the `MonoBehaviour` type tree using type information
from the game's assemblies, so you can inspect serialized fields of every ScriptableObject
and MonoBehaviour [2](https://github.com/Perfare/AssetStudio).

### AssetRipper — modern replacement

[AssetRipper](https://github.com/AssetRipper/AssetRipper) is a newer, actively maintained
tool that converts Unity assets into a format that can be re-imported into the Unity Editor.
It generates a full Unity project structure including prefabs, scenes, and project settings
[13](https://github.com/AssetRipper/AssetRipper).

```bash
# AssetRipper CLI
AssetRipper <input> -o <output-dir>
# Input: .assets, .bundle, .unity3d, or directory
# Output: Unity project (Assets/, ProjectSettings/, Packages/, etc.)
```

### UABE / UABEA — asset editing

[UABE](https://github.com/SeriousCache/UABE) (Unity Asset Bundle Extractor) and its
successor [UABEA](https://github.com/nesrak1/UABEA) allow not just extraction but
**editing** of asset data. This is how modders replace textures, edit dialogue strings,
or modify game balance values [14](https://github.com/SeriousCache/UABE).

```bash
# UABE workflow
# 1. Open .assets or AssetBundle
# 2. Select asset (e.g. Texture2D, MonoBehaviour, TextAsset)
# 3. View Data -> edit float/int/string fields directly
# 4. Export .txt / .png -> modify -> Import
# 5. Save
```

### Shader (ShaderLab) reversing

Unity shaders are stored as `.shader` assets containing:
- **ShaderLab** text (the Unity shaderlab declaration: Properties, SubShaders, Passes)
- Compiled shader bytecode (DXBC/GLSL/SPIR-V) per graphics API

AssetStudio can extract the ShaderLab properties and subshader structure, but not the
compiled bytecode. For that:

1. Extract the shader asset with AssetStudio
2. Read the `Shader` data blob (compiled shader bits)
3. Use `DXBC` / `DXIL` disassemblers for DirectX, or `spirv-cross` for Vulkan
4. For GL: use `glslangValidator` to reconstruct

Tools: **RenderDoc** (frame capture) can capture live shaders from any game without
extracting assets, which is often easier [15](https://renderdoc.org/).

### .unity3d extraction (legacy format)

Older Unity games (4.x and earlier) use the `.unity3d` web player format. Extracting:

```bash
# Assets from Unity Web Player / early standalone games
# Tools: Unity Web Player Extract (discontinued), AssetStudio handles it
# Structure: simple BundleFile with uncompressed SerializedFiles
```

---

## 4. Unreal Engine — Binary Structure and Reflection System

Unreal Engine 4/5 games ship as native C++ binaries. Unlike Unity Mono, there are no
managed assemblies. The reflection system (UProperty system) is the key to understanding
the binary.

### UE binary structure

```
<GameDir>/
├── <GameName>/Binaries/
│   └── Win64/
│       ├── <GameName>-Win64-Shipping.exe  # Game executable (launcher)
│       └── <GameName>Core.dll             # Or monolithic .exe
├── <GameName>/Content/Paks/
│   ├── pakchunk0_something.pak            # Game content archives
│   ├── pakchunk1_something.pak
│   └── *-Win64-Shipping.pak
└── Engine/Content/...                      # Engine assets
```

UE4/UE5 can be built as monolithic (everything in one .exe) or modular (DLLs per module).
Most shipping builds use monolithic because it is harder to modify [16](https://github.com/EpicGames/UnrealEngine).

### The UE reflection system

Unreal achieves C++ reflection through a **Generated C++ code** system. The Unreal Header
Tool (UHT) processes annotated C++ headers and produces generated files containing metadata.

Macro → generated file mapping:

| Macro | Generates |
|-------|-----------|
| `UCLASS()` | `<Class>.generated.h` — UClass descriptor with property list |
| `USTRUCT()` | `<Struct>.generated.h` — UScriptStruct descriptor |
| `UFUNCTION()` | Function signature, parameter list, thunk for BlueprintCallable |
| `UPROPERTY()` | Property metadata (offset, type, flags, category) |
| `UENUM()` | Enum type registration with display names |
| `UINTERFACE()` | Interface registration |

The generated code creates `static void __Register*()` functions that populate the
`UClass` / `UScriptStruct` / `UFunction` objects at startup. These are called from
`IMPLEMENT_MODULE` in the module startup path [17](https://ikrima.dev/ue4guide/engine-programming/uobject-reflection/reflection-internals-1/).

### UObject in memory

```
class UObject {
    FUObjectItem*             InternalIndex;   // index in global object array
    EObjectFlags              ObjectFlags;      // RF_* flags
    FName                     NamePrivate;      // object's FName
    UClass*                   ClassPrivate;     // pointer to the UClass
    UObject*                  OuterPrivate;     // outer (outer UObject)
    // ... more fields ...
};

class UClass : public UStruct {
    FClassCastFlags           ClassCastFlags;
    TArray<UFunction*>        FuncMap;          // all functions
    TArray<UProperty*>        PropertyLink;     // property chain
    UClass*                   SuperClass;       // parent class
    void*                     DefaultObject;    // CDO (Class Default Object)
    // ... + function/field maps
};
```

The `ClassPrivate` pointer tells you which class any `UObject` belongs to. You can walk
the class hierarchy and property list to understand the layout [18](https://www.unrealengine.com/zh-CN/blog/unreal-property-system-reflection).

### Property / member layout (UPROPERTY)

Properties form a linked list (`PropertyLink`) on each `UClass`. Each `UProperty` has:

| Field | Size | Purpose |
|-------|------|---------|
| `FProperty::ArrayDim` | 4 | Array dimension (1 for scalar) |
| `FProperty::ElementSize` | 4 | Size of one element in bytes |
| `FProperty::PropertyFlags` | 8 | CPF_* flags (BlueprintReadOnly, etc.) |
| `FProperty::Offset_Internal` | 4 | Byte offset from UObject base |
| `FProperty::NamePrivate` | (FName) | Property name |
| `FProperty::RepIndex` | 4 | Replication index (-1 if not replicated) |

Concrete property subtypes:

| Type | C++ class | Represents |
|------|-----------|------------|
| Bool | `FBoolProperty` | `bool` (bitfield) |
| Int | `FIntProperty` | `int32` |
| Float | `FFloatProperty` | `float` |
| Name | `FNameProperty` | `FName` |
| String | `FStrProperty` | `FString` |
| Text | `FTextProperty` | `FText` |
| Object | `FObjectProperty` | `UObject*` |
| Struct | `FStructProperty` | `UScriptStruct`-based types |
| Array | `FArrayProperty` | `TArray` |
| Map | `FMapProperty` | `TMap` |
| Set | `FSetProperty` | `TSet` |
| Enum | `FEnumProperty` | `UEnum`-backed enums |
| Byte | `FByteProperty` | `uint8`, also namespace-backed enums |
| Class | `FClassProperty` | `UClass*` references |
| Delegate | `FDelegateProperty` | `FScriptDelegate` |

Each subtype inherits from `FProperty` and adds type-specific data. For example,
`FStructProperty::Struct` points to the `UScriptStruct`, and `FArrayProperty::Inner`
points to the inner `FProperty` describing array elements [17](https://ikrima.dev/ue4guide/engine-programming/uobject-reflection/reflection-internals-2/).

### FName pool — name resolution

`FName` is UE's string pooling system. Each `FName` is a pair of `(Index, Number)` where
`Index` is an entry in a global name table (`FNamePool`).

```
FNamePool (singleton)
├── Blocks[] — memory blocks storing FNameEntry records
│   └── FNameEntry
│       ├── HashNext (next name in hash chain)
│       ├── Flags (wide string flag)
│       ├── Len (length of name string)
│       └── AnsiName / WideName (the actual name string, null-terminated)
```

In the binary, the name pool is in `.rdata` or `.data`. To resolve `FName` at runtime:
1. Read the `ComparisonIndex` from the `FName` struct (first 4 bytes)
2. Walk `FNamePool::Blocks` to locate the `FNameEntry` for that index
3. Read the string from the entry

FModel and UE Explorer automate this for all objects in a package [19](https://github.com/FModel/FModel).

### FString / FText memory layout

```
FString:
+0x00  wchar_t* Data    (pointer to wide char buffer)
+0x08  int32   NumEntries  (length excluding null terminator)
+0x0C  int32   Max    (allocated capacity)

FText:
+0x00  ETextFlag    Flags
+0x08  FTextData*   SharedData  (pointer to text data implementation)
+0x10  FHistory*    History     (history for localization)

FTextData subtypes:
  - FTextData_History (localized from namespace/key)
  - FTextData_Generated (rich text)
  - FTextData_Direct (simple string)
```

### TArray / TMap / TSet layout

```
TArray<T>:
+0x00  T*     Data     (contiguous array of T)
+0x08  int32  Num      (element count)
+0x0C  int32  Max      (allocated capacity)

TMap<Key,Value> (uses TSparseArray internally):
+0x00  TSparseArray<TPair<Key,Value>> Pairs
+0x20  FHashTable                     Hash

TSet<Element>:
+0x00  TSparseArray<Element> Elements
+0x20  FHashTable            Hash

FHashTable:
+0x00  int32* HashIndices   (array of indices into the sparse array)
+0x08  int32  HashSize      (size of hash index array)
+0x0C  int32  NumHashes     (number of used hashes)
```

### Package summary — export/import maps

Unreal packages (`.uasset`, `.umap`) contain:

| Section | Description |
|---------|-------------|
| **Package File Summary** | Header: version, total header size, compressed chunk info |
| **Name Table** | Array of FNameEntry entries (all names used in this package) |
| **Import Map** | References to objects in other packages (outer, class, name) |
| **Export Map** | Definitions of objects in this package (class, outer, name, serialized size, offset) |
| **Export Data** | Serialized object data (at offsets specified in Export Map) |

Reversing a package:
1. Parse the Package File Summary to find table offsets
2. Read the Name Table (all `FName` strings)
3. Read Import Map entries (resolved via FName table)
4. Read Export Map entries (know what objects exist and where their data is)
5. Extract and deserialize Export Data using type information [20](https://github.com/gildor2/UEViewer).

### ScriptStruct / Enum recovery

`UScriptStruct` = UE's version of C++ structs with reflection. In memory:

```
UScriptStruct:
+0x00  UStruct   Super
+0x28  UScriptStruct*  StructFlags   (STRUCT_* flags)
+0x30  UProperty*      PropertyLink (linked list of properties)
+0x38  int32           StructSize   (total serialized size)
+0x3C  uint8*          StructOps    (serialization/deserialization function table)
```

`UEnum` (for `UENUM()` types):

```
UEnum:
+0x00  UField    Super
+0x28  FString   CppType    (e.g. "EWeaponType")
+0x38  TArray<TPair<FName,int64>> Names  (display name → value pairs)
```

FModel reads these from the export data to reconstruct enum values and struct layouts [19](https://github.com/FModel/FModel).

---

## 5. UE4 Script / Blueprint VM Reversing

Blueprints are not compiled to native machine code. They are compiled to bytecode executed
by the **Blueprint Virtual Machine** (BPVM), a lightweight stack-based interpreter embedded
in every UE4/UE5 game.

### EExprToken — bytecode instruction set

The bytecode is stored in `UFunction::Script` as an array of `uint8`. Each instruction
starts with an opcode byte from `EExprToken` [21](https://intaxwashere.github.io/blueprint-part-two/).

| Opcode | Value | Description |
|--------|-------|-------------|
| `EX_LocalVariable` | 0x00 | Push local variable value |
| `EX_InstanceVariable` | 0x01 | Push instance variable (from UProperty) |
| `EX_DefaultVariable` | 0x02 | Push from class default object |
| `EX_Return` | 0x04 | Return from function |
| `EX_Jump` | 0x06 | Unconditional jump (4-byte offset) |
| `EX_JumpIfNot` | 0x07 | Conditional jump if false |
| `EX_Case` | 0x09 | Switch case |
| `EX_Nothing` | 0x0B | No-op |
| `EX_Let` | 0x0F | Assignment (load RHS, store to LHS) |
| `EX_ClassContext` | 0x12 | Call method on a specific object context |
| `EX_MetaCast` | 0x13 | Dynamic cast to class |
| `EX_LetBool` | 0x14 | Boolean assignment |
| `EX_StructMemberContext` | 0x16 | Push struct member |
| `EX_InstanceDelegate` | 0x1C | Create delegate from instance method |
| `EX_Context` | 0x1D | Object context (calls on a specific object) |
| `EX_ContextFail` | 0x1E | Context that may fail (null check) |
| `EX_VirtualFunction` | 0x1F | Call virtual function by name |
| `EX_FinalFunction` | 0x20 | Call final (native) function |
| `EX_IntConst` | 0x24 | Int32 constant |
| `EX_FloatConst` | 0x25 | Float constant |
| `EX_StringConst` | 0x27 | String constant (null-terminated) |
| `EX_UnicodeStringConst` | 0x29 | Wide string constant |
| `EX_ObjectConst` | 0x2A | Object reference constant |
| `EX_Self` | 0x33 | Push `this` object |
| `EX_StructConst` | 0x37 | Struct constant |
| `EX_SetArray` | 0x3A | Begin array assignment |
| `EX_ArrayConst` | 0x3D | Array literal |
| `EX_MapConst` | 0x3E | Map literal |
| `EX_CallMulticastDelegate` | 0x42 | Broadcast multicast delegate |
| `EX_LetWeakObjectPtr` | 0x46 | Weak object ptr assignment |

Each opcode is followed by operand bytes (variable length). For example, `EX_Jump` is
followed by 4 bytes (little-endian jump offset relative to the start of the function).

### Bytecode expression evaluation

The BPVM uses an expression-stack model:

```
EX_IntConst(42)   → push 42
EX_FloatConst(3.14) → push 3.14
EX_Self           → push this
EX_InstanceVariable(prop_offset) → push value of class property at offset
EX_Let            → pop RHS, pop LHS-ref, store RHS to LHS location
```

Complex expressions build up the stack, then operations consume values. The `Let` opcode
is how assignments work: the LHS is an expression producing a writable reference, the RHS
produces a value [22](https://jaydengames.com/posts/bpvm-bytecode-I/).

### Blueprint decompilers and tools

| Tool | Purpose |
|------|---------|
| **FModel** | Package/pak explorer with Blueprint bytecode viewer |
| **uPlayer / UE Explorer** | Full UE decompiler (community edition is free) |
| **Kismet Analyzer** | Blueprint/Kismet bytecode analysis and modding |
| **UnrealPak** | Official UE4/UE5 pak tool (extract/repack) |

FModel decompiles Blueprint bytecode into pseudo-C++:

```
// FModel output for a Blueprint function
void MyBlueprintFunction()
{
    local bool B1;        // local variable
    local int32 health;   // local variable
    
    health = 100;
    if (health > 0)
    {
        Self->TakeDamage(50.0f);
    }
}
```

uPlayer (UE Explorer) produces higher-quality decompilation with type reconstruction,
but the community edition is version-locked [23](https://eliotvu.com/blog/31/an-introduction-to-ue-explorer).

### Kismet / UE3 vs UE4 Blueprint

UE3 used **Kismet** (UnrealScript) with a different bytecode format than UE4/UE5
Blueprints. Key differences:

| Aspect | UE3 Kismet | UE4/5 Blueprint |
|--------|------------|-----------------|
| Language | UnrealScript (text) | Visual scripting → bytecode |
| VM | Legacy VM | BPVM (rewritten for UE4) |
| Bytecode | `EX_*` opcodes (same roots) | Extended `EExprToken` with new opcodes |
| Struct support | Limited | Full `UScriptStruct` support |
| Delegates | Functional | `FScriptDelegate` + multicast |

Tools like **Kismet Analyzer** work with both UE3 and UE4 bytecode formats [24](https://github.com/trumank/kismet-analyzer).

### Native function binding

Blueprint functions can call into native C++ functions. These are resolved at bytecode
execution time via the `UFunction` map. If you see `EX_FinalFunction` or `EX_VirtualFunction`
in bytecode, the operand is a name index (resolved through `FName`). The VM looks up the
function on the target object's class and calls it directly [21](https://intaxwashere.github.io/blueprint-part-two/).

---

## 6. UE4 Pak Files — Archives, Encryption, Extraction

Unreal Engine packages its content into **pak files** (`.pak`). These are compressed/encrypted
archives containing serialized asset data.

### Pak file structure

```
Pak File (little-endian integers):
┌──────────────────────────────────────────────┐
│ Magic: 0x5A6F12E1 (or 0x5A6F12E2 w/ FName)  │
│ Pak File Version                              │
│ Subversion                                    │
│ Index Offset (absolute offset to directory)   │
│ Index Size                                    │
│ SHA1 hash (20 bytes, or 0)                    │
│ ┌──────────────────────────────────────────┐  │
│ │ Compression Blocks (data)                │  │
│ │   Block1: compressed data (Zlib/LZ4)     │  │
│ │   Block2: ...                            │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ Mount Point (string)                     │  │
│ │ Pak File Directory (entries:             │  │
│ │   path, offset, size, compression)       │  │
│ └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

The directory index contains `FPakEntry` records:

```
FPakEntry:
+0x00  FName        Name
+0x0C  int64        Offset              (in pak file)
+0x14  int64        UncompressedSize
+0x1C  int64        CompressedSize
+0x24  uint32       CompressionMethod   (0=none, 1=Zlib, 2=Gzip, 3=LZ4, 4=Oodle)
+0x28  uint8[20]    Hash
+0x3C  int32        CompressionBlocks   (number of blocks)
...     ...         Compressed block entries (if > 0) ...
```

### AES encryption

UE4/5 supports **AES-256 encryption** for pak files. The encryption key is 32 bytes and
is either:
- Hardcoded in the game executable (look for a 32-byte constant used with AES functions)
- Derived from a **CryptoKeys** configuration in the project settings
- Stored in an encrypted `.key` file distributed with the game

When AES is enabled:
- The directory index is encrypted (AES ECB)
- Individual compressed blocks may also be encrypted
- The magic constant and pak version at the top remain unencrypted

FModel prompts for an AES key on first load. The key can be dumped from the binary by
finding the call to `FAES::Decrypt` and extracting the key parameter [19](https://github.com/FModel/FModel).

```bash
# FModel configuration for AES key
# Settings -> AES Manager -> Add Key
# Format: 0x00, 0x01, ... 0x1F (32 bytes hex)
```

### Extracting with FModel

[FModel](https://github.com/FModel/FModel) is the primary UE4/UE5 asset browser. It reads
pak files, decrypts/decompresses them, and displays asset content.

```bash
# FModel workflow
# 1. File -> Open Folder -> select Game/Content/Paks/
# 2. If AES key needed: Settings -> AES Manager -> add key
# 3. Browser shows all packages in tree view
# 4. Select asset -> properties/decompiled bytecode/export data panels
# 5. Export -> Save as .uasset/.glb/.wav/.png (depending on type)
```

### UnrealPak — official extraction/repack

Epic ships [UnrealPak.exe](https://github.com/EpicGames/UnrealEngine) with the engine.
It is also distributed by modding communities for UE4/UE5 games.

```bash
# List contents
UnrealPak.exe "Game-Windows.pak" -List

# Extract all files
UnrealPak.exe "Game-Windows.pak" -Extract "C:\Output"

# Extract specific file
UnrealPak.exe "Game-Windows.pak" -Extract "C:\Output" -Paths="Game/Content/Maps/Level1.umap"

# Create new pak (for modding)
UnrealPak.exe "NewMod_P.pak" -Create="FileList.txt"

# Repack with compression
UnrealPak.exe "Modded_P.pak" -Create="FileList.txt" -compress
```

### Pak chunk structure (Fortnite-style)

Modern UE4/UE5 games (especially Fortnite) use a chunked pak system:

```
pakchunk0_optional_1_P.ucas  # Chunk data (contains actual content)
pakchunk0_optional_1.utoc    # Table of contents (offset/flag data)
pakchunk0_optional_1.pak     # Legacy pak container
```

The `.utoc` (Unreal Table of Contents) + `.ucas` (Unreal Chunk Atomic Store) format was
introduced in UE4.25+ for faster loading on console SSDs. FModel and UEViewer support this
format [19](https://github.com/FModel/FModel).

### UEViewer (UModel) — alternative extraction

[UEViewer](https://github.com/gildor2/UEViewer) by gildor2 is an older but still useful
tool for UE1–UE4 asset viewing. It specializes in mesh/animation preview rather than
general browsing [20](https://github.com/gildor2/UEViewer).

```bash
# UEViewer CLI
umodel.exe -game=game_name -path="Game\Content\Paks" -export "PackageName"
# -game flag selects engine version and game-specific overrides
# Exports to umodel_export/ directory
```

---

## 7. Game Memory Hacking — Cheat Engine Workflow

Cheat Engine (CE) is the primary tool for runtime game memory manipulation. It works by
scanning a process's address space, filtering results, and modifying values.

### Basic scan workflow

```
1. Attach CE to process (File → Open Process)
2. Set Value Type (typically 4 Bytes for int32, Float for health, etc.)
3. First Scan → get all matching addresses
4. Change value in-game → Next Scan (changed value or increased/decreased)
5. Repeat until 1-10 addresses remain
6. Add address(es) to address list
7. Double-click value → modify → game updates
```

| Scan type | When to use |
|-----------|-------------|
| Exact Value | Known number (health=100, ammo=30) |
| Unknown Initial Value | Unknown starting value |
| Increased / Decreased | Value that changes directionally |
| Changed / Unchanged | Value changes predictably |
| Between / Less / Greater | Bounding scans |
| Array of Bytes | Known byte pattern (AOB scan) |

### Pointer scanning — multi-level pointers

Static addresses rarely work across game restarts (ASLR). **Pointer scanning** finds
multi-level pointer chains that always resolve to the target value [25](https://www.oreilly.com/library/view/game-hacking/9781492017462/xhtml/ch01.xhtml).

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ Base    │ ──▶ │ Pointer 1    │ ──▶ │ Pointer 2    │ ──▶ │ Health   │
│ Address │     │ +0x1A0       │     │ +0x2C0       │     │ (int32)  │
│ (module │     │              │     │              │     │          │
│  base)  │     └──────────────┘     └──────────────┘     └──────────┘
```

CE pointer scan workflow:

```
1. Find target address (e.g., 0x04A2F1C0 for health)
2. Right-click → "Find what accesses this address"
3. Play game until value changes → instruction logged (e.g., mov [ecx+2C0],eax)
4. Note offset [+0x2C0]
5. Right-click → "Find what writes to this pointer" → find another level
6. Or: "Pointer Scan for this address"
   → Scan depth (e.g., 5 levels)
   → Max offset (e.g., 4096)
   → Scan → results sorted by "Offset"
7. Reboot game → rescan → only stable chains survive
```

A stable pointer chain looks like:
```
"<GameName>.exe"+0x017B2A8 → +0x1A0 → +0x2C0 → +0x10
```

Written in CE Lua:
```lua
local health = readPointer(readPointer(readPointer(
    getAddress("GameName.exe") + 0x017B2A8) + 0x1A0) + 0x2C0) + 0x10
```

### Code injection — Auto Assembler

CE's Auto Assembler injects assembly code into the target process. Templates make this
easier [26](https://cheatengine.org/help/CodeInjectionandtheautoassembler.htm).

```asm
// Auto Assembler template: infinite health
[ENABLE]
// Code injection at the instruction that writes to health
GameName.exe+12345:
  db 90 90 90 90 90   // NOP out 5 bytes (overwrite health decrement)

[DISABLE]
// Restore original bytes
GameName.exe+12345:
  // original bytes here
```

More complex injection — AOB injection:

```asm
[ENABLE]
// Array of byte pattern search + injection
aobScanModule(healthPattern, GameName.exe, 89 41 2C 0F 28 C8)
label(returnHere)
label(hook)

healthPattern:
  jmp hook
  nop

hook:
  mov [ecx+2C], 999   // set health to 999
  jmp returnHere

[DISABLE]
// restore original bytes from saved backup
```

### VEH Debugger — break-and-trace

CE can use the **Vectored Exception Handler (VEH)** debugger instead of the Windows
debugger API. VEH is harder for anti-cheat to detect because it uses structured exception
handling rather than `DebugActiveProcess` [27](https://wiki.cheatengine.org/index.php?title=VEH_Debugger).

```bash
# CE → Memory View → Debug → VEH Debugger
# Benefits:
#   - Less detectable than Windows debugger API
#   - Handles hardware breakpoints (DR0-DR3)
#   - Can step through code without anti-cheat noticing
# Trade-offs:
#   - Slower than regular debugger
#   - Some operations not supported
```

### Break-and-trace technique

```
1. Find address of interesting value (e.g., player base address)
2. Right-click → "Find what writes to this address"
3. CE attaches VEH debugger → breakpoint on write
4. Do the action in-game (take damage, spend currency)
5. CE breaks on the instruction and shows:
     mov [ecx+000002C0],eax
     mov [rax+10],ecx
     ...
6. Scroll up to see the full function → identify function boundaries
7. Right-click → "Show disassembly" → analyze the function
8. Can now hook or patch at the identified location
```

### Static vs dynamic address handling

| Type | Characteristic | Workflow |
|------|---------------|----------|
| **Static** | Same module + offset across restarts | Find via pointer scan, store as `"module.exe"+offset` |
| **Dynamic** | Changes every run, no static chain | AOB scan (find by byte pattern); module-level heuristic |
| **Thread-local** | Per-thread data (common in server objects) | Scan with stack-trace awareness; find via object arrays |

For games that use complex memory management (object pools, freelists), a **pattern scan**
across the entire `.text` section is often required to find the allocator or the global
object manager [25](https://www.oreilly.com/library/view/game-hacking/9781492017462/xhtml/ch01.xhtml).

---

## 8. Reversing Anti-Cheat

Modern games implement anti-cheat systems that detect memory scanning, code injection, and
other tampering techniques. Understanding the detection surface is essential.

### Anti-cheat landscape

| System | Provider | Type | Platform |
|--------|----------|------|----------|
| **EasyAntiCheat (EAC)** | Epic Games | Hybrid (usermode + kernel) | Windows, macOS, Linux |
| **BattlEye (BE)** | BattlEye | Hybrid (usermode + kernel driver) | Windows, Linux |
| **Valve Anti-Cheat (VAC)** | Valve | Usermode scan (kernel in CS2) | Windows, Linux |
| **Ricochet** | Activision | Kernel driver (CoD) | Windows |
| **FACEIT** | FACEIT | Kernel driver | Windows |
| **Denuvo Anti-Cheat** | Irdeto | Kernel driver | Windows |
| **nProtect Gameguard** | INCA Internet | Hybrid rootkit-like | Windows |
| **XIGNCODE3** | Wellbia | Deep usermode injection | Windows |

### Detection mechanisms

**Usermode detection:**

| Method | What it detects | Bypass |
|--------|-----------------|--------|
| Process scanning | Known cheat processes | Use kernel-mode process hiding |
| Window enumeration (EnumWindows) | Overlay windows | Use transparent overlays or hardware overlay |
| Debugger detection (IsDebuggerPresent, NtQueryInformationProcess) | CE, IDA attached | Hide from PEB, use VEH debugger |
| Integrity checking (CRC, hash comparison of .text section) | Code patches | Patch integrity check function |
| Module enumeration | Injected DLLs | Manual mapping (DLL without LoadLibrary) |
| Thread callbacks (PsSetCreateThreadNotifyRoutine) | DLL injection threads | APC-based injection |
| Handle scanning | OpenHandle to game process | Use kernel driver to hide handles |

**Kernel-mode detection (driver-based):**

| Method | What it detects | Bypass |
|--------|-----------------|--------|
| ObRegisterCallbacks | Process/thread handle operations | Unlink from callback chain |
| Image load callbacks | Kernel driver loading | Use vulnerable signed driver (BYOVD) |
| ETW (Event Tracing for Windows) | Process creation, image load | Patch ETW provider |
| KDP (Kernel Patch Protection) | Kernel code patching | Only modify dynamic data, not kernel code |
| Memory scan from kernel | Injector DLL in game process | Physical memory hiding via VMM |
| Thread stack walking | Return address outside legit modules | Thread stack spoofing |

### Bypass strategies — layered approach

```
Application (Ring 3)         MonitorDriver.sys
       │                           │
       ▼                           ▼
┌─────────────────┐     ┌─────────────────┐
│ Game Process     │     │ EAC Kernel      │
│   ├─ cheat.dll  │◀───▶│ Driver          │
│   └─ hooks      │     │   ├─ ObCB       │
└────────┬────────┘     │   ├─ ImageCB    │
         │              │   └─ ScanThread │
         │              └────────┬────────┘
         │                       │
         ▼                       ▼
┌──────────────────────────────────────────┐
│ Hypervisor / VMM (Ring -1)               │
│  - EPT hooks (memory hiding)             │
│  - Intercept MSR writes                  │
│  - Hide physical memory regions          │
└──────────────────────────────────────────┘
```

Common bypass layers from simplest to most complex:

1. **Usermode patch** — Patch the anti-cheat DLL in memory after it loads (requires
   disabling integrity checks first)
2. **Manual map injection** — Load a DLL without using `LoadLibrary`, bypassing
   module enumeration callbacks
3. **Kernel handle proxy** — Use a kernel driver (or vulnerable signed driver) to
   communicate with cheat process, avoiding `OpenProcess` on the game
4. **BYOVD (Bring Your Own Vulnerable Driver)** — Load a legitimately signed but
   vulnerable driver (e.g., a motherboard utility driver) that gives arbitrary
   kernel memory access
5. **Physical memory / VMM** — Use a hypervisor (e.g., Intel VT-x) to read physical
   memory directly, bypassing all kernel-level anti-cheat
6. **Custom kernel driver** — Write a signed kernel driver that provides memory
   access primitives

### BYOVD example

```c
// Controlling a vulnerable driver to read process memory
HANDLE hDevice = CreateFileA("\\\\.\\VulnerableDriver", GENERIC_READ|GENERIC_WRITE,
                             0, NULL, OPEN_EXISTING, 0, NULL);
DWORD pid = GetProcessId(hGameProcess);

// Send IOCTL to copy memory from the game process into our buffer
struct {
    DWORD src_pid;
    DWORD64 src_addr;
    DWORD64 dest_addr;
    DWORD size;
} input = { pid, target_address, (DWORD64)buffer, sizeof(buffer) };

DeviceIoControl(hDevice, IOCTL_COPY_MEMORY, &input, sizeof(input),
                buffer, sizeof(buffer), &returned, NULL);
```

### System thread / APC-based injection

Alternative to standard `CreateRemoteThread` that anti-cheats commonly hook:

```c
// APC injection via QueueUserAPC
// 1. Find a thread in the target process
// 2. Allocate shellcode in the target (VirtualAllocEx + WriteProcessMemory)
// 3. Queue an APC to that thread
// 4. When the thread enters alertable state, shellcode executes

HANDLE hThread = OpenThread(THREAD_SET_CONTEXT, FALSE, threadId);
QueueUserAPC((PAPCFUNC)shellcodeAddr, hThread, (ULONG_PTR)param);
```

Or using a kernel driver to call `KeInsertQueueApc` directly, bypassing usermode
hooks on `QueueUserAPC` [28](https://secret.club/2020/04/08/eac_integrity_check_bypass.html).

### Communication methods — cheat ↔ game

| Method | Detectability | Reliability |
|--------|---------------|-------------|
| ReadProcessMemory | High (hooked by AC) | High |
| Kernel driver IOCTL | Medium (obfuscate IOCTL codes) | High |
| Physical memory (\\\\.\\PhysicalMemory) | High (locked on Win8+) | High |
| Named pipe via kernel proxy | Medium | High |
| Socket (IPC to VMM) | Low | High |
| Shared memory (mapped in kernel) | Low | Medium |

---

## 9. Game-Specific Protection — DRM and Custom Engines

### Denuvo Anti-Tamper

Denuvo is not an anti-cheat system; it is an **anti-tamper DRM** layer that encrypts and
VM-protects the game executable to prevent piracy. Key characteristics [29](https://connorjaydunn.github.io/blog/posts/denuvo-analysis/):

| Feature | Description |
|---------|-------------|
| **VM-protected code** | Critical game code is converted to Denuvo's proprietary VM bytecode, interpreted at runtime |
| **Hardware binding** | License check tied to motherboard/chipset fingerprint |
| **Integrity triggers** | Thousands of integrity checks scattered throughout the binary |
| **Encrypted constants** | Constants and strings decrypted at runtime via the license token |
| **Hypervisor awareness** | Recent versions detect hypervisors and refuse to run |

Reversing Denuvo:

1. **Identify the VM entry points** — Look for unique prologue patterns that jump to
   the Denuvo VM interpreter
2. **Dump the VM bytecode** — Find the VM bytecode blob (usually encrypted and embedded)
3. **Recover the VM semantics** — The VM has ~200+ different opcodes; reverse each by
   tracing the interpreter loop
4. **Patch integrity checks** — NOP or jmp over integrity check functions; do this in
   memory after the check functions themselves are decrypted
5. **Emulate the VM** — Some crackers write an emulator for the Denuvo VM that executes
   the bytecode without needing the hardware token

Modern Denuvo (v4+) uses a **hypervisor-based unpacking** approach: the license token
contains code that runs at Ring -1, making memory dumps of decrypted sections ineffective
because the sections re-encrypt when the hypervisor detects tampering [29](https://connorjaydunn.github.io/blog/posts/denuvo-analysis/).

### VMP (VMProtect) for games

VMProtect (VMP) is a commercial obfuscator that converts x86/x64 code into bytecode for a
custom VM. Used by some game publishers and cheat tools for protection.

```
Native function ──▶ VMP translates to VM bytecode ──▶ VMP interpreter executes it
                        │
                        ▼
                  Encrypted in binary
                  Decrypted per-page at runtime
```

Reverse engineering VMP:

1. Identify the VMP section (`.vmp0`, `.vmp1`, or custom) via section entropy analysis
2. Find the VM dispatch loop (a large function with many `cmp`/`jmp` patterns)
3. Trace a single VM instruction to understand opcode encoding
4. Write a Python script to disassemble the VM bytecode into pseudo-assembly
5. Patch out VMP by replacing VM entry calls with native implementations

**VMUnprotect** is a tool that dynamically un-VMs VMP-protected assemblies by dumping
decrypted memory after the VM interpreter processes each instruction [30](https://github.com/void-stack/VMUnprotect.Dumper).

### Custom engine reversing

Games built on proprietary engines (not Unity/Unreal) require custom RE methodology:

1. **Identify the engine** — Look for strings, PDB paths, known CRCs, renderer
   initialization patterns (e.g., DirectX device creation)
2. **Map engine structures** — Look for `new` / `malloc` with consistent object sizes;
   identify vtable patterns
3. **Find the object manager** — Scan for global arrays of game objects; look for
   update loops (every game calls Update() on active objects)
4. **Reconstruct the renderer** — Hook `IDXGISwapChain::Present` to find the frame
   callback; trace back to the game's rendering code
5. **Profile heap allocations** — Use allocation hooks to track how game objects are
   created and destroyed

### Game networking reverse engineering

Online games use networking libraries that can be reversed to understand the protocol:

| Library | Used by | Protocol |
|---------|---------|----------|
| **RakNet** | Minecraft, many indie games | UDP-based, message IDs, reliability layers |
| **Steamworks** | Steam games | P2P/Relay via Steam datagram |
| **EOS SDK** (Epic Online Services) | Fortnite, many UE4 games | Custom UDP/TCP |
| **Photon / Exit Games** | Multiplayer indie games | TCP/UDP, custom binary protocol |
| **Netcode for GameObjects** | Unity games | Unity transport layer |

RakNet reversing approach:

```
1. Capture packets with Wireshark (RakNet dissector built in)
2. Note message IDs (first byte after the header)
3. Look for:
   - Connection request (MSG_ID_CONNECTION_REQUEST)
   - Game messages (custom IDs starting from ID_USER_PACKET_ENUM)
4. Hook RakNet::RakPeer::Send() / Receive() to intercept in-process
5. Decode serialized payload format from game code
```

Wireshark has built-in RakNet dissection but notes: "different protocols use different
message IDs with no central registry" [31](https://www.wireshark.org/docs/dfref/r/raknet.html).

For Steamworks games, hooking `ISteamNetworking::SendP2PPacket` and `ReadP2PPacket`
in the Steam API DLL provides packet-level access.

### Unity/UE4 UI hooking

Game UI rendering differs from regular window overlays:

| Approach | Method | Detection risk |
|----------|--------|----------------|
| **DirectX overlay** | Hook `Present`, use `ImGui` to draw overlay | Medium |
| **Hardware overlay** | Create transparent window on top | Low (visible to screen capture) |
| **Game UI integration** | Hook game's UI rendering code | High |
| **External overlay** | `SetWindowLong` to make overlay transparent + layered | Medium |

ImGui overlay for DirectX 11:

```cpp
// Inside Present hook
ImGui_ImplDX11_NewFrame();
ImGui_ImplWin32_NewFrame();
ImGui::NewFrame();

if (show_menu) {
    ImGui::Begin("Cheat Menu");
    ImGui::Checkbox("ESP", &esp_enabled);
    ImGui::SliderFloat("Aimbot FOV", &aimbot_fov, 1.0f, 180.0f);
    ImGui::End();
}

ImGui::Render();
ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());
```

[32](https://github.com/Sh0ckFR/Universal-Dear-ImGui-Hook)

---

## 10. External/Internal Cheat Development

Cheats operate in either **external** (separate process) or **internal** (DLL injected into
game) mode. Each has different trade-offs.

### External vs internal comparison

| Aspect | External | Internal |
|--------|----------|----------|
| **Memory access** | `ReadProcessMemory` / `WriteProcessMemory` | Direct pointer dereference |
| **Hooks needed** | None for basic values | MinHook/Detours for functions |
| **Detection risk** | Moderate (RPM/WPM is hooked by AC) | Higher (DLL loaded in process) |
| **ESO bypass** | Overlay window (separate) | In-game rendering hook |
| **Speed** | Slower (syscall per read/write) | Instant (same process space) |
| **Complexity** | Lower | Higher |

### External: ReadProcessMemory / WriteProcessMemory

The foundation of external cheats. These Windows APIs read/write target process memory:

```cpp
// Read a float from the game
float ReadFloat(HANDLE hProcess, uintptr_t address) {
    float value = 0;
    ReadProcessMemory(hProcess, (LPCVOID)address, &value, sizeof(value), NULL);
    return value;
}

// Example: read player health through pointer chain
uintptr_t gameBase = GetModuleBaseAddress("GameName.exe");
uintptr_t ptr1 = Read<uintptr_t>(hProcess, gameBase + 0x017B2A8);
uintptr_t ptr2 = Read<uintptr_t>(hProcess, ptr1 + 0x1A0);
float    health = Read<float>(hProcess, ptr2 + 0x2C0 + 0x10);
```

Anti-cheats hook `ReadProcessMemory` / `WriteProcessMemory` at the kernel level via
`ObRegisterCallbacks` or inline hooks on `NtReadVirtualMemory`. To bypass, use:
- **Direct syscall** — call the syscall number directly (bypasses usermode hooks)
- **Kernel memory driver** — IOCTL to kernel driver does the copy
- **Physical memory read** — VMM-based read (completely bypasses Windows memory APIs)

### Direct syscall example (x64)

```cpp
// Syscall number for NtReadVirtualMemory varies by Windows build
// Get via: getSyscallNumber("NtReadVirtualMemory")
__declspec(naked) NTSTATUS SyscallReadVirtualMemory(
    HANDLE ProcessHandle, PVOID BaseAddress,
    PVOID Buffer, SIZE_T Size, PSIZE_T NumberOfBytesRead)
{
    __asm {
        mov r10, rcx
        mov eax, SYSCALL_NUMBER  // e.g., 0x3F on Win10 22H2
        syscall
        ret
    }
}
```

External cheat skeleton:

```cpp
// 1. Get game process
HANDLE hGame = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
if (!hGame) { /* use kernel proxy to get handle */ }

// 2. Get module base
uintptr_t base = GetModuleBase("GameName.exe");

// 3. Main loop
while (running) {
    ReadProcessMemory(hGame, (void*)(base + offset), &value, 4, NULL);
    // ... process, render ESP/overlay ...
    Sleep(1);  // avoid CPU exhaustion
}
```

### Internal: DLL injection patterns

Internal cheats run as a DLL loaded into the game process. Injection methods:

| Method | Description | Detected by |
|--------|-------------|-------------|
| **LoadLibrary** | `CreateRemoteThread` → `LoadLibrary` | Most AC (CreateRemoteThread hooks) |
| **Manual Map** | Manually map PE into process, fix imports/relocs | Less detectable (no LoadLibrary call) |
| **Reflective DLL** | DLL exports a loader function, calls `LoadLibrary` on itself | Medium |
| **APC Injection** | `QueueUserAPC` to existing thread | Moderate |
| **Thread Hijacking** | Suspend thread, set context to our shellcode, resume | Moderate |
| **SetWindowsHookEx** | `SetWindowsHookEx(WH_GETMESSAGE, ...)` | Low (sometimes detected) |
| **COM/oleacc** | Register as accessibility component | Very low |

Manual mapping is the most popular for undetected injection:

```
1. Allocate memory in target (VirtualAllocEx)
2. Resolve DLL's import table against target's loaded modules
3. Fix relocations
4. Copy sections to allocated memory
5. Create remote thread at DLL entry point (or call manually)
6. DLL entry does NOT call DllMain — instead creates its own thread for cheat logic
```

### MinHook / Detours

[MinHook](https://github.com/TsudaKageyu/minhook) is the most popular hooking library for
game cheats. It supports x86/x64, is MIT-licensed, and easy to integrate [33](https://github.com/TsudaKageyu/minhook).

```cpp
#include "MinHook.h"

// Hook target: void Player::TakeDamage(float amount)
void (*original_TakeDamage)(void* self, float amount);

void hook_TakeDamage(void* self, float amount) {
    amount = 0.0f;  // ignore all damage
    original_TakeDamage(self, amount);
}

// Install
MH_Initialize();
MH_CreateHook((LPVOID)addr_TakeDamage, hook_TakeDamage,
              (LPVOID*)&original_TakeDamage);
MH_EnableHook((LPVOID)addr_TakeDamage);

// Uninstall later
MH_DisableHook((LPVOID)addr_TakeDamage);
MH_Uninitialize();
```

[Detours](https://www.microsoft.com/en-us/research/project/detours/) is Microsoft's
proprietary alternative (used by many commercial games). MinHook is preferred in the
cheat community because it is free, open-source, and supports x64 well.

### Trampoline hooks

MinHook uses a **trampoline** — a small block of code that preserves the original function
behavior:

```
Original function (e.g., TakeDamage):
┌────────────────────────┐
│ prologue                │   ← overwritten with jmp to hook
│ first instructions      │   ← relocated to trampoline
│ ...                     │
└────────────────────────┘
        │ jmp
        ▼
┌────────────────────────┐
│ hook_TakeDamage (ours) │
│     amount = 0         │
│     call trampoline    │   ← optionally call original
└────────────────────────┘
        │
        ▼
┌────────────────────────┐
│ trampoline              │
│ relocated first insns   │
│ jmp back + 5           │
└────────────────────────┘
```

### VMT (Virtual Method Table) hooks

C++ classes use vtable dispatch. Replacing an entry in a vtable is a stealthy hook:

```cpp
class Renderer {
public:
    virtual void Draw();
    virtual void Present();
    // ...
};

// VMT hook example
void** vtable = *(void***)rendererInstance;
void* originalPresent = vtable[index_of_Present];

// Write-protect the vtable page
DWORD old;
VirtualProtect(vtable, sizeof(void*)*numMethods, PAGE_READWRITE, &old);

// Replace entry
vtable[index_of_Present] = &hook_Present;

// Restore protection
VirtualProtect(vtable, sizeof(void*)*numMethods, old, &old);
```

VMT hooks are commonly used for graphics API hooking (DirectX Present, etc.) because the
vtable is well-known and stable across game versions [34](https://github.com/Sh0ckFR/Universal-Dear-ImGui-Hook).

### Inline hooks — 5-byte jmp

The simplest hook: overwrite 5 bytes at the target with a relative jmp:

```
At target function address:
Original: 48 83 EC 28 48  ...   (sub rsp,0x28; ...)
Patched:  E9 XX XX XX XX       (jmp rel32 to our function)
```

The 5 bytes (jmp rel32) must be replaced atomically on x64. Use `InterlockedExchange`
or write via thread-safe memory.

---

## 11. Graphics / DirectX Hooking

Rendering hooks are the foundation for ESP (wallhacks), overlays, and visual modifications.

### IDXGISwapChain::Present hook

The most common D3D hook point. `Present` is called every frame. Hooking it gives you a
frame callback for overlay rendering [34](https://github.com/Sh0ckFR/Universal-Dear-ImGui-Hook).

Finding the Present function pointer:

```
Method 1: Pattern scan the game binary for the D3D11CreateDeviceAndSwapChain call,
          then read the vtable from the returned swapchain.

Method 2: Create a dummy D3D11 device + swapchain, read the vtable pointer.
          This works in external cheats too (cross-process).

Method 3: Hook D3D11CreateDeviceAndSwapChain to intercept the created swapchain.
```

Dummy device vtable dump:

```cpp
// Create a dummy swapchain to steal its vtable
DXGI_SWAP_CHAIN_DESC sd = {};
sd.BufferCount = 2;
sd.BufferDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
sd.OutputWindow = hWnd;
sd.SampleDesc.Count = 1;
sd.Windowed = TRUE;

IDXGISwapChain* swapchain = nullptr;
ID3D11Device* device = nullptr;
ID3D11DeviceContext* context = nullptr;

D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, 0,
    nullptr, 0, D3D11_SDK_VERSION, &sd, &swapchain, &device, nullptr, &context);

uintptr_t* vtable = *(uintptr_t**)swapchain;
void* pPresent = (void*)vtable[8];  // IDXGISwapChain::Present is at index 8
void* pResize = (void*)vtable[13];  // ResizeBuffers is at index 13
```

### D3D11 Present hook with MinHook

```cpp
typedef HRESULT(__stdcall* Present_t)(IDXGISwapChain*, UINT, UINT);
Present_t originalPresent;

HRESULT __stdcall hkPresent(IDXGISwapChain* pSwapChain, UINT SyncInterval, UINT Flags)
{
    // Draw overlay here
    if (!initialized) {
        ImGui_ImplDX11_Init(pSwapChain, device);
        initialized = true;
    }

    ImGui_ImplDX11_NewFrame();
    ImGui_ImplWin32_NewFrame();
    ImGui::NewFrame();
    // ... draw menu, ESP ...
    ImGui::EndFrame();
    ImGui::Render();
    ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());

    return originalPresent(pSwapChain, SyncInterval, Flags);
}

// Install hook
MH_CreateHook(pPresent, hkPresent, (void**)&originalPresent);
MH_EnableHook(pPresent);
```

### D3D12 hooking

D3D12 is more complex because it uses command lists, not immediate mode:

```
Present hook:
  → D3D12 swapchain uses IDXGISwapChain4 (inherits IDXGISwapChain3::Present)
  → Same vtable index as D3D11 (index 8)
  → Must synchronize with the GPU command queue
  → ImGui requires D3D12 command allocator + command list per frame

ExecuteCommandLists hook (alternative):
  → Called every frame with a command list array
  → Can inject drawing commands into the command list
  → Lower-level control over rendering
```

[35](https://github.com/DrNseven/D3D12-Hook-ImGui)

### Overlay rendering techniques

| Technique | Description | Detection risk |
|-----------|-------------|----------------|
| **DX overlay** | Inside Present hook, draw with ImGui | Medium (injected into game) |
| **External transparent window** | Layered window with `WS_EX_LAYERED` + `WS_EX_TRANSPARENT` | Low |
| **DirectX wrapper DLL** | Fake `dxgi.dll` that intercepts D3D11/D3D12 creation | Medium |
| **Hardware overlay (NVIDIA)** | Use NVAPI to create a hardware overlay surface | Very low |
| **Windows.Gaming.UI overlay** | UWP Game Bar integration | Low |

### ESP rendering via world-to-screen

The core of ESP visual cheats — projecting 3D game coordinates onto 2D screen position:

```cpp
bool WorldToScreen(D3D11Device* device, const Vector3& worldPos, Vector2& screenPos,
                   const Matrix4& viewMatrix, const Matrix4& projMatrix,
                   int screenWidth, int screenHeight)
{
    Matrix4 viewProj = viewMatrix * projMatrix;
    Vector4 clipPos = viewProj.Transform(worldPos);

    if (clipPos.w <= 0.0f) return false;

    Vector3 ndc(clipPos.x / clipPos.w, clipPos.y / clipPos.w, clipPos.z / clipPos.w);
    screenPos.x = (ndc.x * 0.5f + 0.5f) * screenWidth;
    screenPos.y = (-ndc.y * 0.5f + 0.5f) * screenHeight;
    return true;
}
```

---

## 12. Python Automation for Game RE

Python scripting accelerates game RE by automating memory scanning, pattern detection,
and runtime instrumentation.

### Frida for game RE

Frida is cross-platform dynamic instrumentation. It hooks functions at runtime using
JavaScript/Python and works on Windows, macOS, Linux, Android, iOS [36](https://frida.re/).

```python
import frida
import sys

# Attach to game process
session = frida.attach("GameName.exe")

# JavaScript: hook il2cpp_string_new
script = session.create_script("""
Interceptor.attach(Module.findExportByName("GameAssembly.dll", "il2cpp_string_new"), {
    onEnter(args) {
        var str = args[0].readUtf8String();
        console.log("[string_new] " + str);
    }
});
""")

script.load()
sys.stdin.read()
```

Frida for IL2CPP dumper:

```python
import frida

# Frida script to dump IL2CPP metadata at runtime
script_code = """
const il2cpp = Module.findBaseAddress("GameAssembly.dll");
console.log("GameAssembly.dll base: " + il2cpp);

// Scan for the global metadata pointer
// Pattern: IL2CPP stores a global pointer to metadata struct
var metadata = null;
Memory.scan(il2cpp, 0x1000000, "48 8D 0D ?? ?? ?? ?? E8",
    { onMatch: function(address) {
        console.log("Found potential metadata ref at " + address);
    }});

// Enumerate all MonoBehaviours in the IL2CPP domain
var domain = Il2Cpp.Domain;
console.log("Domain: " + domain);
"""

session = frida.attach("GameName.exe")
script = session.create_script(script_code)
script.load()
```

### frida-il2cpp-bridge (JavaScript API)

Provides high-level access to IL2CPP types, fields, and methods [11](https://github.com/vfsfitvnm/frida-il2cpp-bridge).

```javascript
// frida-il2cpp-bridge runtime class enumeration
Il2Cpp.Domain.Assemblies.forEach(assembly => {
    console.log("Assembly: " + assembly.Name);
    assembly.Classes.forEach(klass => {
        console.log("  Class: " + klass.FullName);
        klass.Fields.forEach(field => {
            console.log("    Field: " + field.Name + " @" + field.Offset +
                        " type=" + field.Type);
        });
    });
});
```

### py-memutil — Python memory hacking

[py-memutil](https://github.com/notDmrCat/py-memutil) is a Python library for reading and
writing game memory, similar to CE but scriptable:

```python
from pymem import Pymem

game = Pymem("GameName.exe")
base = game.base_address  # module base

# Read through pointer chain
def read_chain(base, offsets):
    addr = game.read_ulonglong(base)
    for offset in offsets[:-1]:
        addr = game.read_ulonglong(addr + offset)
    return addr + offsets[-1]

health_addr = read_chain(base + 0x017B2A8, [0x1A0, 0x2C0, 0x10])
health = game.read_float(health_addr)
print(f"Health: {health}")

game.write_float(health_addr, 999.0)
```

### Cheat Engine Lua automation

CE's built-in Lua scripting enables automated scanning and injection:

```lua
-- CE Lua: auto-scan for unknown value
local pid = getProcessIDFromProcessName("GameName.exe")
openProcess(pid)

-- Auto Assemble injection
autoAssemble([[
  aobScanModule(healthPattern, GameName.exe, 89 41 2C 0F 28 C8)
  label(returnHere)
  label(hook)

  healthPattern:
    jmp hook
    nop

  hook:
    mov [ecx+2C], 999
    jmp returnHere
]])

-- Memory record loop
function updateLoop()
  while true do
    local ptr = readPointer(readPointer(
      getAddress("GameName.exe") + 0x017B2A8) + 0x1A0) + 0x2C0 + 0x10
    writeFloat(ptr, 999)
    sleep(100)
  end
end

createThread(updateLoop)
```

### /scan — pattern scanning

Pattern scanning (also called Array of Bytes / AOB scanning) finds code by its byte
signature, independent of address:

```python
import re

def aob_scan(module_bytes, pattern):
    """
    Scan for a byte pattern with wildcards (??).
    Example: "89 41 2C 0F 28 C8" or "89 41 ?? 0F"
    """
    pattern_bytes = []
    for byte in pattern.split():
        if byte == "??":
            pattern_bytes.append(b'.')
        else:
            pattern_bytes.append(bytes([int(byte, 16)]))
    
    pattern_re = re.compile(b''.join(pattern_bytes))
    for match in pattern_re.finditer(module_bytes):
        yield match.start()

# Usage
with open("GameAssembly.dll", "rb") as f:
    data = f.read()

for offset in aob_scan(data, "48 8B 0D ?? ?? ?? ?? E8 ?? ?? ?? ??"):
    print(f"Pattern found at offset: 0x{offset:X}")
```

### Python pointer scanner

Replicating CE's pointer scanner in Python:

```python
import struct

def scan_pointer_chain(process_memory, target_addr, base_addr, max_depth=5, max_offset=0x1000):
    """
    Find multi-level pointer chains that resolve to target_addr.
    Simulates CE's pointer scan.
    """
    chains = []
    depth = 0
    
    def scan_level(addr, offsets, depth):
        if depth >= max_depth:
            return
        
        # Scan 4-byte aligned addresses within range
        scan_start = max(base_addr, addr - max_offset)
        scan_end = addr + max_offset
        
        for candidate in range(scan_start, scan_end, 4):
            try:
                value = struct.unpack('<Q', process_memory[candidate:candidate+8])[0]
                if value == addr:
                    new_offsets = offsets + [candidate - base_addr]
                    chains.append((base_addr, new_offsets))
                elif depth < max_depth - 1:
                    # Check if this looks like a valid pointer
                    if 0x10000000 < value < 0x7FFFFFFF0000:
                        scan_level(value, offsets + [candidate - base_addr], depth + 1)
            except:
                pass
    
    scan_level(target_addr, [], 0)
    return chains
```

---

## Sources

1.  icsharpcode/ILSpy — .NET decompiler: https://github.com/icsharpcode/ILSpy
2.  Perfare/AssetStudio — Unity asset explorer: https://github.com/Perfare/AssetStudio
3.  dnSpyEx/dnSpy — .NET editor/debugger: https://github.com/dnSpyEx/dnSpy
4.  Ecma International — ECMA-335 CLI standard: https://www.ecma-international.org/publications-and-standards/standards/ecma-335/
5.  Perfare/Il2CppDumper — Unity IL2CPP RE tool: https://github.com/Perfare/Il2CppDumper
6.  Katy's Code — IL2CPP obfuscated metadata finding: https://katyscode.wordpress.com/2021/02/23/il2cpp-finding-obfuscated-global-metadata/
7.  Il2CppDumper README — method recovery: https://github.com/Perfare/Il2CppDumper/blob/master/README.md
8.  djkaty/Il2CppInspector — Automated IL2CPP analysis: https://github.com/djkaty/Il2CppInspector
9.  toasterparty — Unity IL2CPP reverse engineering guide: https://gist.github.com/toasterparty/57a50eddc2203fc6ca24cf96789f5dd2
10. vfsfitvnm/frida-il2cpp-bridge — Frida IL2CPP hooking: https://github.com/vfsfitvnm/frida-il2cpp-bridge
11. frida-il2cpp-bridge Wiki — runtime API: https://github.com/vfsfitvnm/frida-il2cpp-bridge/wiki
12. Perfare/AssetStudio — BundleFile parsing: https://github.com/Perfare/AssetStudio
13. AssetRipper/AssetRipper — Unity project recovery: https://github.com/AssetRipper/AssetRipper
14. SeriousCache/UABE — Asset Bundle Extractor: https://github.com/SeriousCache/UABE
15. RenderDoc — Graphics debugger: https://renderdoc.org/
16. Epic Games/UnrealEngine — Engine source (GitHub): https://github.com/EpicGames/UnrealEngine
17. ikrima — UE4 reflection internals: https://ikrima.dev/ue4guide/engine-programming/uobject-reflection/reflection-internals-1/
18. Epic Games — Unreal Property System (Reflection): https://www.unrealengine.com/zh-CN/blog/unreal-property-system-reflection
19. FModel/FModel — Unreal Engine pak explorer: https://github.com/FModel/FModel
20. gildor2/UEViewer — Unreal asset viewer: https://github.com/gildor2/UEViewer
21. intaxwashere — Discovering Blueprint VM Part 2: https://intaxwashere.github.io/blueprint-part-two/
22. Jayden Games — From Blueprint to Bytecode I: https://jaydengames.com/posts/bpvm-bytecode-I/
23. EliotVU — Intro to UE Explorer: https://eliotvu.com/blog/31/an-introduction-to-ue-explorer
24. trumank/kismet-analyzer — Kismet bytecode tools: https://github.com/trumank/kismet-analyzer
25. O'Reilly — Game Hacking (Chapter 1: Scanning Memory): https://www.oreilly.com/library/view/game-hacking/9781492017462/xhtml/ch01.xhtml
26. Cheat Engine — Auto Assembler help: https://cheatengine.org/help/CodeInjectionandtheautoassembler.htm
27. Cheat Engine Wiki — VEH Debugger: https://wiki.cheatengine.org/index.php?title=VEH_Debugger
28. secret.club — EAC integrity bypass: https://secret.club/2020/04/08/eac_integrity_check_bypass.html
29. Connor-Jay's Blog — Denuvo analysis: https://connorjaydunn.github.io/blog/posts/denuvo-analysis/
30. void-stack/VMUnprotect.Dumper — VMP unpacker: https://github.com/void-stack/VMUnprotect.Dumper
31. Wireshark — RakNet dissector reference: https://www.wireshark.org/docs/dfref/r/raknet.html
32. Sh0ckFR/Universal-Dear-ImGui-Hook — D3D11/D3D12 hook: https://github.com/Sh0ckFR/Universal-Dear-ImGui-Hook
33. TsudaKageyu/minhook — Minimal x86/x64 hooking library: https://github.com/TsudaKageyu/minhook
34. Universal Dear ImGui Hook — Graphics API hooking: https://github.com/Sh0ckFR/Universal-Dear-ImGui-Hook
35. DrNseven/D3D12-Hook-ImGui — DirectX 12 hook: https://github.com/DrNseven/D3D12-Hook-ImGui
36. Frida — Dynamic instrumentation toolkit: https://frida.re/
37. unknowncheats.me — ObRegisterCallbacks and countermeasures: https://www.unknowncheats.me/forum/printthread.php?t=148364
38. bananamafia — Cheating in Unity Games (Frida): https://bananamafia.dev/post/frida-unity/
39. Momo5502 — Bypassing Denuvo in Hogwarts Legacy: https://momo5502.com/posts/2024-03-31-bypassing-denuvo-in-hogwarts-legacy/
40. nesrak1/UABEANext — Modern asset bundle editor: https://github.com/nesrak1/UABEANext
