# DLL COM Identification, Purpose Profiling & Header Recovery

TL;DR: Recognizing COM DLLs, profiling DLL intent from imports/strings/resources, and writing reconstructed C headers for cross-language binding.
See also: `dll-listing-exports-ordinals.md`, `dll-calling-cross-language.md`

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

**Imports -> capabilities.** What the DLL *calls* reveals what it *does*
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
URLs, registry paths, format strings, error messages, SQL, and embedded file paths -- fast
intent signal.

**Resources.** PE resources (icons, manifests, version info, embedded TYPELIBs, embedded
binaries) via Resource Hacker / CFF Explorer. Version-info gives the original product/company;
an embedded TYPELIB confirms COM; an embedded PE in a resource suggests a dropper.

Combine: imports tell you *what subsystems*, strings tell you *what targets/endpoints*,
exports tell you *what it offers callers*.

---

## 9. Header recovery: writing a `.h` to call the DLL

Once signatures are reconstructed (section 4), encode them as a C header so any language can bind.
Use `extern "C"` to keep names undecorated and the convention explicit.

```c
// target.h  -- reconstructed API surface for target.dll
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

- **C** -- `#include "target.h"` and link the import lib, or keep using GetProcAddress with the
  typedefs.
- **Go** -- translate each prototype to a `dll.NewProc("Add")` + typed wrapper; map structs to Go
  structs with matching field layout/alignment.
- **PHP** -- paste the prototypes (minus MSVC macros) straight into `FFI::cdef("...", "target.dll")`.
- **Python** -- set `argtypes`/`restype` per prototype; mirror structs with `ctypes.Structure`.
- **C#** -- one `[DllImport]` per prototype, structs as `[StructLayout(LayoutKind.Sequential)]`.

Critical correctness rules when authoring the header:

- Match the **calling convention** exactly (`CC` macro). Wrong convention = stack corruption.
- Match **struct layout**: field order, types, and packing. Add `#pragma pack` if the DLL was
  built with non-default alignment.
- Use the right **pointer width**: build/call as the same bitness (x86 vs x64) as the DLL
  (`dumpbin /HEADERS` -> machine type).
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
