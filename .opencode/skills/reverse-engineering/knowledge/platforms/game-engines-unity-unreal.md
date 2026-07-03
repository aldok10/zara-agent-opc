# Game Engine RE: Unity & Unreal Engine

TL;DR: Unity Mono = trivial decompile (dnSpy on Assembly-CSharp.dll). Unity IL2CPP = native binary + global-metadata.dat (use Il2CppDumper for symbol recovery). Unreal = native C++ with reflection system (UClass/UProperty), pak archives (FModel for extraction), Blueprint VM bytecode.

---

## Unity Mono

Managed DLLs in `<Game>_Data/Managed/`. `Assembly-CSharp.dll` = all game logic.

```bash
ilspycmd Assembly-CSharp.dll -p -o ./src/  # Full project decompile
# dnSpyEx: Edit Method (IL) -> patch -> Save Module
```

## Unity IL2CPP

Pipeline: C# -> CIL -> C++ -> native binary (GameAssembly.dll / libil2cpp.so)

Key files: `global-metadata.dat` (symbols), `GameAssembly.dll` (code)

```bash
Il2CppDumper <libil2cpp> <global-metadata> <output-dir>
# Output: dump.cs (classes+methods+RVAs), script.json, il2cpp.h
```

Output gives method addresses: `public void Update(); // RVA: 0x4A2200`

**Obfuscated metadata**: If Il2CppDumper fails, find `MetadataLoader::LoadMetadataFile` in binary, breakpoint, dump after decryption.

**frida-il2cpp-bridge** (runtime hooking):
```javascript
const Player = Il2Cpp.Domain.Assembly("Assembly-CSharp").Class("PlayerController");
Player.Method("Update").Implement(function() { this.Method("set_Health").Invoke(999); });
```

## Unity Assets

| Tool | Purpose |
|------|---------|
| AssetStudio | Extract textures, meshes, audio, MonoBehaviours |
| AssetRipper | Reconstruct full Unity project |
| UABEA | Edit asset data directly |

UnityFS format: signature "UnityFS", version, compressed blocks (LZMA/LZ4).

## Unreal Engine Structure

Native C++ with reflection via UHT-generated code. Monolithic shipping builds.

**Reflection**: UCLASS(), UPROPERTY(), UFUNCTION() macros generate metadata at startup.

**UObject layout**: ClassPrivate (UClass*), NamePrivate (FName), OuterPrivate (UObject*)

**FName pool**: Global string table. FName = (Index, Number). Resolve via FNamePool::Blocks.

**TArray**: `[Data*, Num, Max]`. TMap/TSet use TSparseArray + FHashTable.

## UE Pak Files

```bash
# FModel: Open folder -> add AES key if needed -> browse assets
# UnrealPak: UnrealPak.exe "Game.pak" -Extract "C:\Output"
```

AES-256 encryption: Key hardcoded in executable. Find call to `FAES::Decrypt`, extract key parameter.

Modern format: .utoc (table of contents) + .ucas (chunk data) for SSD optimization.

## Blueprint VM (BPVM)

Stack-based interpreter. Bytecode in `UFunction::Script` as uint8 array.

Key opcodes: EX_Jump(0x06), EX_JumpIfNot(0x07), EX_Let(0x0F), EX_FinalFunction(0x20), EX_VirtualFunction(0x1F), EX_IntConst(0x24), EX_Self(0x33)

FModel decompiles Blueprint to pseudo-C++.

## Cheat Engine Workflow

```
1. Attach -> First Scan (exact value)
2. Change in-game -> Next Scan (new value)
3. Repeat until few results
4. Pointer scan for stable chains: "module.exe"+offset -> +off1 -> +off2
```

AOB (Array of Bytes) scan: Find code by byte pattern, independent of address (survives updates).

## Memory Hacking Patterns

**Pointer chain**: `base + 0x17B2A8 -> +0x1A0 -> +0x2C0 -> +0x10 = health`

**Code injection** (Auto Assembler): NOP out damage instruction or replace with constant.

**VEH Debugger**: Less detectable than Windows debug API. Hardware breakpoints (DR0-DR3).

## Anti-Cheat Systems

| System | Type |
|--------|------|
| EasyAntiCheat | Kernel + usermode |
| BattlEye | Kernel + usermode |
| Ricochet | Kernel driver |
| VAC | Usermode (kernel in CS2) |

Detection: Process scanning, integrity checks, module enumeration, ObRegisterCallbacks, ETW.

Bypass layers (simple to complex):
1. Usermode patch
2. Manual map injection (no LoadLibrary)
3. Kernel handle proxy
4. BYOVD (vulnerable signed driver)
5. Hypervisor/VMM (physical memory read)

## DirectX Hooking

IDXGISwapChain::Present at vtable index 8. Hook for overlay rendering (ImGui).

```cpp
// Create dummy swapchain -> steal vtable -> hook Present
void* pPresent = vtable[8];
MH_CreateHook(pPresent, hkPresent, (void**)&originalPresent);
```

World-to-screen: viewProj.Transform(worldPos) -> NDC -> screen coordinates.

## Internal vs External Cheats

| Aspect | External | Internal |
|--------|----------|----------|
| Access | ReadProcessMemory | Direct pointers |
| Detection | Moderate | Higher |
| Speed | Slower (syscall) | Instant |
| Injection | N/A | Manual map, APC, thread hijack |

## Key Tools

| Tool | Domain |
|------|--------|
| dnSpyEx/ILSpy | Unity Mono decompile |
| Il2CppDumper | IL2CPP symbol recovery |
| frida-il2cpp-bridge | Runtime IL2CPP hooking |
| AssetStudio | Unity asset extraction |
| FModel | UE pak browser + Blueprint decompiler |
| UEViewer (UModel) | UE asset viewer |
| Cheat Engine | Memory scanning + injection |
| MinHook | Function hooking (x86/x64) |
| Frida | Cross-platform instrumentation |
| RenderDoc | Graphics frame capture |
