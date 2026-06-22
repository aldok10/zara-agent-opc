# Subskill: SWIG (C++ to Go Interface Generator)

> Activate when: swig, swigcxx, C++ binding, C++ class from Go, director, virtual method override, template instantiation, C++ inheritance Go
>
> Connected to: `subskills/cgo.md` (SWIG builds on top of CGO)

**Senior DNA**: "It depends" - SWIG is powerful but adds build complexity. Use it ONLY for C++ libraries with classes/templates/inheritance. For plain C, use CGO directly. For small C++ APIs (<10 funcs), write a thin C wrapper manually. Always prefer pure Go libraries when they exist.

---

## What SWIG Does

SWIG auto-generates Go wrapper code for C++ libraries. CGO only supports C. SWIG bridges the gap.

```
C++ library (.h/.cxx)  +  interface file (.swigcxx)
                ↓ swig -go -cgo -intgosize 64
    module.go (Go interfaces)  +  module_wrap.cxx (C++ bridge)
                ↓ go build (auto-detects .swigcxx)
    Final binary
```

**Since Go 1.12+**: `go build` auto-detects `.swig` (C) and `.swigcxx` (C++) files. No manual build steps.

---

## When to Use SWIG (Decision Tree)

```
Is it C (not C++)?
  → Use plain CGO. SWIG is overkill.

Is it C++ with <10 functions, no classes?
  → Write thin C wrapper (extern "C"), use CGO.

Does it use C++ classes, templates, or inheritance?
  → Use SWIG.

Do you need Go to subclass a C++ class (virtual methods)?
  → Use SWIG with directors.

Can you avoid C/C++ entirely?
  → Always preferred. Check for pure Go alternatives first.
```

---

## Interface File (.swigcxx)

```c
// mylib.swigcxx - placed in your Go package directory
%module mylib

%{
// This code goes into the generated C++ wrapper verbatim
#include "mylib.h"
%}

// Tell SWIG what to wrap (can %include the header directly)
%include "mylib.h"
```

**Naming**: Use `.swigcxx` for C++, `.swig` for C. `go build` picks these up automatically.

---

## C++ Classes → Go Interfaces

C++:
```cpp
class Vector {
public:
    Vector(double x, double y);
    ~Vector();
    double Length() const;
    double x, y;
};
```

SWIG generates Go:
```go
type Vector interface {
    Swigcptr() uintptr
    Length() float64
    GetX() float64
    SetX(float64)
    GetY() float64
    SetY(float64)
}

func NewVector(x, y float64) Vector { ... }
func DeleteVector(v Vector) { ... }  // YOU must call this
```

---

## Memory Management (Critical)

C++ objects are NOT garbage collected. **You MUST free them manually.**

```go
func useVector() {
    v := mylib.NewVector(3.0, 4.0)
    defer mylib.DeleteVector(v)  // MANDATORY - like C free()

    fmt.Println(v.Length()) // 5.0
}
```

### Long-lived objects - use runtime.SetFinalizer

```go
type GoVector struct{ v mylib.Vector }

func NewGoVector(x, y float64) *GoVector {
    gv := &GoVector{v: mylib.NewVector(x, y)}
    runtime.SetFinalizer(gv, func(g *GoVector) {
        mylib.DeleteVector(g.v)
    })
    return gv
}
```

**Caveat**: Finalizers don't fire on cycles. Director patterns create cycles. Use explicit `Close()` for directors.

---

## Templates

C++ templates must be explicitly instantiated:

```c
// interface.swigcxx
%module containers

%{
#include <vector>
#include <string>
%}

%include "std_vector.i"
%include "std_string.i"

// Instantiate specific types - SWIG can't auto-expand templates
%template(IntVector) std::vector<int>;
%template(StringVector) std::vector<std::string>;
```

Go usage:
```go
v := containers.NewIntVector()
defer containers.DeleteIntVector(v)
v.Add(42)
v.Add(99)
fmt.Println(v.Size()) // 2
```

---

## Directors: Go Implements C++ Virtual Methods

Directors let Go types override C++ virtual methods - effectively "inheriting" from C++.

### Enable directors

```c
// interface.swigcxx
%module(directors="1") animals
%feature("director") Animal;

%inline %{
class Animal {
public:
    virtual ~Animal() {}
    virtual std::string Speak() = 0;
    std::string Describe() { return "I say: " + Speak(); }
};
%}
```

### Go implementation

```go
type dogMethods struct {
    a animals.Animal // backlink to C++ object
}

func (d *dogMethods) Speak() string {
    return "Woof!"
}

func NewDog() animals.Animal {
    om := &dogMethods{}
    a := animals.NewDirectorAnimal(om)
    om.a = a  // backlink (creates cycle - finalizer won't work!)
    return a
}

func DeleteDog(a animals.Animal) {
    animals.DeleteDirectorAnimal(a)  // explicit delete required
}

// Usage
dog := NewDog()
defer DeleteDog(dog)
fmt.Println(dog.Describe()) // "I say: Woof!"
```

### Call base method from Go

```go
func (d *dogMethods) Speak() string {
    base := animals.DirectorAnimalSpeak(d.a) // calls C++ base
    return "Go " + base
}
```

---

## C++ Exception Handling

SWIG can convert C++ exceptions to Go panics or errors:

```c
%module mylib

%exception {
    try {
        $action
    } catch (std::exception& e) {
        _swig_gopanic(e.what());
    }
}
```

Or per-function:
```c
%catches(std::runtime_error, std::invalid_argument) MyFunc;
```

---

## C++ Threads and Go Goroutines

**Critical**: C++ threads and Go goroutines are different runtimes.

- C++ code called from Go runs on the calling goroutine's OS thread
- Long-running C++ code blocks the goroutine's OS thread
- Bound concurrency with semaphore (same as CGO)

```go
var cSem = make(chan struct{}, runtime.NumCPU())

func CallCpp() {
    cSem <- struct{}{}
    defer func() { <-cSem }()
    mylib.ExpensiveFunction()
}
```

---

## STL Support

SWIG includes typemaps for common STL types:

```c
%include "std_string.i"     // std::string ↔ Go string
%include "std_vector.i"     // std::vector<T> ↔ Go slice-like interface
%include "std_map.i"        // std::map<K,V>
%include "std_pair.i"       // std::pair<A,B>
%include "std_shared_ptr.i" // std::shared_ptr<T>
%include "std_unique_ptr.i" // std::unique_ptr<T> (pass by value)
```

---

## Type Mappings (C++ → Go)

| C++ | Go |
|-----|-----|
| bool | bool |
| char | byte |
| int | int |
| unsigned int | uint |
| long, long long | int64 |
| float | float32 |
| double | float64 |
| char*, std::string | string |
| T* (class pointer) | Interface (with Swigcptr) |

---

## Build & CI Considerations

```yaml
# CI requirements
- SWIG 4.2+ installed (4.4 recommended for C++20 support)
- C++ compiler matching target (g++, clang++)
- CGO_ENABLED=1
- For cross-compile: matching cross-compiler + SWIG

# Dockerfile example
FROM golang:1.26 AS builder
RUN apt-get update && apt-get install -y swig g++
COPY . /app
WORKDIR /app
RUN go build ./...
```

```bash
# Local development
brew install swig  # macOS
sudo apt install swig  # Ubuntu/Debian

# Verify
swig -version  # 4.2+ required for modern Go
```

---

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Forgetting `Delete*` | C++ memory leak | Always `defer Delete...()` |
| Director cycle | `SetFinalizer` won't fire | Explicit `Delete`/`Close` method |
| Template not instantiated | Compile error "undefined" | Add `%template(Name) Type<Params>` |
| SWIG version mismatch | Broken codegen | Pin version in CI, test with same |
| `go build` not finding .swigcxx | File in wrong directory | Must be in Go package dir |
| C++ exception uncaught | Go panic or crash | Add `%exception` handler |
| Name collision | Go reserved words | Use `%rename` directive |
| Large C++ API | Generated Go code huge | Use `%ignore` to exclude what you don't need |

---

## Advanced: Customizing Generated Go Code

### Rename symbols
```c
%rename(MyGoName) CppName;
%rename(Create) MyClass::MyClass;  // rename constructor
```

### Ignore unwanted declarations
```c
%ignore InternalFunction;
%ignore MyClass::privateHelper;
```

### Add extra Go code
```c
%insert(go_wrapper) %{
func (v SwigcptrVector) String() string {
    return fmt.Sprintf("Vector(%f, %f)", v.GetX(), v.GetY())
}
%}
```

### Import Go packages in generated code
```c
%go_import("fmt", "math")
```

---

## SWIG vs Alternatives Summary

| Need | Solution | Complexity |
|------|----------|-----------|
| Call C function | CGO directly | Low |
| Call C++ class methods | SWIG | Medium |
| Inherit C++ class in Go | SWIG directors | High |
| Call C without compiler | purego | Low |
| Sandbox C/Rust code | WASM (wazero) | Medium |
| Avoid C entirely | Pure Go library | Zero |

---

## References

- [SWIG 4.4 Documentation](https://www.swig.org/Doc4.4/SWIGDocumentation.html) - complete reference
- [SWIG and Go (Ch. 25)](https://www.swig.org/Doc4.4/Go.html) - Go-specific chapter
- [SWIG Examples](https://github.com/swig/swig/tree/master/Examples/go) - working Go examples
- [SWIG and C++11/14/17/20](https://www.swig.org/Doc4.4/CPlusPlus11.html) - modern C++ support
