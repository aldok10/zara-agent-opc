# DLL Calling: Signature Reconstruction & Cross-Language Harnesses

TL;DR: Reconstructing function signatures from decompilation, calling DLL exports from C/Python/Go/C#/PHP, and writing safe test harnesses.
See also: `dll-listing-exports-ordinals.md`, `dll-com-identification-header.md`

---

## 4. Reconstructing function signatures from decompilation

The export table gives names and addresses but **not signatures**. To call a function safely
you need: parameter count, parameter types, return type, and calling convention. Recover them
from a decompiler (IDA, Ghidra, Binary Ninja).

Checklist when reading decompiled code:

1. **Calling convention** -- On x86, look at who cleans the stack. A trailing `ret 0xN`
   (callee cleanup) => `__stdcall`; bare `ret` with caller-side `add esp, N` => `__cdecl`. Args
   in `ecx`/`edx` => `__fastcall`/thiscall. On x64, the convention is fixed (RCX, RDX, R8, R9,
   then stack; XMM0-3 for floats) so convention ambiguity mostly disappears
   ([MS calling conventions](https://learn.microsoft.com/en-us/cpp/build/calling-conventions)).
2. **Parameter count** -- count distinct incoming stack slots `[ebp+8]`, `[ebp+0xC]`... (x86) or
   the RCX/RDX/R8/R9 + `[rsp+...]` reads (x64) before they're written.
3. **Parameter types** -- infer from usage: dereferenced as `char*` => string/buffer; compared
   to small ints => enum/flags; passed to `lstrlenW` => `wchar_t*`; sizeof patterns => struct ptr.
4. **Return type** -- what's in `eax`/`rax` (or `xmm0` for floating point) at the `ret`. NTSTATUS
   / HRESULT patterns (compared against `0`, `0x80000000`) signal an error code.
5. **The `@N` decoration** (if present) directly gives stack arg bytes; divide by 4 (x86) for a
   rough parameter count of pointer/int args.

Ghidra/IDA let you set the prototype, which re-types the decompilation and makes the rest
legible. Iterate: fix one type, re-read, fix the next.

---

## 5. Calling a DLL to understand it (cross-language harnesses)

The fastest way to confirm a reconstructed signature is to **call it** and observe. Write a
thin harness. Always start in a throwaway process -- a wrong signature corrupts the stack.

### C -- LoadLibrary + GetProcAddress

`LoadLibrary` maps the DLL into the process; it does **not** auto-resolve symbols for you --
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

### Python -- ctypes (no compiler needed; ideal for exploration)

`ctypes` is the fastest harness. `CDLL` uses `__cdecl`, `WinDLL` uses `__stdcall`, `OleDLL`
assumes a returned `HRESULT` ([ctypes docs](https://docs.python.org/3/library/ctypes.html)).

```python
import ctypes
from ctypes import c_int, c_double, c_char_p, POINTER

# stdcall export -> WinDLL; cdecl -> CDLL
dll = ctypes.WinDLL("target.dll")

Add = dll.Add
Add.argtypes = [c_int, c_int]   # ALWAYS set these -- prevents silent ABI bugs
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

Setting `argtypes`/`restype` is the single most important habit -- without it ctypes assumes
`int` everywhere and 64-bit pointers get truncated
([SO 5267434](https://stackoverflow.com/questions/5267434/python-ctypes-argument-errors),
[ctypes tutorial](http://docs.python.org/library/ctypes)).

### Go -- syscall + golang.org/x/sys/windows

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

### C# / .NET -- P/Invoke (DllImport)

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
match the native one -- `Cdecl` vs `StdCall` mismatch throws or corrupts the stack
([jacksondunstan P/Invoke](https://www.jacksondunstan.com/articles/5120),
[SO 16332701](http://stackoverflow.com/questions/16332701/)). Set
`SetLastError = true` if you want `Marshal.GetLastWin32Error()`.

### PHP -- FFI

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
exports, FFI has no convention selector -- wrap the DLL or rebuild it `extern "C"` cdecl, or
call it from a cdecl shim. C++ mangled exports cannot be named directly; expose them
`extern "C"` first ([SO 78578433](https://stackoverflow.com/questions/78578433/php-fficdef-for-a-c-function)).

### rundll32 (quick-and-dirty, narrow contract)

`rundll32 target.dll,EntryPoint args` only works for exports with the specific
`void CALLBACK Entry(HWND, HINSTANCE, LPSTR lpszCmdLine, int nCmdShow)` signature. It is a
triage tool, not a general harness -- most exports will crash it. Prefer ctypes/Go for real
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
- **Log GetLastError** after each call (`SetLastError`/`windows.GetLastError`) -- many exports
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
