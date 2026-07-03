# DLL Exports: Listing, Ordinals, Forwarders & Name Decoration

TL;DR: How to enumerate DLL exports with dumpbin/rabin2/pefile/GUI tools, understanding ordinal-only and forwarded exports, and C/C++ name decoration rules.
See also: `dll-calling-cross-language.md`, `dll-com-identification-header.md`

---

## 1. Listing exports

A DLL's public API surface is its **export table** (the `IMAGE_EXPORT_DIRECTORY`). Every
externally callable function appears there as either a **named** export, an **ordinal-only**
export, or a **forwarder**. Start by dumping it.

### dumpbin (Visual Studio toolchain)

`dumpbin` ships with Visual Studio / the Build Tools and is the canonical Windows tool
([MS Learn](https://learn.microsoft.com/en-us/cpp/build/reference/dumpbin-reference)).

```bat
dumpbin /EXPORTS C:\Windows\System32\kernel32.dll
```

Output gives ordinal, hint, RVA, and name for each export. For an import library (`.lib`
that refers to a DLL) use `dumpbin /EXPORTS`; for static-lib symbols use `/SYMBOLS`
([SO 305444](https://stackoverflow.com/q/305444), [SO 11657968](https://stackoverflow.com/questions/11657968/how-to-get-list-of-functions-inside-a-dll-managed-and-unmanaged)).

```bat
dumpbin /HEADERS target.dll      :: machine type (x86/x64/ARM64), subsystem, characteristics
dumpbin /IMPORTS target.dll      :: what the DLL itself depends on (see section 8)
dumpbin /DEPENDENTS target.dll   :: just the dependent DLL names
```

If `dumpbin /EXPORTS` shows **no function names**, the DLL is often a managed (.NET) assembly
exposing types rather than C exports, or it exports purely by ordinal
([SO 31940554](https://stackoverflow.com/questions/31940554/)).

### rabin2 (radare2) -- cross-platform

`rabin2` parses PE/ELF/Mach-O without Windows ([man page](https://man.archlinux.org/man/rabin2.1.en.txt)).

```bash
rabin2 -E target.dll     # exports
rabin2 -i target.dll     # imports
rabin2 -I target.dll     # binary info: arch, bits, OS, NX, PIC
rabin2 -z target.dll     # strings in data sections (see section 8)
```

### pefile (Python, scriptable)

`pefile` is the workhorse for automated enumeration ([gist k3idii](https://gist.github.com/k3idii/da4235d3b9eaa2ebe349555a92eac6c2)).

```python
import pefile

pe = pefile.PE("target.dll")
for exp in pe.DIRECTORY_ENTRY_EXPORT.symbols:
    name = exp.name.decode() if exp.name else f"<ordinal {exp.ordinal}>"
    fwd  = exp.forwarder.decode() if exp.forwarder else None
    print(f"ord={exp.ordinal:<5} rva=0x{exp.address:08x} {name}"
          + (f"  -> FORWARDED to {fwd}" if fwd else ""))

print("machine:", hex(pe.FILE_HEADER.Machine))  # 0x8664 = x64, 0x14c = x86
```

### GUI inspectors

- **Dependencies** (lucasg) -- modern open-source rewrite of the abandoned Dependency Walker;
  shows import/export trees and resolves forwarders ([github.com/lucasg/Dependencies](https://github.com/lucasg/Dependencies)).
- **Dependency Walker** (`depends.exe`) -- legacy, still useful for static import graphs but
  produces false positives on delay-load / API sets on modern Windows.
- **CFF Explorer / PE-bear** -- visual PE structure editors, good for eyeballing the export
  directory and section layout.

---

## 2. Ordinals vs names, and forwarders

Every export has an **ordinal** (a 16-bit index into the export address table). It *may* also
have a name. Three cases you must recognize:

| Case | What you see | How to call |
|------|--------------|-------------|
| Named export | name + ordinal | `GetProcAddress(h, "Foo")` |
| Ordinal-only | ordinal, no name | `GetProcAddress(h, MAKEINTRESOURCE(7))` |
| Forwarder | name -> `OtherDll.OtherFunc` | OS silently redirects at load |

**Ordinal-only exports** are common in private/undocumented DLLs to hide intent. An importing
EXE that binds by ordinal shows ordinals (high bit `0x80000000` set in the thunk) instead of
names ([SO 14176236](https://stackoverflow.com/q/14176236)). To map an ordinal back to a
function you must reverse it: locate the export RVA, disassemble the target, and infer behavior.
There is no name to recover unless a matching PDB, import library, or sibling EXE that binds
by name exists. Build a cross-reference by diffing against known-good versions or symbol
servers when available.

**Forwarders** don't contain code; the export RVA points into the export section itself and
the string is `TargetDll.TargetFunction` (e.g. `kernel32`'s `HeapAlloc` forwards to
`ntdll.RtlAllocateHeap`). `pefile` exposes this via `exp.forwarder`; `dumpbin /EXPORTS` prints
`(forwarded to ...)`. Don't waste time decompiling a forwarder -- follow it to the real target.

To call an ordinal-only export in C:

```c
typedef int (__stdcall *PFN)(int);
PFN fn = (PFN)GetProcAddress(h, MAKEINTRESOURCEA(7)); // ordinal 7
```

`GetProcAddress` accepts either a name string or `MAKEINTRESOURCE(ordinal)` for the lpProcName
argument ([MS Learn GetProcAddress](https://learn.microsoft.com/en-us/cpp/build/getprocaddress)).
It returns NULL for anything not in the export table -- internal/unexported functions are
invisible to it ([RE.SE 18679](https://reverseengineering.stackexchange.com/a/18679)).

---

## 3. Name decoration / mangling demystified

What the export *name* looks like tells you the language and calling convention.

`__declspec(dllexport)` exposes the function **as the compiler decorated it**. A C++ function
gets full C++ mangling; a function marked `extern "C"` (or compiled as C) gets the simpler C
decoration ([Old New Thing](https://devblogs.microsoft.com/oldnewthing/20120525-00/?p=7533),
[MS decorated-names](https://learn.microsoft.com/cpp/build/reference/decorated-names)).

**C decoration (MSVC, depends on calling convention):**

| Convention | Decoration of `int Foo(int)` | Stack cleanup |
|------------|------------------------------|---------------|
| `__cdecl`   | `_Foo`            | caller |
| `__stdcall` | `_Foo@4`          | callee |
| `__fastcall`| `@Foo@4`          | callee |

The `@N` suffix is the **total bytes of parameters** ([MS decorated-names](https://learn.microsoft.com/cpp/build/reference/decorated-names),
[SO 538134](https://stackoverflow.com/questions/538134)). On x64 there is a single convention
so decoration mostly collapses to a plain name.

**C++ mangling** encodes namespace, class, parameter types, const-ness, etc., e.g.
`?Foo@@YAHH@Z`. This is what you get without `extern "C"`
([SO 2804945](http://stackoverflow.com/a/2804945/1020470)).

Decode mangled names:

```bat
undname "?Foo@@YAHH@Z"        :: MSVC SDK -> "int __cdecl Foo(int)"
```
```bash
c++filt _ZN3Foo3barEi          # Itanium/GCC ABI (MinGW, Linux)
echo '?Foo@@YAHH@Z' | undname  # via Wine/MSVC undname for MSVC ABI
```

To get **clean, undecorated** export names you control, either mark functions `extern "C"`
to kill C++ mangling ([SO 4795108](http://stackoverflow.com/questions/4795108/unmangling-c-dll-function-names)),
or use a **module-definition (.def) file** with an `EXPORTS` section to alias names
([SO 60249591](https://stackoverflow.com/questions/60249591/why-microsoft-linker-modifies-decorated-export-names)).
Note `extern "C"` disables *C++* mangling but **not** the `@N` stdcall decoration -- a `.def`
file or `/EXPORT:Foo=_Foo@4` pragma is needed to strip that
([Old New Thing](https://devblogs.microsoft.com/oldnewthing/20120525-00/?p=7533)).
