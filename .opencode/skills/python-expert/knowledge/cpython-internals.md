---
type: fact
title: "CPython Internals - GIL, Bytecode, Memory, Free-Threading"
---

# CPython Internals

## Architecture Overview

CPython compiles Python source to bytecode, then executes it on a stack-based VM:

```
source.py → tokenizer → parser (PEG) → AST → compiler → bytecode (.pyc) → VM (ceval.c)
```

Key components:
- **Parser**: PEG parser (replaced LL(1) in 3.9), generates AST
- **Compiler**: AST → code objects containing bytecode + metadata
- **VM**: Stack-based interpreter loop in `Python/ceval.c`
- **Object system**: Everything is a `PyObject*` with refcount + type pointer

## GIL (Global Interpreter Lock)

The GIL is a mutex protecting CPython's reference counting from race conditions.

### What it protects

- `ob_refcnt` increments/decrements on every object
- Internal interpreter state (thread state, frame stack)
- C extension code that assumes single-threaded access

### Why it exists

Reference counting needs atomic operations per object access. Per-object locks would be slower than a single global lock for typical workloads.

### GIL release patterns

```python
# GIL released during I/O automatically
data = socket.recv(4096)  # GIL released while waiting

# Manual release in C extensions
Py_BEGIN_ALLOW_THREADS
// ... C code that doesn't touch Python objects ...
Py_END_ALLOW_THREADS

# numpy releases GIL during array operations
result = np.dot(large_matrix_a, large_matrix_b)  # GIL released
```

### PEP 703: Free-Threading (Python 3.13+)

```bash
# Build or install free-threaded CPython
python3.13t  # 't' suffix = free-threaded build
python3.13 --check-free-threading  # check if available

# PYTHON_GIL=0 disables GIL at runtime (if built with --disable-gil)
PYTHON_GIL=0 python3.13t my_script.py
```

Free-threading replaces GIL with:
- Biased reference counting (thread-local fast path, shared slow path)
- Per-object locks for mutable containers
- Deferred reference counting for immortal/interned objects
- Read-copy-update (RCU) for dict reads

```python
import sys
# Check if free-threaded at runtime
print(sys._is_gil_enabled())  # False if GIL disabled
```

**Status**: experimental in 3.13, stabilizing in 3.14+. Many C extensions not yet compatible.

## Bytecode & dis Module

```python
import dis

def example(x, y):
    return x + y * 2

dis.dis(example)
# LOAD_FAST    0 (x)
# LOAD_FAST    1 (y)
# LOAD_CONST   1 (2)
# BINARY_OP    5 (*)
# BINARY_OP    0 (+)
# RETURN_VALUE
```

### Inspecting code objects

```python
code = example.__code__
code.co_consts      # constant pool: (None, 2)
code.co_varnames    # local variable names: ('x', 'y')
code.co_stacksize   # max stack depth needed
code.co_code        # raw bytecode bytes

# Bytecode is versioned -- changes between Python versions
# 3.11+ uses adaptive/specializing interpreter (inline caches)
```

### Peephole optimizer

CPython optimizes bytecode at compile time:
- Constant folding: `1 + 2` → `3`
- Dead code elimination after unconditional returns
- Jump optimization (jump-to-jump elimination)
- 3.12+ uses a more aggressive optimizer pass

## Memory Management

### pymalloc (object allocator)

Three-tier system for objects ≤ 512 bytes:

```
Arena (256 KB, mmap'd) → Pool (4 KB, one size class) → Block (8-512 bytes)
```

- 64 size classes: 8, 16, 24, ..., 512 bytes
- Objects > 512 bytes go directly to system malloc
- Arenas freed back to OS when completely empty

### Reference counting

```python
import sys

x = [1, 2, 3]
sys.getrefcount(x)  # 2 (x + getrefcount arg)

y = x
sys.getrefcount(x)  # 3

del y
sys.getrefcount(x)  # 2
```

Deterministic destruction -- objects freed immediately when refcount hits zero. This is why context managers work predictably (file handles closed on `del`/scope exit).

### Generational garbage collector

Handles reference cycles that refcounting can't:

```python
import gc

# Three generations: 0 (young), 1 (middle), 2 (old)
gc.get_threshold()  # (700, 10, 10) -- allocation triggers

# Manual control
gc.collect()          # full collection
gc.collect(0)         # collect generation 0 only

# Disable for latency-sensitive code (if no cycles created)
gc.disable()

# Debug cycle detection
gc.set_debug(gc.DEBUG_SAVEALL)
gc.collect()
print(gc.garbage)  # uncollectable objects
```

Objects with `__del__` methods that form cycles are problematic -- collected in 3.4+ but with undefined finalization order.

## Object Model

### PyObject structure

```c
// Every Python object starts with:
typedef struct {
    Py_ssize_t ob_refcnt;    // reference count
    PyTypeObject *ob_type;    // pointer to type object
} PyObject;

// Variable-size objects (list, tuple, str):
typedef struct {
    PyObject ob_base;
    Py_ssize_t ob_size;      // number of items
} PyVarObject;
```

### Type slots and descriptors

```python
# Type slots define behavior (C level)
# Python equivalent: dunder methods map to slots
# __add__  → tp_as_number->nb_add
# __len__  → tp_as_sequence->sq_length
# __getattr__ → tp_getattro

# Descriptors implement attribute access
class PropExample:
    @property
    def x(self):  # data descriptor (has __get__ + __set__)
        return self._x

# MRO (Method Resolution Order) -- C3 linearization
class D(B, C): ...
D.__mro__  # (D, B, C, A, object)
```

## Frame Objects

```python
import sys

def get_frame_info():
    frame = sys._getframe(0)
    print(frame.f_code.co_filename)  # source file
    print(frame.f_lineno)            # current line
    print(frame.f_locals)            # local variables
    print(frame.f_back)              # caller's frame

# 3.11+ uses internal frames (faster), sys._getframe() materializes on demand
# 3.12+ frame.f_locals returns a snapshot (PEP 667)
```

## Import System

```python
import importlib
import sys

# Import machinery chain:
# 1. sys.modules cache check
# 2. sys.meta_path finders (in order)
# 3. sys.path_hooks + sys.path for path-based finding
# 4. Loader executes module code

# Default finders:
# BuiltinImporter -- built-in C modules
# FrozenImporter -- frozen modules (stdlib in 3.11+)
# PathFinder -- filesystem .py/.pyc files

# __pycache__/module.cpython-313.pyc -- bytecode cache
# Invalidation: source mtime (default) or hash-based (PEP 552)
importlib.invalidate_caches()

# Reload (re-executes module code, same module object)
importlib.reload(some_module)
```

## PEP 744: JIT Compiler (Python 3.13+)

Copy-and-patch JIT -- generates machine code from bytecode templates:

```bash
# Enable JIT (if built with --enable-experimental-jit)
PYTHON_JIT=1 python3.13 script.py

# Check JIT status
python -c "import sys; print(sys._jit)"
```

- Tier 1: Interpreter (always)
- Tier 2: JIT compiles hot code paths
- Templates pre-compiled at CPython build time
- Modest speedups (5-15%) in initial release, improving

## Subinterpreters (PEP 554)

```python
# 3.12+ -- interpreters module
import interpreters

interp = interpreters.create()
interp.run("print('hello from subinterpreter')")

# Each interpreter has its own GIL (3.12+)
# True parallelism without free-threading
# Limitations: can't share arbitrary objects, use channels

# Channel-based communication
from interpreters import channels
send, recv = channels.create()
```

## Performance Profiling

### cProfile (built-in)

```python
import cProfile
import pstats

# Profile a function
cProfile.run('my_function()', 'output.prof')

# Analyze
stats = pstats.Stats('output.prof')
stats.sort_stats('cumulative')
stats.print_stats(20)

# Command line
# python -m cProfile -o output.prof script.py
```

### py-spy (sampling profiler, no overhead)

```bash
# Attach to running process
py-spy top --pid 12345

# Generate flame graph
py-spy record -o flame.svg -- python script.py

# Works on production -- no code changes needed
```

### Scalene (CPU + memory + GPU profiler)

```bash
scalene script.py
# Shows: CPU time (Python vs C), memory allocation/deallocation, GPU usage
# Line-level granularity, distinguishes Python overhead from native code
```

### timeit for microbenchmarks

```python
import timeit

# Compare approaches
timeit.timeit('"-".join(map(str, range(100)))', number=10000)
timeit.timeit('"-".join(str(i) for i in range(100))', number=10000)
```

## Key Internals for Performance

- **String interning**: small strings auto-interned, `sys.intern()` for manual
- **Small int cache**: integers -5 to 256 are pre-allocated singletons
- **Free lists**: recently freed objects of common types reused without malloc
- **Specializing interpreter (3.11+)**: bytecode adapts to runtime types
- **Immortal objects (3.12+)**: `None`, `True`, `False` never refcounted
