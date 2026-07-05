---
type: fact
title: "CPython Internals - GIL, Bytecode, Memory, Free-Threading"
---

# CPython Internals

## Architecture

```
source.py → tokenizer → parser (PEG) → AST → compiler → bytecode (.pyc) → VM (ceval.c)
```

- **Parser**: PEG (replaced LL(1) in 3.9), generates AST
- **Compiler**: AST → code objects (bytecode + metadata)
- **VM**: Stack-based interpreter loop in `Python/ceval.c`
- **Object system**: Everything is `PyObject*` with refcount + type pointer

## GIL (Global Interpreter Lock)

Mutex protecting reference counting from race conditions.

**Protects**: `ob_refcnt` operations, interpreter state, C extensions assuming single-thread.
**Why**: Per-object locks slower than one global lock for typical workloads.

```python
# GIL released during I/O automatically
data = socket.recv(4096)  # GIL released while waiting

# C extensions release manually:
# Py_BEGIN_ALLOW_THREADS / Py_END_ALLOW_THREADS

# numpy releases GIL during array ops
result = np.dot(large_a, large_b)  # parallel C code runs
```

### PEP 703: Free-Threading (Python 3.13+)

```bash
python3.13t my_script.py           # 't' suffix = free-threaded build
PYTHON_GIL=0 python3.13t script.py # explicitly disable GIL
```

Replaces GIL with:
- Biased reference counting (thread-local fast path, shared slow path)
- Per-object locks for mutable containers
- Deferred refcounting for immortal/interned objects
- RCU for dict reads

```python
import sys
sys._is_gil_enabled()  # False if GIL disabled
```

**Status**: experimental 3.13, stabilizing 3.14+. Many C extensions not yet compatible.

## Bytecode & dis Module

```python
import dis

def example(x, y):
    return x + y * 2

dis.dis(example)
# LOAD_FAST 0 (x) / LOAD_FAST 1 (y) / LOAD_CONST 1 (2)
# BINARY_OP 5 (*) / BINARY_OP 0 (+) / RETURN_VALUE

code = example.__code__
code.co_consts      # (None, 2)
code.co_varnames    # ('x', 'y')
code.co_stacksize   # max stack depth
# 3.11+ uses adaptive/specializing interpreter (inline caches)
```

**Peephole optimizer**: constant folding (`1+2`→`3`), dead code elimination, jump-to-jump removal. 3.12+ more aggressive.

## Memory Management

### pymalloc

```
Arena (256KB, mmap) → Pool (4KB, one size class) → Block (8-512 bytes)
```

- 64 size classes: 8, 16, 24, ..., 512 bytes
- Objects > 512 bytes → system malloc
- Arenas freed to OS when completely empty

### Reference counting

```python
import sys
x = [1, 2, 3]
sys.getrefcount(x)  # 2 (x + getrefcount arg)
y = x               # refcount → 3
del y               # refcount → 2, freed at 0
```

Deterministic destruction -- file handles closed on scope exit.

### Generational GC (cycle collector)

```python
import gc
gc.get_threshold()    # (700, 10, 10) -- allocation triggers
gc.collect()          # full collection
gc.disable()          # safe if no reference cycles created
gc.set_debug(gc.DEBUG_SAVEALL)  # debug uncollectable
```

Three generations: young→middle→old. Objects with `__del__` in cycles: collected (3.4+) but undefined finalization order.

## Object Model

```c
typedef struct {
    Py_ssize_t ob_refcnt;     // reference count
    PyTypeObject *ob_type;     // type pointer
} PyObject;

typedef struct {
    PyObject ob_base;
    Py_ssize_t ob_size;        // variable-size objects
} PyVarObject;
```

**Type slots**: dunder methods map to C slots (`__add__`→`nb_add`, `__len__`→`sq_length`).
**Descriptors**: data descriptors (`__get__`+`__set__`) vs non-data (`__get__` only).
**MRO**: C3 linearization. `D.__mro__` gives resolution order.

## Frame Objects

```python
import sys
frame = sys._getframe(0)
frame.f_code.co_filename  # source file
frame.f_lineno            # current line
frame.f_locals            # local variables (snapshot in 3.12+, PEP 667)
frame.f_back              # caller's frame
# 3.11+ internal frames (faster), materialized on demand
```

## Import System

```python
# Chain: sys.modules cache → sys.meta_path finders → sys.path_hooks + sys.path → loader
# Default finders: BuiltinImporter, FrozenImporter, PathFinder
# Cache: __pycache__/module.cpython-313.pyc
# Invalidation: mtime (default) or hash-based (PEP 552)
import importlib
importlib.invalidate_caches()
importlib.reload(some_module)  # re-executes, same module object
```

## PEP 744: JIT Compiler (Python 3.13+)

Copy-and-patch JIT -- machine code from pre-compiled bytecode templates:

```bash
PYTHON_JIT=1 python3.13 script.py
```

- Tier 1: interpreter (always), Tier 2: JIT for hot paths
- Templates compiled at CPython build time
- 5-15% speedup in initial release, improving

## Subinterpreters (PEP 554)

```python
import interpreters
interp = interpreters.create()
interp.run("print('hello from subinterpreter')")
# Each interpreter has its own GIL (3.12+) -- true parallelism
# Can't share arbitrary objects -- use channels
from interpreters import channels
send, recv = channels.create()
```

## Performance Profiling

```python
# cProfile (built-in, deterministic)
import cProfile, pstats
cProfile.run('my_function()', 'output.prof')
pstats.Stats('output.prof').sort_stats('cumulative').print_stats(20)
```

```bash
# py-spy (sampling, zero overhead, attach to production)
py-spy record -o flame.svg -- python script.py
py-spy top --pid 12345

# Scalene (CPU + memory + GPU, line-level)
scalene script.py
```

```python
# timeit for microbenchmarks
import timeit
timeit.timeit('"-".join(map(str, range(100)))', number=10000)
```

## Key Performance Internals

- **String interning**: small strings auto-interned, `sys.intern()` for manual
- **Small int cache**: -5 to 256 are pre-allocated singletons
- **Free lists**: recently freed common types reused without malloc
- **Specializing interpreter (3.11+)**: bytecode adapts to observed types
- **Immortal objects (3.12+)**: `None`, `True`, `False` skip refcounting
