# DLL Exports & Interop: How to USE and Understand a DLL

Practical reverse-engineering reference for the "I have a DLL, how do I see what it exports
and actually call it" workflow. Covers enumeration, signature reconstruction, name decoration,
and cross-language calling harnesses (C, Go, PHP, Python, C#).

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
dumpbin /IMPORTS target.dll      :: what the DLL itself depends on (see §8)
dumpbin /DEPENDENTS target.dll   :: just the dependent DLL names
```

If `dumpbin /EXPORTS` shows **no function names**, the DLL is often a managed (.NET) assembly
exposing types rather than C exports, or it exports purely by ordinal
([SO 31940554](https://stackoverflow.com/questions/31940554/)).

### rabin2 (radare2) — cross-platform

`rabin2` parses PE/ELF/Mach-O without Windows ([man page](https://man.archlinux.org/man/rabin2.1.en.txt)).

```bash
rabin2 -E target.dll     # exports
rabin2 -i target.dll     # imports
rabin2 -I target.dll     # binary info: arch, bits, OS, NX, PIC
rabin2 -z target.dll     # strings in data sections (see §8)
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

- **Dependencies** (lucasg) — modern open-source rewrite of the abandoned Dependency Walker;
  shows import/export trees and resolves forwarders ([github.com/lucasg/Dependencies](https://github.com/lucasg/Dependencies)).
- **Dependency Walker** (`depends.exe`) — legacy, still useful for static import graphs but
  produces false positives on delay-load / API sets on modern Windows.
- **CFF Explorer / PE-bear** — visual PE structure editors, good for eyeballing the export
  directory and section layout.

---

## 2. Ordinals vs names, and forwarders

Every export has an **ordinal** (a 16-bit index into the export address table). It *may* also
have a name. Three cases you must recognize:

| Case | What you see | How to call |
|------|--------------|-------------|
| Named export | name + ordinal | `GetProcAddress(h, "Foo")` |
| Ordinal-only | ordinal, no name | `GetProcAddress(h, MAKEINTRESOURCE(7))` |
| Forwarder | name → `OtherDll.OtherFunc` | OS silently redirects at load |

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
`(forwarded to ...)`. Don't waste time decompiling a forwarder — follow it to the real target.

To call an ordinal-only export in C:

```c
typedef int (__stdcall *PFN)(int);
PFN fn = (PFN)GetProcAddress(h, MAKEINTRESOURCEA(7)); // ordinal 7
```

`GetProcAddress` accepts either a name string or `MAKEINTRESOURCE(ordinal)` for the lpProcName
argument ([MS Learn GetProcAddress](https://learn.microsoft.com/en-us/cpp/build/getprocaddress)).
It returns NULL for anything not in the export table — internal/unexported functions are
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
Note `extern "C"` disables *C++* mangling but **not** the `@N` stdcall decoration — a `.def`
file or `/EXPORT:Foo=_Foo@4` pragma is needed to strip that
([Old New Thing](https://devblogs.microsoft.com/oldnewthing/20120525-00/?p=7533)).

---

## 4. Reconstructing function signatures from decompilation

The export table gives names and addresses but **not signatures**. To call a function safely
you need: parameter count, parameter types, return type, and calling convention. Recover them
from a decompiler (IDA, Ghidra, Binary Ninja).

Checklist when reading decompiled code:

1. **Calling convention** — On x86, look at who cleans the stack. A trailing `ret 0xN`
   (callee cleanup) ⇒ `__stdcall`; bare `ret` with caller-side `add esp, N` ⇒ `__cdecl`. Args
   in `ecx`/`edx` ⇒ `__fastcall`/thiscall. On x64, the convention is fixed (RCX, RDX, R8, R9,
   then stack; XMM0-3 for floats) so convention ambiguity mostly disappears
   ([MS calling conventions](https://learn.microsoft.com/en-us/cpp/build/calling-conventions)).
2. **Parameter count** — count distinct incoming stack slots `[ebp+8]`, `[ebp+0xC]`… (x86) or
   the RCX/RDX/R8/R9 + `[rsp+...]` reads (x64) before they're written.
3. **Parameter types** — infer from usage: dereferenced as `char*` ⇒ string/buffer; compared
   to small ints ⇒ enum/flags; passed to `lstrlenW` ⇒ `wchar_t*`; sizeof patterns ⇒ struct ptr.
4. **Return type** — what's in `eax`/`rax` (or `xmm0` for floating point) at the `ret`. NTSTATUS
   / HRESULT patterns (compared against `0`, `0x80000000`) signal an error code.
5. **The `@N` decoration** (if present) directly gives stack arg bytes; divide by 4 (x86) for a
   rough parameter count of pointer/int args.

Ghidra/IDA let you set the prototype, which re-types the decompilation and makes the rest
legible. Iterate: fix one type, re-read, fix the next.

---

## 5. Calling a DLL to understand it (cross-language harnesses)

The fastest way to confirm a reconstructed signature is to **call it** and observe. Write a
thin harness. Always start in a throwaway process — a wrong signature corrupts the stack.

### C — LoadLibrary + GetProcAddress

`LoadLibrary` maps the DLL into the process; it does **not** auto-resolve symbols for you —
you fetch each function pointer with `GetProcAddress`
([SO 8696653](https://stackoverflow.com/questions/8696653/dynamically-load-a-function-from-a-dll),
[MS GetProcAddress](https://learn.microsoft.com/en-us/cpp/build/getprocaddress)).

```c
#include <windows.h>
#include <stdio.h>

// Reconstructed: int __stdcall Add(int, int);
typedef int (__stdcall *AddFn)(int, int);

int main(void) {
    HMODULE h = LoadLibraryA("target.dll");
    if (!h) { printf("load failed: %lu\n", GetLastError()); return 1; }

    AddFn Add = (AddFn)GetProcAddress(h, "Add");      // or MAKEINTRESOURCEA(ord)
    if (!Add) { printf("symbol not found\n"); FreeLibrary(h); return 1; }

    printf("Add(2,3) = %d\n", Add(2, 3));
    FreeLibrary(h);
    return 0;
}
```

The function-pointer typedef **must** match the real calling convention. A mismatch (declaring
`__cdecl` for a `__stdcall` export) corrupts the stack and crashes on return
([MS calling-convention blog](https://learn.microsoft.com/en-us/archive/blogs/mithuns/pay-attention-to-the-calling-convention),
[SO 31282683](https://stackoverflow.com/questions/31282683/dll-call-with-stdcall-getprocaddress-in-vs2013)).

### Python — ctypes (no compiler needed; ideal for exploration)

`ctypes` is the fastest harness. `CDLL` uses `__cdecl`, `WinDLL` uses `__stdcall`, `OleDLL`
assumes a returned `HRESULT` ([ctypes docs](https://docs.python.org/3/library/ctypes.html)).

```python
import ctypes
from ctypes import c_int, c_double, c_char_p, POINTER

# stdcall export -> WinDLL; cdecl -> CDLL
dll = ctypes.WinDLL("target.dll")

Add = dll.Add
Add.argtypes = [c_int, c_int]   # ALWAYS set these — prevents silent ABI bugs
Add.restype  = c_int
print("Add(2,3) =", Add(2, 3))

# ordinal-only export #7:
fn = dll[7]
fn.restype = c_double

# string in / string out:
proc = dll.Format
proc.argtypes = [c_char_p]
proc.restype  = c_char_p
print(proc(b"hello"))
```

Setting `argtypes`/`restype` is the single most important habit — without it ctypes assumes
`int` everywhere and 64-bit pointers get truncated
([SO 5267434](https://stackoverflow.com/questions/5267434/python-ctypes-argument-errors),
[ctypes tutorial](http://docs.python.org/library/ctypes)).

### Go — syscall + golang.org/x/sys/windows

Go has no cgo dependency for this; use `windows.NewLazyDLL` and `proc.Call`
([Go Wiki: Calling a Windows DLL](https://tip.golang.org/wiki/WindowsDLLs)).

```go
package main

import (
	"fmt"
	"golang.org/x/sys/windows"
)

func main() {
	dll := windows.NewLazyDLL("target.dll")
	add := dll.NewProc("Add")

	// proc.Call returns (r1, r2 uintptr, lastErr error)
	r1, _, err := add.Call(uintptr(2), uintptr(3))
	if err != windows.ERROR_SUCCESS {
		fmt.Println("note:", err) // GetLastError; often ignorable for pure-compute fns
	}
	fmt.Println("Add(2,3) =", int32(r1))
}
```

`proc.Call` pads missing args and works regardless of the exact arity, marshaling everything as
`uintptr`; pointers go through `unsafe.Pointer` then `uintptr`
([Go Wiki](https://tip.golang.org/wiki/WindowsDLLs),
[gist thesubtlety](https://gist.github.com/thesubtlety/be6e7ec9c19083473bed4cae11c8160d)).
Under the hood it calls `syscall.SyscallN`. On x64 there is one convention so stdcall/cdecl
doesn't matter; on 386 builds, Go assumes stdcall.

### C# / .NET — P/Invoke (DllImport)

`DllImport` declares a managed entry point that thunks into the native function and marshals
args ([MS P/Invoke](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/pinvoke),
[MS How-to PInvoke](https://docs.microsoft.com/cpp/dotnet/how-to-call-native-dlls-from-managed-code-using-pinvoke)).

```csharp
using System;
using System.Runtime.InteropServices;

static class Native {
    // Match the native calling convention explicitly.
    [DllImport("target.dll", CallingConvention = CallingConvention.StdCall,
               EntryPoint = "Add")]
    public static extern int Add(int a, int b);

    // string in/out with marshaling:
    [DllImport("target.dll", CharSet = CharSet.Ansi)]
    public static extern IntPtr Format([MarshalAs(UnmanagedType.LPStr)] string s);
}

class Program {
    static void Main() => Console.WriteLine($"Add(2,3) = {Native.Add(2, 3)}");
}
```

The signature must match the export name (or use `EntryPoint`), and `CallingConvention` must
match the native one — `Cdecl` vs `StdCall` mismatch throws or corrupts the stack
([jacksondunstan P/Invoke](https://www.jacksondunstan.com/articles/5120),
[SO 16332701](http://stackoverflow.com/questions/16332701/)). Set
`SetLastError = true` if you want `Marshal.GetLastWin32Error()`.

### PHP — FFI

PHP 7.4+ `FFI` calls C functions from a C declaration string
([PHP FFI manual](https://www.php.net/manual/en/ffi.examples-basic),
[php-ffi README](https://github.com/dstogov/php-ffi/blob/master/README.md)).

```php
<?php
// Declare the C signatures, then bind to the library.
$ffi = FFI::cdef(
    "int Add(int a, int b);
     char* Format(const char* s);",
    "target.dll"            // on Linux: "libtarget.so"
);

echo "Add(2,3) = ", $ffi->Add(2, 3), PHP_EOL;
echo FFI::string($ffi->Format("hello")), PHP_EOL;
```

FFI assumes the platform's default C convention (`cdecl` on x86). For `__stdcall`-only x86
exports, FFI has no convention selector — wrap the DLL or rebuild it `extern "C"` cdecl, or
call it from a cdecl shim. C++ mangled exports cannot be named directly; expose them
`extern "C"` first ([SO 78578433](https://stackoverflow.com/questions/78578433/php-fficdef-for-a-c-function)).

### rundll32 (quick-and-dirty, narrow contract)

`rundll32 target.dll,EntryPoint args` only works for exports with the specific
`void CALLBACK Entry(HWND, HINSTANCE, LPSTR lpszCmdLine, int nCmdShow)` signature. It is a
triage tool, not a general harness — most exports will crash it. Prefer ctypes/Go for real
exploration.

---

## 6. Writing a harness to test exports safely

A wrong signature is undefined behavior. Reduce blast radius:

- **Isolate the process.** Run the harness as a separate short-lived process so a crash
  doesn't take down anything else. Wrap calls in SEH (`__try/__except` in C) or a `try/except`
  + subprocess in Python to capture access violations.
- **Start read-only.** Call functions that only *read* before any that mutate global state or
  touch the filesystem/registry/network.
- **Probe arity incrementally.** With ctypes/Go you can call with extra `0` args cheaply;
  watch for stack imbalance (stdcall callee-cleanup will fault on return if arity is wrong).
- **Log GetLastError** after each call (`SetLastError`/`windows.GetLastError`) — many exports
  signal failure there rather than via return value.
- **Sandbox side effects.** Run in a VM/container snapshot if the DLL may write files, spawn
  processes, or phone home. Treat unknown DLLs as hostile.
- **Validate against multiple inputs.** Confirm a reconstructed type by feeding boundary values
  (0, negative, large, NULL pointer where a pointer is expected) and observing behavior.

```python
import ctypes, faulthandler
faulthandler.enable()        # dump a traceback on segfault instead of silent death
dll = ctypes.WinDLL("target.dll")
fn = dll.Suspect
fn.argtypes = [ctypes.c_int]; fn.restype = ctypes.c_int
for v in (0, 1, -1, 0x7fffffff):
    try:
        print(v, "->", fn(v), "err", ctypes.get_last_error())
    except OSError as e:
        print(v, "crashed:", e)
```

---

## 7. COM DLLs

COM in-proc servers are DLLs with a distinct contract. Recognize and inspect them:

**Recognition.** A COM in-proc server exports `DllGetClassObject` (the entry COM calls to
instantiate a class) and usually `DllRegisterServer` / `DllUnregisterServer` / `DllCanUnloadNow`
([SO 201590](https://stackoverflow.com/questions/201590/identifying-com-components-in-a-net-application),
[SO 2681313](http://stackoverflow.com/questions/2681313)). Detect by checking the export table:

```bash
rabin2 -E server.dll | grep -E "DllGetClassObject|DllRegisterServer"
```

If `DllGetClassObject` is present, it's an in-proc COM server; presence of
`DllRegisterServer` alone means it's self-registering
([SO 1423504](https://stackoverflow.com/q/1423504)). A plain Win32 DLL lacking
`DllRegisterServer` cannot be registered with `regsvr32` and will error
"entry point was not found" ([SO 13931337](https://stackoverflow.com/questions/13931337/),
[SO 3243980](https://stackoverflow.com/questions/3243980/why-wont-my-dll-register-with-regsvr32)).

**Registration.** `regsvr32 server.dll` loads the DLL and calls its `DllRegisterServer`, which
writes CLSID/ProgID/InterfaceID keys under `HKCR`. `regsvr32 /u` unregisters
([SO 4198583](https://stackoverflow.com/questions/4198583/how-do-i-register-a-net-com-dll-with-regsvr32)).

**Type libraries (.tlb).** The contract (interfaces, methods, GUIDs) is often embedded as a
TYPELIB resource or shipped as a `.tlb`. Inspect it with **OLE/COM Object Viewer** (`oleview.exe`,
Windows SDK), which renders type libraries and supported interfaces as IDL
([MS oleview](https://learn.microsoft.com/da-dk/windows/win32/com/ole-com-object-viewer)). You
can also `OleView.NET` (modern) or `tlbimp`/`OleViewDotNet` to extract IDL, then generate
language bindings.

**Calling.** Once registered, instantiate by CLSID/ProgID: `CoCreateInstance` in C/C++,
`win32com.client.Dispatch("ProgID")` in Python, `Type.GetTypeFromProgID` in C#
([SO 3214573](https://stackoverflow.com/questions/3214573/how-do-i-check-if-a-com-dll-is-registered-in-csharp)).
.NET COM-visible assemblies register via `regasm`, not raw `regsvr32`, unless they ship a
COM host shim ([SO 78006994](https://stackoverflow.com/questions/78006994/)).

---

## 8. Identifying what a DLL is for

Before calling anything, profile intent from three signals.

**Imports → capabilities.** What the DLL *calls* reveals what it *does*
([dumpbin /IMPORTS](https://learn.microsoft.com/en-us/cpp/build/reference/dumpbin-reference),
`rabin2 -i`). Map import DLLs/functions to behavior:

| Imported from | Capability inferred |
|---------------|---------------------|
| `ws2_32.dll`, `wininet.dll`, `winhttp.dll` | Networking / HTTP |
| `advapi32.dll` (`RegOpenKey`, `CryptAcquireContext`) | Registry / crypto |
| `bcrypt.dll`, `crypt32.dll` | Modern crypto / certificates |
| `kernel32` `CreateFile`/`WriteFile` | Filesystem I/O |
| `user32.dll`, `gdi32.dll` | UI / windowing |
| `ntdll.dll` direct (`Nt*`/`Zw*`) | Low-level / possibly evasive |

Many `Nt*`/`Zw*` direct syscalls or dynamic resolution (`LoadLibrary`+`GetProcAddress` on
obfuscated strings) is a red flag for packed/malicious code.

**Strings.** `rabin2 -z target.dll`, `strings`, or FLOSS (for stack/obfuscated strings) surface
URLs, registry paths, format strings, error messages, SQL, and embedded file paths — fast
intent signal.

**Resources.** PE resources (icons, manifests, version info, embedded TYPELIBs, embedded
binaries) via Resource Hacker / CFF Explorer. Version-info gives the original product/company;
an embedded TYPELIB confirms COM; an embedded PE in a resource suggests a dropper.

Combine: imports tell you *what subsystems*, strings tell you *what targets/endpoints*,
exports tell you *what it offers callers*.

---

## 9. Header recovery: writing a `.h` to call the DLL

Once signatures are reconstructed (§4), encode them as a C header so any language can bind.
Use `extern "C"` to keep names undecorated and the convention explicit.

```c
// target.h  — reconstructed API surface for target.dll
#ifndef TARGET_H
#define TARGET_H
#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #define API __declspec(dllimport)
  #define CC  __stdcall          // match the reverse-engineered convention
#else
  #define API
  #define CC
#endif

API int  CC Add(int a, int b);
API char* CC Format(const char* s);
typedef struct { int id; double value; } Record;  // reconstructed struct
API int  CC ProcessRecord(Record* r);

#ifdef __cplusplus
}
#endif
#endif // TARGET_H
```

This header drives every binding above:

- **C** — `#include "target.h"` and link the import lib, or keep using GetProcAddress with the
  typedefs.
- **Go** — translate each prototype to a `dll.NewProc("Add")` + typed wrapper; map structs to Go
  structs with matching field layout/alignment.
- **PHP** — paste the prototypes (minus MSVC macros) straight into `FFI::cdef("...", "target.dll")`.
- **Python** — set `argtypes`/`restype` per prototype; mirror structs with `ctypes.Structure`.
- **C#** — one `[DllImport]` per prototype, structs as `[StructLayout(LayoutKind.Sequential)]`.

Critical correctness rules when authoring the header:

- Match the **calling convention** exactly (`CC` macro). Wrong convention = stack corruption.
- Match **struct layout**: field order, types, and packing. Add `#pragma pack` if the DLL was
  built with non-default alignment.
- Use the right **pointer width**: build/call as the same bitness (x86 vs x64) as the DLL
  (`dumpbin /HEADERS` → machine type).
- Mark **string ownership**: who frees a returned `char*`? Guess wrong and you leak or
  double-free. Note it in a comment.

A `.def` file complements the header when you also want to *produce* a clean import library
(`lib /def:target.def /out:target.lib /machine:x64`), which lets you link by name instead of
GetProcAddress.

---

## Sources

- Microsoft Learn: [GetProcAddress](https://learn.microsoft.com/en-us/cpp/build/getprocaddress),
  [decorated-names](https://learn.microsoft.com/cpp/build/reference/decorated-names),
  [calling conventions](https://learn.microsoft.com/en-us/cpp/build/calling-conventions),
  [dumpbin reference](https://learn.microsoft.com/en-us/cpp/build/reference/dumpbin-reference),
  [P/Invoke](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/pinvoke),
  [OLE/COM Object Viewer](https://learn.microsoft.com/da-dk/windows/win32/com/ole-com-object-viewer),
  [calling-convention attention](https://learn.microsoft.com/en-us/archive/blogs/mithuns/pay-attention-to-the-calling-convention)
- The Old New Thing: [extern "C" and mangling](https://devblogs.microsoft.com/oldnewthing/20120525-00/?p=7533)
- Go: [Wiki Calling a Windows DLL](https://tip.golang.org/wiki/WindowsDLLs),
  [dll_windows.go](https://github.com/golang/go/blob/master/src/syscall/dll_windows.go),
  [gist thesubtlety](https://gist.github.com/thesubtlety/be6e7ec9c19083473bed4cae11c8160d)
- Python: [ctypes docs](https://docs.python.org/3/library/ctypes.html),
  [ctypes tutorial](http://docs.python.org/library/ctypes),
  [pefile exports gist](https://gist.github.com/k3idii/da4235d3b9eaa2ebe349555a92eac6c2)
- PHP: [FFI basic usage](https://www.php.net/manual/en/ffi.examples-basic),
  [php-ffi README](https://github.com/dstogov/php-ffi/blob/master/README.md),
  [FFI for C++ function](https://stackoverflow.com/questions/78578433/php-fficdef-for-a-c-function)
- radare2: [rabin2 man page](https://man.archlinux.org/man/rabin2.1.en.txt)
- Tools: [Dependencies (lucasg)](https://github.com/lucasg/Dependencies)
- Stack Overflow: [305444](https://stackoverflow.com/q/305444),
  [11657968](https://stackoverflow.com/questions/11657968/how-to-get-list-of-functions-inside-a-dll-managed-and-unmanaged),
  [14176236](https://stackoverflow.com/q/14176236),
  [8696653](https://stackoverflow.com/questions/8696653/dynamically-load-a-function-from-a-dll),
  [2804945](http://stackoverflow.com/a/2804945/1020470),
  [4795108](http://stackoverflow.com/questions/4795108/unmangling-c-dll-function-names),
  [538134](https://stackoverflow.com/questions/538134),
  [60249591](https://stackoverflow.com/questions/60249591/why-microsoft-linker-modifies-decorated-export-names),
  [201590](https://stackoverflow.com/questions/201590/identifying-com-components-in-a-net-application),
  [2681313](http://stackoverflow.com/questions/2681313),
  [1423504](https://stackoverflow.com/q/1423504),
  [13931337](https://stackoverflow.com/questions/13931337/),
  [3243980](https://stackoverflow.com/questions/3243980/why-wont-my-dll-register-with-regsvr32),
  [4198583](https://stackoverflow.com/questions/4198583/how-do-i-register-a-net-com-dll-with-regsvr32),
  [16332701](http://stackoverflow.com/questions/16332701/),
  [5267434](https://stackoverflow.com/questions/5267434/python-ctypes-argument-errors)
- [jacksondunstan: A Journey Through a P/Invoke Call](https://www.jacksondunstan.com/articles/5120)
- [RE.SE: accessing unexported functions](https://reverseengineering.stackexchange.com/a/18679)
