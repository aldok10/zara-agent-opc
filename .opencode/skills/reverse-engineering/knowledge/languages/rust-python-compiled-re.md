# Reversing Rust & Python Compiled Binaries

TL;DR: Rust binaries use v0 name mangling (`_R` prefix), niche-optimized enums, and monomorphized generics. Python compiled binaries range from trivial .pyc unpacking (PyInstaller) to hard native-code RE (Nuitka BCC, Cython).

---

## RUST

### Identification Checklist

```bash
strings binary | grep -E '^_R[A-Z]|unwrap\(\)|core::panicking|rust_panic'
strings binary | grep 'rustc version'
strings binary | grep '^_R' | head -100 | rustfilt
readelf -S binary | grep rustc
```

| Signal | Reliability |
|--------|-------------|
| `_R` prefixed symbols (v0 mangling) | Very high |
| `.rustc` ELF section | High |
| Panic strings (`unwrap()`, `Option::unwrap()`) | High |
| `core::panicking` / `std::alloc::` paths | High |
| `rust_eh_personality` | Medium |

### Name Mangling

**v0 scheme** (since Rust 1.69): All symbols start with `_R`.

| Segment | Meaning |
|---------|---------|
| `_R` | v0 prefix |
| `N` | namespace root |
| `C` | crate tag |
| `s<hash>_` | crate disambiguator (base-62) |
| `<len><name>` | length-prefixed identifier |

**Demangling tools:**
- `rustfilt` (best): `rustfilt _RNvCs...`
- `llvm-cxxfilt` (partial v0 support)
- `c++filt -n` (binutils 2.39+)
- Bulk: `strings binary | grep '^_R' | rustfilt`

### Memory Layout (64-bit)

| Type | Size | Layout |
|------|------|--------|
| `Vec<T>` / `String` | 24B | `ptr(8) + len(8) + cap(8)` |
| `Box<T>` | 8B | thin pointer |
| `&[T]` / `&str` | 16B | `ptr(8) + len(8)` (fat) |
| `&dyn Trait` | 16B | `data_ptr(8) + vtable_ptr(8)` (fat) |
| `Option<&T>` | 8B | niche: None = null |
| `Option<NonZeroUsize>` | 8B | niche: None = 0 |
| `Rc<T>` / `Arc<T>` | 16B | `ptr + refcount` |

### Niche Optimization (Critical)

`Option<T>` uses invalid bit patterns of T as the None discriminant:
- `Option<&T>`: None = null pointer (8 bytes total)
- `Option<bool>`: None = 0x02 (bool only valid 0/1)
- `Option<NonZeroUsize>`: None = 0
- No niche available: adds discriminant byte + padding

### Vtable Layout (`dyn Trait`)

```
vtable[0]: drop_in_place destructor
vtable[1]: size_of::<T>
vtable[2]: align_of::<T>
vtable[3+]: trait methods in declaration order
```

### Async State Machines

Every `async fn` compiles to a tagged enum state machine. The `poll` method is a switch/loop over states. Each `.await` = one state variant.

```c
// Decompiled pattern:
switch (this->state) {
    case 0: ret = fut1.poll(cx); if (PENDING) return; this->state = 1;
    case 1: ret = fut2.poll(cx); ...
}
```

### Executor Detection

| Executor | Tell |
|----------|------|
| Tokio | `tokio::runtime::` symbols, `mio` dep, epoll/kqueue |
| async-std | `async_std::task::` symbols |
| smol | `smol::run()` |
| embassy | `embassy_executor::` (embedded, no-alloc) |

### Obfuscation Patterns

- **String encryption**: XOR loops on byte arrays in `.rodata`
- **Control-flow**: OLLVM bogus CF, flattening, instruction substitution
- **Static dispatch bloat**: many monomorphized copies = generic-heavy code
- **Dynamic dispatch**: `(vtable[N])(self, ...)` calls through function pointers

### RE Tools

| Tool | Purpose |
|------|---------|
| `rustfilt` | CLI demangling |
| `patina` | Rust binary analysis |
| IDARustler | IDA function naming via hashes |
| GhidraRust | v0 demangling + stdlib recognition |
| `rust-gdb` / `rust-lldb` | Rust-aware debugging |

---

## PYTHON

### Identification Decision Tree

```
strings binary | grep -i pyinstaller → PyInstaller
strings binary | grep -i nuitka → Nuitka
nm binary | grep PyInit_ → Cython
strings binary | grep python*.dll → Embedded CPython
```

### PyInstaller Extraction

```bash
# Step 1: Extract
python pyinstxtractor.py malware.exe

# Step 2: Fix .pyc header (if needed)
printf '\x61\x0d\x0d\x0a\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00' | \
    cat - main.pyc > main_fixed.pyc

# Step 3: Decompile
pycdc main_fixed.pyc > main.py
```

### .pyc Magic Numbers

| Magic (hex LE) | Python |
|----------------|--------|
| `550d0d0a` | 3.8 |
| `610d0d0a` | 3.9 |
| `6f0d0d0a` | 3.10 |
| `a70d0d0a` | 3.11 |
| `b30d0d0a` | 3.12 |
| `bf0d0d0a` | 3.13 |

### Decompiler Selection

| Input | Best Tool | Recovery |
|-------|-----------|----------|
| .pyc (2.7-3.8) | uncompyle6 | 90-100% |
| .pyc (3.7+) | decompyle3 | 85-95% |
| .pyc (any) | pycdc | 60-80% |
| PyInstaller EXE | pyinstxtractor + decompile | Full |
| Cython .so | IDA + Python.h types | Reconstruct |
| Nuitka | nuitka_dumper + reverse | Partial |
| PyArmor basic | Static-Unpack-1shot | Full |
| PyArmor BCC | Manual RE | Very hard |

### Nuitka Patterns

- Strings: `Nuitka`, `__nuitka_*` symbols
- Structure: C++ calling CPython API (`BINARY_OPERATION_ADD`, `CHECK_truth`)
- RCDATA resources (Windows) contain frozen modules

### Cython Patterns

- Export: `PyInit_<modulename>`
- Internal prefixes: `__Pyx_*`, `__pyx_*`
- Method tables: `__pyx_methods[]` with `PyMethodDef`
- API calls map directly to Python: `PyObject_GetAttr` = `obj.attr`

### Python Obfuscation

| Obfuscator | Technique | Reversibility |
|------------|-----------|---------------|
| PyArmor basic | AES + name mangling | Medium |
| PyArmor BCC | C compilation | Hard |
| pyobfuscate | Name mangling, XOR | Easy |
| Compression chains | `exec(zlib.decompress(b64decode(...)))` | Trivial |

**Deobfuscation order**: Decompress → Decode → De-marshal → Decompile → Rename

### CPython API as RE Markers

| API call | Python equivalent |
|----------|-------------------|
| `PyObject_GetAttr` | `obj.name` |
| `PyObject_Call` | `fn(*args)` |
| `PyList_Append` | `.append()` |
| `PyDict_SetItem` | `dict[key] = val` |
| `PyNumber_Add` | `x + y` |
| `PyErr_SetString` | `raise Exception(msg)` |
