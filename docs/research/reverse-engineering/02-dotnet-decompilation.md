# .NET / Managed DLL Decompilation — Reference

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
| MSVC toolchain | `dumpbin /CLRHEADER file.dll` — prints CLR header if managed, else nothing [3](https://learn.microsoft.com/en-us/cpp/dotnet/how-to-determine-if-an-image-is-native-or-clr) |
| .NET Framework SDK | `corflags file.dll` — succeeds + shows ILONLY/32BITREQ/32BITPREF if managed; errors on native [10](https://docs.microsoft.com/el-gr/dotnet/framework/tools/corflags-exe-corflags-conversion-tool) |
| file(1) on Linux/mac | `file foo.dll` often reports "Mono/.Net assembly" for managed PEs |
| Reflection probe | `AssemblyName.GetAssemblyName(path)` throws `BadImageFormatException` on native DLLs |
| Manual PE walk | See byte-offset algorithm below |

### Manual PE walk (the algorithm dumpbin uses)

1. Confirm `MZ` magic (`0x5A4D`) at offset 0.
2. Read the PE header offset (`e_lfanew`) from offset `0x3C`.
3. At that offset, confirm the PE signature `PE\0\0` (`0x00004550`).
4. Read the Optional Header magic right after the file header:
   `0x10B` = PE32 (32-bit), `0x20B` = PE32+ (64-bit) — this sets directory offsets
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

---

## 5. Decompiler tools compared

| Tool | License | Platform | CLI? | Edit/Debug | Notes |
|------|---------|----------|------|-----------|-------|
| **ILSpy** | MIT, open source | Win/Linux/macOS (Avalonia) | Yes (`ilspycmd`) | Read-only | The de-facto standard; engine reused by VS F12 "Go to decompiled source" [11](https://github.com/icsharpcode/ILSpy). Active, cross-platform, whole-project export. |
| **dnSpy / dnSpyEx** | GPLv3, open source | Windows | Limited | **Yes** — edit IL/C# and live debug | Original dnSpy archived; **dnSpyEx** is the maintained fork [4](https://www.c-sharpcorner.com/article/net-5-free-decompilers2/). Best for patching and runtime analysis. |
| **JetBrains dotPeek** | Free (proprietary) | Windows | No | Read-only | Strong if you live in ReSharper/Rider; can act as a symbol server [1b](https://blog.ndepend.com/in-the-jungle-of-net-decompilers/). |
| **Telerik JustDecompile** | Free (proprietary) | Windows | Plugin API | Read-only | Effectively unmaintained; fine for quick views, plugin ecosystem [12](https://bytehide.com/blog/best-dotnet-decompilers). |
| **Redgate .NET Reflector** | Paid | Windows | VS add-in | Read-only | The original (2000s) decompiler; debug-into-decompiled in Visual Studio [12](https://bytehide.com/blog/best-dotnet-decompilers). |
| **ILDasm / ILAsm** | Ships with SDK | Windows (mono on *nix) | Yes | Round-trip | Disassembles to/from IL text, not C#. Canonical for round-tripping [6](https://learn.microsoft.com/en-us/dotnet/standard/assembly/view-contents). |
| **monodis** | Mono, open source | Linux/macOS | Yes | Disasm only | Mono's ILDasm equivalent; great for scripted table dumps [8](https://man.archlinux.org/man/monodis.1.en). |

Rules of thumb [1b](https://blog.ndepend.com/in-the-jungle-of-net-decompilers/):
- Want **free + cross-platform + scriptable** → ILSpy / `ilspycmd`.
- Need to **edit a binary or live-debug without source** → dnSpyEx.
- Already in **JetBrains** ecosystem → dotPeek.
- Need **IL text round-trip** → ildasm/ilasm (or monodis on Linux).

---

## 6. de4dot and deobfuscation

**de4dot** is an open-source (GPLv3) .NET deobfuscator and unpacker. It auto-detects the
obfuscator, then renames symbols, decrypts strings, removes control-flow obfuscation, and
inlines proxy calls [7](http://de4dot.org/). The original repo is `de4dot/de4dot`; active
forks include `de4dotEx` (GDATA) and `de4dot-cex` (ConfuserEx2-focused)
[13](https://github.com/de4dot/de4dot).

### Obfuscators it targets

| Obfuscator | Type | Notes |
|-----------|------|-------|
| **ConfuserEx / ConfuserEx2** | Open source | String/constant encryption, control-flow, anti-tamper, packing. Use `de4dot-cex` fork [14](https://iterasec.com/blog/understanding-confuserex2-net-obfuscation-and-deobfuscation-techniques/). |
| **Dotfuscator** | Commercial (PreEmptive) | Renaming, control flow, string encryption. |
| **SmartAssembly** | Commercial (Redgate) | Name mangling, string encryption, merging. |
| **.NET Reactor** | Commercial (Eziriz) | Native stub, virtualization; consider **NETReactorSlayer** [15](https://github.com/SychicBoy/NETReactorSlayer). |
| **Eazfuscator / Obfuscar** | Commercial / open | Varying string + name protection [16](https://www.softanics.com/net-obfuscation/tools). |

### General de4dot usage

```bash
# Auto-detect and clean
de4dot.exe obfuscated.dll                 # writes obfuscated-cleaned.dll

# Force a specific deobfuscator profile (e.g. ConfuserEx via the cex fork)
de4dot-x64.exe target.dll -p crx          # ConfuserEx control-flow profile

# Preserve metadata tokens (useful for further patching)
de4dot.exe --preserve-tokens target.dll
```

### ConfuserEx2 manual workflow (when de4dot alone is not enough)

ConfuserEx2 layers anti-tamper, runtime decryption, and packing, so a staged approach is
needed [14](https://iterasec.com/blog/understanding-confuserex2-net-obfuscation-and-deobfuscation-techniques/):

1. **Unpack**: load the assembly in dnSpyEx, enable "Prevent code from detecting the
   debugger", open the module from memory, break after `gchandle.Free()` in `<Module>.cctor`,
   and dump the in-memory "koi" module.
2. **Anti-tamper**: NOP the first call in `<Module>.cctor`; patch the entry point using the
   MDToken recovered via a `ResolveMethod` breakpoint.
3. **Strings**: identify the decryptor call pattern; NOP the execution-context checks, then
   reflect-invoke the decryptor (see the Iterasec Python script) to rewrite literals.
4. **Control flow**: run `de4dot-cex -p crx` to flatten the obfuscated CFG.
5. **Proxy calls**: run ProxyCall-Remover to restore direct method calls.

Underlying these tools is **dnlib** (`0xd4d/dnlib`), the read/write metadata library de4dot
and dnSpy are built on [14](https://iterasec.com/blog/understanding-confuserex2-net-obfuscation-and-deobfuscation-techniques/).

---

## 7. Round-tripping: ildasm / ilasm / monodis

Round-tripping = disassemble to IL text, edit, reassemble. The classic patch workflow
without a binary editor [17](https://www.infosecinstitute.com/resources/reverse-engineering/demystifying-dot-net-reverse-engineering-advanced-round-trip-engineering/).

```bash
# Disassemble to IL text (Windows SDK)
ildasm /all /out=app.il app.exe          # also emits app.res for resources

# ... edit app.il (change a beq to bne, NOP a check, etc.) ...

# Reassemble
ilasm /dll app.il /resource=app.res /output=app_patched.dll
```

```bash
# Linux/macOS equivalents (Mono)
monodis --output=app.il app.dll
monodis --show-tokens --typedef app.dll  # scripted table inspection
ilasm /dll app.il                        # Mono ilasm reassembles
```

Caveat: a **strong-name signature does not survive** ildasm/ilasm round-tripping by design;
you cannot re-sign with the original key, only with your own or skip-verification
[18](https://stackoverflow.com/q/8765188). `monodis --mscorlib` helps when round-tripping a
non-corlib assembly through ilasm [8](https://man.archlinux.org/man/monodis.1.en).

---

## 8. Programmatic analysis

Two main libraries for reading/writing metadata in code:

| Library | Mode | Best for |
|---------|------|----------|
| **System.Reflection.Metadata** (`MetadataReader`) | Read (write via `MetadataBuilder`) | Fast, low-alloc, official MS API. Reads tables/heaps directly without loading the assembly. `System.Reflection.Metadata.Ecma335` exposes raw table access and `MetadataBuilder` for emit [19](https://learn.microsoft.com/en-us/dotnet/api/system.reflection.metadata.ecma335?view=net-7.0). |
| **Mono.Cecil** | Read **and write** | Easy object model for inspecting and rewriting assemblies, IL injection, weaving. The pragmatic choice for editing. |
| **dnlib** | Read and write | Powers dnSpy/de4dot; robust against malformed/obfuscated metadata. |

Minimal `MetadataReader` probe (managed-vs-native + type listing):

```csharp
using System.Reflection.PortableExecutable;
using System.Reflection.Metadata;

using var fs = File.OpenRead(path);
using var pe = new PEReader(fs);
if (!pe.HasMetadata) { /* native or resource-only DLL */ return; }
var md = pe.GetMetadataReader();
foreach (var h in md.TypeDefinitions)
{
    var t = md.GetTypeDefinition(h);
    Console.WriteLine($"{md.GetString(t.Namespace)}.{md.GetString(t.Name)}");
}
```

Mono.Cecil rewrite sketch:

```csharp
var asm = Mono.Cecil.AssemblyDefinition.ReadAssembly("in.dll");
foreach (var type in asm.MainModule.Types)
    foreach (var m in type.Methods.Where(m => m.HasBody))
        { /* inspect or rewrite m.Body.Instructions */ }
asm.Write("out.dll");
```

---

## 9. Source-quality recovery

Decompilation is not byte-for-byte original source. What you actually recover:

| Feature | Recovery quality |
|---------|------------------|
| Type/member structure | High — metadata preserves it exactly |
| Method logic | High for typical code; modern decompilers reconstruct LINQ, async/await, iterators, lambdas |
| Names (unobfuscated) | High — `#Strings` heap holds originals |
| Names (obfuscated) | Lost — replaced with `a`, `b`, Unicode/homoglyph junk; deobfuscators only generate *consistent* fresh names, not originals |
| Local variable names | Usually lost unless a PDB is present |
| Comments / `#region` | Always lost (not compiled) |
| `#if DEBUG` branches | Only the compiled branch survives |
| String literals | Recoverable unless encrypted |

ILSpy can also generate a **PDB** and do **whole-project** decompilation, producing a
buildable `.csproj` tree [11](https://github.com/icsharpcode/ILSpy). Obfuscation attacks
this on three axes: **name mangling** (defeated by renaming passes), **control-flow
obfuscation** (defeated by CFG-cleanup in de4dot), and **string encryption** (defeated by
locating and invoking the decryptor)
[14](https://iterasec.com/blog/understanding-confuserex2-net-obfuscation-and-deobfuscation-techniques/).

---

## 10. Assembly identity: manifest, strong naming, AppDomain

| Concept | What it is | RE relevance |
|---------|------------|--------------|
| **Manifest** | Part of the `Assembly` table + metadata: name, version, culture, referenced assemblies (`AssemblyRef`), files, exported types | Shows dependencies and the full identity; first thing to read |
| **Strong name** | Public-key + signature over the assembly. Identity = name + version + culture + public-key token | Tampering invalidates it; cannot re-sign without the private key. `corflags` shows the `Signed` flag [10](https://docs.microsoft.com/el-gr/dotnet/framework/tools/corflags-exe-corflags-conversion-tool) |
| **Strong-name bypass** | `sn -Vr` registers skip-verification (test machines), or unsign during round-trip | Why a patched DLL still loads in a dev environment |
| **AppDomain** | .NET Framework isolation boundary; loads/unloads assemblies, sets security context | Obfuscators/packers often load decrypted modules into the current domain via `Assembly.Load(byte[])`; breakpoint there to grab the cleartext module |
| **MVID** | Module GUID in `#GUID` heap | Correlates rebuilt vs original modules |

Note: `AppDomain` is .NET Framework only. On modern .NET (Core/5+) there is a single default
domain; isolation uses `AssemblyLoadContext` instead. Packers on modern .NET hook
`AssemblyLoadContext.Resolving` or call `LoadFromStream` on decrypted bytes.

---

## 11. End-to-end CLI workflow: managed DLL → readable C#

```bash
# 0. Is it even managed? (any one of these)
dumpbin /CLRHEADER suspect.dll          # Windows / MSVC
corflags suspect.dll                    # .NET Framework SDK
file suspect.dll                        # Linux/macOS heuristic

# 1. Install the cross-platform decompiler CLI (once)
dotnet tool install --global ilspycmd

# 2. Quick triage: list all types
ilspycmd --list-type suspect.dll        # or -t to filter

# 3. Whole-project decompile to a buildable C# tree
ilspycmd suspect.dll -p -o ./decompiled/

# 3b. Or dump a single file / inspect IL of one type
ilspycmd suspect.dll                    # C# to stdout
ilspycmd -il suspect.dll                # IL to stdout

# 4. If obfuscated, deobfuscate FIRST, then decompile the cleaned output
de4dot.exe suspect.dll                  # -> suspect-cleaned.dll
ilspycmd suspect-cleaned.dll -p -o ./decompiled/

# 4b. ConfuserEx specifically
de4dot-x64.exe suspect.dll -p crx       # control-flow cleanup
#   (handle anti-tamper/strings in dnSpyEx per section 6 if needed)

# 5. Need to PATCH a check rather than just read?
ildasm /all /out=suspect.il suspect.dll # edit IL text
ilasm /dll suspect.il                   # reassemble
#   or just edit IL inline in dnSpyEx and File -> Save Module
```

Decision flow:

```
managed? ──no──▶ native RE (different toolchain: Ghidra/IDA)
   │ yes
   ▼
obfuscated? ──no──▶ ilspycmd -p   (done: readable C#)
   │ yes
   ▼
de4dot (+ fork) ──▶ strings/anti-tamper in dnSpyEx ──▶ ilspycmd -p
```

---

## Sources

1. Softanics — What attackers can see in your assembly: https://www.softanics.com/net-obfuscation/tools/decompilers
1b. NDepend — In the jungle of .NET decompilers (7 compared): https://blog.ndepend.com/in-the-jungle-of-net-decompilers/
2. Ecma International — ECMA-335 CLI standard: https://www.ecma-international.org/publications-and-standards/standards/ecma-335/
3. Microsoft Learn — Determine if an image is native or CLR: https://learn.microsoft.com/en-us/cpp/dotnet/how-to-determine-if-an-image-is-native-or-clr
4. C# Corner — 5 Free Decompilers (dnSpyEx, ILSpy, dotPeek): https://www.c-sharpcorner.com/article/net-5-free-decompilers2/
4b. ittrip — Detect .NET AnyCPU via COR20/CorFlags: https://en.ittrip.xyz/c-sharp/detect-dotnet-anycpu
5. Stack Overflow — Interpreting the CorFlags flags: http://stackoverflow.com/questions/18608785/how-to-interpret-the-corflags-flags/23614024
6. Microsoft Learn — View assembly contents (ildasm): https://learn.microsoft.com/en-us/dotnet/standard/assembly/view-contents
7. de4dot.org — de4dot unpacking tool: http://de4dot.org/
8. Arch manual — monodis(1): https://man.archlinux.org/man/monodis.1.en
9. Redgate Simple-Talk — Anatomy of a .NET Assembly, CLR metadata: https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-clr-metadata-1/
10. Microsoft — CorFlags.exe Conversion Tool: https://docs.microsoft.com/el-gr/dotnet/framework/tools/corflags-exe-corflags-conversion-tool
11. GitHub — icsharpcode/ILSpy: https://github.com/icsharpcode/ILSpy
12. ByteHide — Best .NET decompilers comparison: https://bytehide.com/blog/best-dotnet-decompilers
13. GitHub — de4dot/de4dot: https://github.com/de4dot/de4dot
14. Iterasec — Understanding ConfuserEx2 obfuscation/deobfuscation: https://iterasec.com/blog/understanding-confuserex2-net-obfuscation-and-deobfuscation-techniques/
15. GitHub — NETReactorSlayer: https://github.com/SychicBoy/NETReactorSlayer
16. Softanics — Best .NET obfuscators 2026: https://www.softanics.com/net-obfuscation/tools
17. InfoSec Institute — .NET round-trip engineering: https://www.infosecinstitute.com/resources/reverse-engineering/demystifying-dot-net-reverse-engineering-advanced-round-trip-engineering/
18. Stack Overflow — ildasm/ilasm round trip and strong names: https://stackoverflow.com/q/8765188
19. Microsoft Learn — System.Reflection.Metadata.Ecma335: https://learn.microsoft.com/en-us/dotnet/api/system.reflection.metadata.ecma335?view=net-7.0
