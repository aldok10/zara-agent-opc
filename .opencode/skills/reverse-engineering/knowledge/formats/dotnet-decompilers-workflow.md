# .NET Decompilers, de4dot, and Workflow

TL;DR: Decompiler tools compared (ILSpy, dnSpy, dotPeek), de4dot deobfuscation,
round-tripping with ildasm/ilasm, programmatic analysis, and end-to-end CLI workflow.

Cross-reference: See also `dotnet-cil-metadata-detection.md` in this directory.

---

## 5. Decompiler tools compared

| Tool | License | Platform | CLI? | Edit/Debug | Notes |
|------|---------|----------|------|-----------|-------|
| **ILSpy** | MIT, open source | Win/Linux/macOS (Avalonia) | Yes (`ilspycmd`) | Read-only | The de-facto standard; engine reused by VS F12 "Go to decompiled source" [11](https://github.com/icsharpcode/ILSpy). Active, cross-platform, whole-project export. |
| **dnSpy / dnSpyEx** | GPLv3, open source | Windows | Limited | **Yes** -- edit IL/C# and live debug | Original dnSpy archived; **dnSpyEx** is the maintained fork [4](https://www.c-sharpcorner.com/article/net-5-free-decompilers2/). Best for patching and runtime analysis. |
| **JetBrains dotPeek** | Free (proprietary) | Windows | No | Read-only | Strong if you live in ReSharper/Rider; can act as a symbol server [1b](https://blog.ndepend.com/in-the-jungle-of-net-decompilers/). |
| **Telerik JustDecompile** | Free (proprietary) | Windows | Plugin API | Read-only | Effectively unmaintained; fine for quick views, plugin ecosystem [12](https://bytehide.com/blog/best-dotnet-decompilers). |
| **Redgate .NET Reflector** | Paid | Windows | VS add-in | Read-only | The original (2000s) decompiler; debug-into-decompiled in Visual Studio [12](https://bytehide.com/blog/best-dotnet-decompilers). |
| **ILDasm / ILAsm** | Ships with SDK | Windows (mono on *nix) | Yes | Round-trip | Disassembles to/from IL text, not C#. Canonical for round-tripping [6](https://learn.microsoft.com/en-us/dotnet/standard/assembly/view-contents). |
| **monodis** | Mono, open source | Linux/macOS | Yes | Disasm only | Mono's ILDasm equivalent; great for scripted table dumps [8](https://man.archlinux.org/man/monodis.1.en). |

Rules of thumb [1b](https://blog.ndepend.com/in-the-jungle-of-net-decompilers/):
- Want **free + cross-platform + scriptable** -> ILSpy / `ilspycmd`.
- Need to **edit a binary or live-debug without source** -> dnSpyEx.
- Already in **JetBrains** ecosystem -> dotPeek.
- Need **IL text round-trip** -> ildasm/ilasm (or monodis on Linux).

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
| Type/member structure | High -- metadata preserves it exactly |
| Method logic | High for typical code; modern decompilers reconstruct LINQ, async/await, iterators, lambdas |
| Names (unobfuscated) | High -- `#Strings` heap holds originals |
| Names (obfuscated) | Lost -- replaced with `a`, `b`, Unicode/homoglyph junk; deobfuscators only generate *consistent* fresh names, not originals |
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

## 11. End-to-end CLI workflow: managed DLL -> readable C#

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

1. Softanics -- What attackers can see in your assembly: https://www.softanics.com/net-obfuscation/tools/decompilers
1b. NDepend -- In the jungle of .NET decompilers (7 compared): https://blog.ndepend.com/in-the-jungle-of-net-decompilers/
2. Ecma International -- ECMA-335 CLI standard: https://www.ecma-international.org/publications-and-standards/standards/ecma-335/
3. Microsoft Learn -- Determine if an image is native or CLR: https://learn.microsoft.com/en-us/cpp/dotnet/how-to-determine-if-an-image-is-native-or-clr
4. C# Corner -- 5 Free Decompilers (dnSpyEx, ILSpy, dotPeek): https://www.c-sharpcorner.com/article/net-5-free-decompilers2/
4b. ittrip -- Detect .NET AnyCPU via COR20/CorFlags: https://en.ittrip.xyz/c-sharp/detect-dotnet-anycpu
5. Stack Overflow -- Interpreting the CorFlags flags: http://stackoverflow.com/questions/18608785/how-to-interpret-the-corflags-flags/23614024
6. Microsoft Learn -- View assembly contents (ildasm): https://learn.microsoft.com/en-us/dotnet/standard/assembly/view-contents
7. de4dot.org -- de4dot unpacking tool: http://de4dot.org/
8. Arch manual -- monodis(1): https://man.archlinux.org/man/monodis.1.en
9. Redgate Simple-Talk -- Anatomy of a .NET Assembly, CLR metadata: https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-clr-metadata-1/
10. Microsoft -- CorFlags.exe Conversion Tool: https://docs.microsoft.com/el-gr/dotnet/framework/tools/corflags-exe-corflags-conversion-tool
11. GitHub -- icsharpcode/ILSpy: https://github.com/icsharpcode/ILSpy
12. ByteHide -- Best .NET decompilers comparison: https://bytehide.com/blog/best-dotnet-decompilers
13. GitHub -- de4dot/de4dot: https://github.com/de4dot/de4dot
14. Iterasec -- Understanding ConfuserEx2 obfuscation/deobfuscation: https://iterasec.com/blog/understanding-confuserex2-net-obfuscation-and-deobfuscation-techniques/
15. GitHub -- NETReactorSlayer: https://github.com/SychicBoy/NETReactorSlayer
16. Softanics -- Best .NET obfuscators 2026: https://www.softanics.com/net-obfuscation/tools
17. InfoSec Institute -- .NET round-trip engineering: https://www.infosecinstitute.com/resources/reverse-engineering/demystifying-dot-net-reverse-engineering-advanced-round-trip-engineering/
18. Stack Overflow -- ildasm/ilasm round trip and strong names: https://stackoverflow.com/q/8765188
19. Microsoft Learn -- System.Reflection.Metadata.Ecma335: https://learn.microsoft.com/en-us/dotnet/api/system.reflection.metadata.ecma335?view=net-7.0
