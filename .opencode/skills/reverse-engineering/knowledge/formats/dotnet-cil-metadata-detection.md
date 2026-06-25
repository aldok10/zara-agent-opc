# .NET CIL, Metadata, and Detection

TL;DR: Why .NET decompiles cleanly, CIL/MSIL bytecode basics, metadata tables and heaps,
and how to detect managed vs native assemblies.

Cross-reference: See also `dotnet-decompilers-workflow.md` in this directory.

Authorized-analysis knowledge base. Scope: identifying, disassembling, decompiling, and
deobfuscating managed (CLR) assemblies. Use only on binaries you own or are explicitly
authorized to analyze. Decompilation may breach EULAs even when technically trivial.

---

## 1. Why .NET decompiles so cleanly

A native DLL (C/C++) compiles to machine code. The original variable names, types, and
structure are gone; you get assembly, and recovery is lossy.

A managed DLL compiles to **CIL** (Common Intermediate Language, also called MSIL or IL),
a stack-based bytecode, plus a rich **metadata** block that describes every type, method,
field, parameter, and (unless stripped) name. Because that metadata is required by the CLR
at runtime, it ships inside the assembly. A decompiler reads CIL + metadata and reconstructs
near-original C#. This is also why obfuscation exists: without it, shipping a .NET DLL is
close to shipping source [1](https://www.softanics.com/net-obfuscation/tools/decompilers).

```
C# source ──csc──▶ CIL bytecode + metadata  (the .dll/.exe, a PE file)
                          │  JIT at runtime
                          ▼
                    native machine code
```

---

## 2. CIL / MSIL bytecode basics

CIL is an **evaluation-stack** machine, not a register machine. Operations push/pop operands
on a per-method stack. Defined normatively in **ECMA-335** Partition III
[2](https://www.ecma-international.org/publications-and-standards/standards/ecma-335/).

| Concept | Detail |
|---------|--------|
| Execution model | Stack-based; `add` pops 2, pushes 1. No general-purpose registers. |
| Locals | Declared in a method's local signature; `ldloc`/`stloc` access them by index. |
| Arguments | `ldarg`/`starg`. For instance methods `ldarg.0` is `this`. |
| Method calls | `call` (static binding), `callvirt` (virtual dispatch), `newobj` (construct). |
| Tokens | 4-byte **metadata tokens** (e.g. `0x06000040`) reference rows in metadata tables. High byte = table id, low 3 bytes = row index (RID). |
| Type model | `ldfld`/`stfld` (fields), `box`/`unbox`, `ldstr` (string literal from `#US` heap). |

Common opcodes worth recognizing while reading IL:

| Opcode | Meaning |
|--------|---------|
| `nop` | No-op (also used to overwrite/patch instructions) |
| `ldc.i4.N` | Push int32 constant |
| `ldstr "..."` | Push string literal |
| `ldloc.N` / `stloc.N` | Load/store local |
| `call` / `callvirt` | Invoke method |
| `ret` | Return |
| `br` / `brtrue` / `brfalse` | Branch (control flow) |
| `leave` | Exit a protected (try) region |

A method body is a header (flags, max stack, local-var sig token) followed by the IL stream
and optional exception-handling clauses.

---

## 3. Metadata: tables and heaps

Metadata is the heart of a managed assembly. Logically it is a set of **tables** plus four
**heaps**, all addressed by tokens [9](https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-clr-metadata-1/).

### Heaps (streams)

| Stream | Holds |
|--------|-------|
| `#Strings` | Identifier names (types, methods, fields) |
| `#US` (UserStrings) | String literals from `ldstr` |
| `#Blob` | Binary blobs: signatures, custom-attribute values, constants |
| `#GUID` | Module/type GUIDs (e.g. MVID) |
| `#~` (or `#-`) | The compressed metadata-table stream itself |

### Key tables (ECMA-335 Partition II)

| Table | Token prefix | Describes |
|-------|--------------|-----------|
| `Module` | `0x00` | The module identity (MVID) |
| `TypeRef` | `0x01` | Types referenced from other assemblies |
| `TypeDef` | `0x02` | Types defined in this assembly |
| `Field` | `0x04` | Field definitions |
| `MethodDef` | `0x06` | Method definitions (token e.g. `0x06000040`) |
| `Param` | `0x08` | Method parameters |
| `MemberRef` | `0x0A` | References to external members |
| `CustomAttribute` | `0x0C` | Attribute applications |
| `Assembly` | `0x20` | This assembly's manifest identity |
| `AssemblyRef` | `0x23` | Referenced assemblies (dependencies) |

monodis can dump these directly with flags like `--typedef`, `--typeref`, `--blob`,
`--strings`, `--show-tokens` [8](https://man.archlinux.org/man/monodis.1.en).

---

## 4. Managed vs native: how to tell quickly

Every .NET assembly is a normal **PE** (Portable Executable) file. What makes it managed is
**data directory entry 14**, the **CLI header** (a.k.a. COR20 / `IMAGE_COR20_HEADER`,
referenced by `IMAGE_DIRECTORY_ENTRY_COMHEADER`). If that directory entry is present and
non-zero, the image is managed; if it is all zero, it is native
[3](https://learn.microsoft.com/en-us/cpp/dotnet/how-to-determine-if-an-image-is-native-or-clr).

### Fast detection paths

| Method | Command / check |
|--------|-----------------|
| MSVC toolchain | `dumpbin /CLRHEADER file.dll` -- prints CLR header if managed, else nothing [3](https://learn.microsoft.com/en-us/cpp/dotnet/how-to-determine-if-an-image-is-native-or-clr) |
| .NET Framework SDK | `corflags file.dll` -- succeeds + shows ILONLY/32BITREQ/32BITPREF if managed; errors on native [10](https://docs.microsoft.com/el-gr/dotnet/framework/tools/corflags-exe-corflags-conversion-tool) |
| file(1) on Linux/mac | `file foo.dll` often reports "Mono/.Net assembly" for managed PEs |
| Reflection probe | `AssemblyName.GetAssemblyName(path)` throws `BadImageFormatException` on native DLLs |
| Manual PE walk | See byte-offset algorithm below |

### Manual PE walk (the algorithm dumpbin uses)

1. Confirm `MZ` magic (`0x5A4D`) at offset 0.
2. Read the PE header offset (`e_lfanew`) from offset `0x3C`.
3. At that offset, confirm the PE signature `PE\0\0` (`0x00004550`).
4. Read the Optional Header magic right after the file header:
   `0x10B` = PE32 (32-bit), `0x20B` = PE32+ (64-bit) -- this sets directory offsets
   [4](https://en.ittrip.xyz/c-sharp/detect-dotnet-anycpu).
5. Locate **data directory index 14** (the COM descriptor / CLI header). If its RVA and
   size are both zero, the file is **native**; otherwise it is **managed/CLR**
   [3](https://learn.microsoft.com/en-us/cpp/dotnet/how-to-determine-if-an-image-is-native-or-clr).

Microsoft's own sample sums the 8 bytes of that directory entry; a zero sum means native,
non-zero means CLR [3](https://learn.microsoft.com/en-us/cpp/dotnet/how-to-determine-if-an-image-is-native-or-clr).

### CorFlags fields you will read

| Flag | Meaning |
|------|---------|
| `ILONLY` | Pure IL, no native code |
| `32BITREQ` | Must run as 32-bit |
| `32BITPREF` | Prefers 32-bit but can run 64-bit (replaced the old single `32BIT` flag) [5](http://stackoverflow.com/questions/18608785/how-to-interpret-the-corflags-flags/23614024) |
| `Signed` | Has a strong-name signature |
