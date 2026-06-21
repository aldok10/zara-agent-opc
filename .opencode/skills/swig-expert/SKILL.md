---
name: swig-expert
description: SWIG interface generator expert — wrapping C/C++ for Go, Python, Java, C#, and other target languages. Interface files, typemaps, directors, templates, memory management, STL, C++11-20.
---

# SWIG Expert

**Senior DNA**: "It depends" — SWIG is the right tool when you have substantial C++ APIs (classes, templates, inheritance). For plain C with <10 functions, a hand-written wrapper is simpler. Always ask: can you avoid the C/C++ dependency entirely?

## Decision: When to Use SWIG

| Situation | Recommendation |
|-----------|---------------|
| Plain C, <10 functions | Hand-written cgo/ctypes wrapper |
| Plain C, >10 functions | SWIG saves time |
| C++ classes/templates | SWIG is the right tool |
| Single target language | Consider language-specific tools first |
| Multiple target languages | SWIG shines here |

## Interface File Structure

```c
// mylib.i
%module mylib
%{
#include "mylib.h"
%}
// SWIG directives (typemaps, renames, ignores)
%include "mylib.h"
```

## Go-Specific Pitfalls

| Pitfall | Fix |
|---------|-----|
| Forgot `defer mylib.DeleteX(v)` | Every `NewX()` needs matching `DeleteX()` via defer |
| Director reference cycle | C++ ref + Go ref = leak. Use weak pointers or explicit release |
| `go build` doesn't find SWIG | Name file `.swigcxx` (not `.i`) in Go package dir |
| Goroutine calls SWIG function | SWIG funcs hold GIL/lock — don't call from many goroutines |
| Panics from C++ exceptions | Add `%exception { try { $action } catch (std::exception& e) { _swig_gopanic(e.what()); } }` |
| Generated code too large | `%ignore` what you don't need |

## Memory Ownership Rules

| Scenario | Owner | Action |
|----------|-------|--------|
| `NewX()` / constructor | Target language | Must `DeleteX()` or defer |
| `%newobject` marked | Target language | GC handles (language-specific) |
| Return by pointer (no %newobject) | C++ | Don't delete from target |
| Pass pointer to C++ (stored) | Ambiguous | Document ownership explicitly |

## Key Directives (Non-Obvious Ones)

```c
%rename(Create) MyClass::MyClass;       // rename constructor
%ignore InternalHelper;                 // skip wrapping
%template(IntVector) std::vector<int>;  // instantiate template
%newobject MyFactory::create;           // caller owns result
%feature("director") Animal;            // enable virtual override from target
%immutable MyClass::readOnlyField;      // const correctness
```

## Directors (Cross-Language Inheritance)

Rules:
1. Enable per-class: `%module(directors="1")` + `%feature("director") ClassName`
2. Only public/protected virtual methods can be overridden
3. `final` methods excluded automatically
4. Creates reference cycle — manual memory management required
5. Significant overhead per call — never use in tight loops

## Typemaps (When Default Wrapping Fails)

```c
// Mark output parameters
%apply int *OUTPUT { int *result };

// Custom Go []byte to C char*+length
%typemap(gotype) (const char *data, int len) "[]byte"
%typemap(in) (const char *data, int len) {
    $1 = (char *)$input.array;
    $2 = $input.len;
}
```

## Exception Translation

```c
%exception {
    try { $action }
    catch (std::invalid_argument& e) { SWIG_exception(SWIG_ValueError, e.what()); }
    catch (std::exception& e) { SWIG_exception(SWIG_SystemError, e.what()); }
}
```

## Build (Go — simplest)

```
mypackage/
├── mylib.go          # Go code
├── mylib.swigcxx     # SWIG interface (auto-detected by go build)
├── mylib.h           # C++ header
└── mylib.cxx         # C++ implementation
```

Just run `go build`. No manual SWIG invocation needed.

## References

- [SWIG 4.4 Docs](https://www.swig.org/Doc4.4/SWIGDocumentation.html)
- [SWIG and Go](https://www.swig.org/Doc4.4/Go.html)
- [SWIG C++11-20](https://www.swig.org/Doc4.4/CPlusPlus11.html)
- [SWIG Examples](https://github.com/swig/swig/tree/master/Examples)
