# Subskill: CGO (C Interoperability)

> Activate when: cgo, C library, FFI, CGO_ENABLED, cross-compile, static link, C binding, shared library, unsafe.Pointer boundary
>
> Prevents mistakes: Go Proverb "Cgo is not Go", memory safety boundary issues

**Senior DNA**: Stdlib first — **always** check if a pure Go library exists before reaching for CGO. "It depends" — if the C library is battle-tested (SQLite, OpenSSL FIPS) and no pure Go equivalent exists, CGO is justified. But if it's a small utility, rewrite in Go. The build/deploy complexity cost of CGO is real. Cross-compilation, static linking, debugging — all get harder.

## Philosophy

**Cgo is not Go.** It breaks Go's promise of lightweight concurrency, simple builds, easy cross-compilation, and fast iteration. Use it ONLY when no pure Go alternative exists.

> "A little copying is better than a little dependency." — Go Proverb
> This applies doubly to C dependencies.

## Decision: Should You Use CGO?

```
1. Does a pure Go library exist?           → Yes → Use it. Stop here.
2. Can you rewrite the C code in Go?       → Yes → Do it. Stop here.
3. Can you use os/exec to call a C binary? → Yes → Probably simpler.
4. Can you use a socket/IPC interface?     → Yes → Isolates crash domains.
5. Is this a MUST (crypto hw, GPU, OS)?    → Yes → Use CGO with the rules below.
```

## Cost of CGO

| Metric | Pure Go call | CGO call | Factor |
|--------|-------------|----------|--------|
| Function call overhead | ~2ns | ~170ns | 85x |
| Stack per goroutine | ~2-8KB (grows) | ~1MB (real OS thread) | 125-500x |
| Cross-compilation | `GOOS=linux go build` | Needs C cross-compiler toolchain | Complex |
| Static binary | Default | Needs `-extldflags "-static"` + musl | Manual |
| Debugging | pprof, delve, trace | Partial — C portion invisible to Go tools | Degraded |
| GC interaction | Seamless | Can't scan C heap, manual free required | Manual |

## Rules When Using CGO

### 1. Minimize boundary crossings

Batch work on the C side. One call doing 1000 operations beats 1000 calls doing one operation.

```go
// BAD — 1000 cgo crossings
for _, item := range items {
    C.process_item(toCItem(item)) // 170ns overhead × 1000
}

// GOOD — one crossing, C iterates internally
buf := marshalItems(items)
C.process_batch((*C.char)(unsafe.Pointer(&buf[0])), C.int(len(buf)))
```

### 2. Never store Go pointers in C memory

The GC can move Go objects. If C holds a pointer to Go memory, it becomes a dangling pointer after GC moves the object. Pass data by copying into C-allocated memory.

```go
// BAD — Go pointer stored in C struct (GC can move it!)
cs := C.CString(goString) // This is FINE — C.CString copies to C heap
// But: C.some_struct.data = (*C.char)(unsafe.Pointer(&goSlice[0])) // DANGEROUS

// GOOD — copy data to C-owned memory
cs := C.CString(goString) // copies to C heap
defer C.free(unsafe.Pointer(cs))
C.use_string(cs)
```

### 3. Always free C-allocated memory

Go's GC does NOT free memory allocated by C (`C.malloc`, `C.CString`). You MUST free it manually or you leak.

```go
cs := C.CString("hello")
defer C.free(unsafe.Pointer(cs)) // MANDATORY

result := C.some_function()
defer C.free(unsafe.Pointer(result)) // MANDATORY if C allocated it
```

### 4. Bound CGO concurrency

A blocking cgo call consumes a real OS thread. 1000 concurrent cgo calls = 1000 threads = potential `ulimit` crash.

```go
// GOOD — semaphore limits concurrent cgo calls
var cgoSem = make(chan struct{}, runtime.NumCPU())

func callC(data []byte) {
    cgoSem <- struct{}{} // acquire
    defer func() { <-cgoSem }() // release
    C.expensive_function(...)
}
```

### 5. Use build tags to isolate CGO code

Keep cgo-dependent code in separate files with build constraints so the rest of the project builds without cgo.

```go
//go:build cgo

package mylib

// #include <mylib.h>
import "C"

func doWithC() { ... }
```

```go
//go:build !cgo

package mylib

func doWithC() {
    panic("built without cgo support")
}
```

### 6. Set CGO_ENABLED explicitly in CI

Never rely on the default. Make it explicit.

```bash
# Pure Go build (default for cross-compile)
CGO_ENABLED=0 go build ./...

# With C dependencies
CGO_ENABLED=1 go build ./...
```

### 7. Zero-copy patterns at boundary (advanced)

When performance matters, avoid `C.GoBytes`/`C.CString` copies:

```go
// Zero-copy read from C memory (UNSAFE — must ensure C memory outlives slice)
func unsafeGoBytes(ptr *C.char, length C.int) []byte {
    if length == 0 {
        return nil
    }
    return unsafe.Slice((*byte)(unsafe.Pointer(ptr)), int(length))
}
```

**Only use this internally.** Never expose unsafe slices in public APIs.

### 8. Static linking for containers

```bash
# Static build with musl (for Alpine/scratch containers)
CGO_ENABLED=1 CC=musl-gcc go build -ldflags '-linkmode external -extldflags "-static"' ./cmd/app
```

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---------|-------------|-----------|
| Forgetting `C.free()` | Memory leak in long-running process | Always defer free after C allocation |
| Go pointer passed to C that's stored | Dangling pointer after GC | Copy to C heap, never store Go ptrs in C |
| Blocking cgo call without bound | Thread explosion (`ulimit -r` exceeded) | Semaphore limiting concurrent cgo calls |
| Assuming cgo goroutine is cheap | 1MB stack per OS thread, not 2KB | Limit concurrency, batch operations |
| No build tag isolation | Breaks `CGO_ENABLED=0` builds | Separate files with `//go:build cgo` |
| Missing `-race` testing | Data races at boundary invisible | Always `-race` in CI with cgo code |
| Using `#cgo LDFLAGS: -L/usr/local/lib` | Non-portable absolute paths | Use pkg-config or relative paths |

## Alternatives to CGO

| Alternative | When to Use | Example |
|-------------|-------------|---------|
| Pure Go reimplementation | Small/medium C libraries | `github.com/glebarez/go-sqlite` instead of `mattn/go-sqlite3` |
| `os/exec` | Command-line tools, infrequent calls | Call `ffmpeg` binary |
| Socket/IPC | Large C services, crash isolation | gRPC to a C++ sidecar |
| `purego` | macOS/Linux syscall-based FFI, no C compiler needed | `github.com/ebitengine/purego` |
| WASM | Sandboxed C/Rust, portable | `wazero` runtime |
| Plugin (`plugin` package) | Rare, Linux-only shared libraries | Dynamic loading |

## When CGO Is Justified

- Hardware access requiring C drivers (GPU, HSM, USB)
- Cryptographic libraries with FIPS certification (BoringCrypto)
- Database engines (RocksDB, SQLite with full features)
- Media processing (FFmpeg bindings)
- OS-specific APIs with no Go equivalent
- Performance-critical algorithms already optimized in C/SIMD

## Delegates To

- **performance** — when cgo call overhead needs optimization
- **security** — when C memory safety is a concern
- **architecture** — when deciding cgo vs pure Go vs IPC
- **swig** — when the C++ library uses classes/templates/inheritance (see `subskills/swig.md` or load standalone `swig-expert` skill for full multi-language reference)

## References

- [CockroachDB: The cost and complexity of Cgo](https://www.cockroachlabs.com/blog/the-cost-and-complexity-of-cgo/)
- [Dave Cheney: cgo is not Go](https://dave.cheney.net/2016/01/18/cgo-is-not-go)
- [Go Blog: C? Go? Cgo!](https://go.dev/blog/cgo)
- [Go Wiki: cgo](https://go.dev/wiki/cgo)
- [purego](https://github.com/ebitengine/purego) — call C without cgo
- [SWIG and Go](https://www.swig.org/Doc4.0/Go.html) — C++ wrapping for Go

---

## SWIG: Wrapping C++ for Go

SWIG (Simplified Wrapper and Interface Generator) solves a problem CGO alone cannot: **calling C++ from Go**. CGO only supports C. SWIG generates type-safe Go wrapper code for C++ classes, templates, inheritance, and virtual methods.

### When to Use SWIG

| Scenario | Use CGO | Use SWIG |
|----------|---------|----------|
| Plain C library | Yes | Overkill |
| C++ library with classes | No (C only) | Yes |
| C++ templates | No | Yes |
| C++ class inheritance from Go | No | Yes (directors) |
| Simple C function | Yes | No |

### How SWIG Works with Go

```
your.swigcxx (interface file)
       ↓ swig -go
MODULE.go           — Go package (interfaces, types)
MODULE_wrap.cxx     — C++ bridge code
       ↓ go build (auto-detects .swigcxx)
Final binary
```

**Since Go 1.12+**: `go build` auto-detects `.swig` (C) and `.swigcxx` (C++) files and runs SWIG automatically. No manual steps needed.

### SWIG Interface File (.swigcxx)

```c
// example.swigcxx
%module example

%{
#include "mylib.h"
%}

// Tell SWIG what to wrap
%include "mylib.h"
```

Place `example.swigcxx` + `mylib.h` + `mylib.cxx` in your Go package directory. Run `go build` — it handles everything.

### C++ Classes in Go (SWIG auto-generates)

Given C++:
```cpp
class Vector {
public:
    Vector(double x, double y);
    double Length();
    double x, y;
};
```

SWIG generates Go interface:
```go
type Vector interface {
    Swigcptr() uintptr
    SwigIsVector()
    Length() float64
    GetX() float64
    SetX(float64)
    GetY() float64
    SetY(float64)
}

func NewVector(x, y float64) Vector { ... }
func DeleteVector(v Vector) { ... }
```

### Memory Management with SWIG

**C++ objects are NOT garbage collected.** You MUST free them manually.

```go
// CORRECT — always free C++ objects
func useVector() {
    v := example.NewVector(3.0, 4.0)
    defer example.DeleteVector(v)  // MANDATORY

    length := v.Length()
    fmt.Println(length) // 5.0
}
```

For long-lived objects, use `runtime.SetFinalizer`:
```go
type GoVector struct {
    v example.Vector
}

func NewGoVector(x, y float64) *GoVector {
    gv := &GoVector{v: example.NewVector(x, y)}
    runtime.SetFinalizer(gv, func(gv *GoVector) {
        example.DeleteVector(gv.v)
    })
    return gv
}
```

**Caveat**: Finalizers don't run on cycles. Director patterns create cycles. Use explicit `Close()`/`Delete()` methods for director objects.

### Directors: Go Subclassing C++ Classes

Directors let Go types implement C++ virtual methods — Go "inherits" from C++.

```c
// Enable in .swigcxx
%module(directors="1") example
%feature("director") Animal;

class Animal {
public:
    virtual ~Animal() {}
    virtual std::string Speak() = 0;
    std::string Describe() { return "I say: " + Speak(); }
};
```

Go implementation:
```go
// Go struct that overrides virtual methods
type goAnimalMethods struct {
    a example.Animal
}

func (m *goAnimalMethods) Speak() string {
    return "Woof!"
}

// Constructor
func NewDog() example.Animal {
    om := &goAnimalMethods{}
    a := example.NewDirectorAnimal(om) // Creates director
    om.a = a
    return a
}

// Usage
dog := NewDog()
defer example.DeleteDirectorAnimal(dog)
fmt.Println(dog.Describe()) // "I say: Woof!"
```

### SWIG Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Forgetting DeleteX | C++ memory leak | Always `defer Delete...()` |
| Director cycles | `runtime.SetFinalizer` won't fire | Use explicit `Close()`/`Delete()` |
| SWIG name mangling | Go names start uppercase | Check generated `.go` file |
| Template instantiation | SWIG doesn't auto-expand templates | Use `%template(IntVector) vector<int>;` |
| Build complexity | Needs C++ compiler + SWIG installed | Document build deps in README |
| Version mismatch | SWIG 4.0+ required for modern Go | Pin SWIG version in CI |

### SWIG vs Manual CGO for C++

| Aspect | Manual CGO + C wrappers | SWIG |
|--------|------------------------|------|
| C library | Simple, direct | Overkill |
| C++ classes | Must write C wrapper functions manually | Auto-generated |
| C++ templates | Must manually instantiate in C wrapper | `%template` directive |
| Inheritance | Not possible (C only) | Directors feature |
| Maintenance | Manual sync when C++ API changes | Re-run `swig`, auto-synced |
| Build deps | Just C compiler | C++ compiler + SWIG binary |
| Go tool integration | Manual `// #cgo` directives | `go build` auto-detects `.swigcxx` |

### Decision: CGO vs SWIG vs Alternatives

```
Is it C (not C++)?
  → Yes → Use plain CGO
  → No (it's C++) →
    Is it a small C++ API (<10 functions)?
      → Yes → Write thin C wrapper, use CGO
      → No →
        Does it use classes/templates/inheritance?
          → Yes → Use SWIG
          → No → Write thin C wrapper, use CGO

Can you avoid C/C++ entirely?
  → Pure Go library exists → Use it (always prefer)
  → purego works (syscall-based) → Use it (no compiler needed)
  → WASM sandbox → Use wazero (crash isolation)
```
