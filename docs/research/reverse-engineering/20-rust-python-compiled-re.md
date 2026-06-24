# Reversing Rust & Python Compiled Binaries

A reference for reverse engineering Rust-compiled and Python-compiled binaries:
Rust name mangling, ABI quirks, memory layouts, async internals, vtable recovery;
PyInstaller/Nuitka/Cython extraction, `.pyc` bytecode, and deobfuscation.

Rust binaries look like C++ but behave differently — no stable ABI, v0 name mangling,
niche-optimized enums, monomorphized generics, and a runtime that panics instead of
throwing. Python compiled binaries range from trivial `.pyc` unpacking to
Cython-generated C that resembles obfuscated CPython internals.

---

## PART I: RUST

---

## 1. Rust ABI & Calling Convention

Rust does **not** have a stable ABI. The compiler reserves the right to change
layout, calling convention, and name mangling between versions. This matters for
RE because you cannot assume struct layouts or call sequences are fixed.

### 1.1 `extern "Rust"` (default)

The default ABI (`extern "Rust"`) is **undefined** from a stability standpoint.
The compiler passes arguments in registers per the platform C ABI (SysV x64 or
Windows x64), but the exact mapping is not guaranteed. In practice for x86-64:

| Platform | Arg1 | Arg2 | Arg3 | Arg4 | Arg5+ |
|----------|------|------|------|------|-------|
| Linux/macOS (SysV) | RDI | RSI | RDX | RCX | stack |
| Windows | RCX | RDX | R8 | R9 | stack |

Rust also passes `self` as the first argument — same register as Arg1.

What distinguishes Rust calls from C calls at the binary level:

- **No callee cleanup.** The caller always balances the stack (same as `cdecl`).
- **Return via RAX** for small types. For types larger than 2 registers, the
  caller passes a hidden `retptr` as the first argument (before `self`).
- **ABI can change per compilation** — do not hardcode offsets across versions.

[1](https://doc.rust-lang.org/reference/type-layout.html) [2](https://doc.rust-lang.org/nomicon/unwinding.html)

### 1.2 `extern "C"` for FFI

When you write `extern "C" fn()`, Rust matches the platform's C ABI exactly.
This is the only ABI with a stable guarantee. In RE, look for `extern "C"`
functions by their unmangled export names — they are the entry points.

### 1.3 Return value handling

Rust returns simple types (integers, pointers) in RAX. For compound returns:

```rust
struct Large { a: [u64; 8]; }
fn make_large() -> Large { ... }
```

compiles to roughly:

```
// Hidden first argument: pointer to return slot (in RDI on SysV)
make_large(rdi: &mut Large)
```

The caller allocates space and passes a pointer. This matches the C++ ABI for
trivially-copyable types but differs from C, where small structs may be returned
in registers.

[3](https://doc.rust-lang.org/reference/abi.html)

### 1.4 Panic/unwind ABI

Rust panics use the **same platform unwind mechanism as C++ exceptions**:
- On Linux/BSD: Itanium C++ ABI (`.eh_frame`, `_Unwind_*`)
- On Windows: SEH (Structured Exception Handling)

The key difference: Rust does **not** have a `catch` equivalent at the ABI level.
`std::panic::catch_unwind` installs a landing pad using `setjmp`/`longjmp`-style
mechanisms internally.

Signatures in the binary:
- **`rust_panic`** / **`rust_begin_unwind`** — entry point when a panic is triggered
- **Personality function**: `rust_eh_personality` (Itanium) or `rust_msvc_eh_personality` (MSVC)
- **`.eh_frame`** entries for Rust functions include LSDA (Language-Specific Data Area)

When `panic = abort` is set (via `Cargo.toml` profile), landing pads and the
personality function are omitted — panics become immediate `abort()` calls.

[4](https://doc.rust-lang.org/nomicon/unwinding.html)

### 1.5 FFI unwind boundary (`extern "C-unwind"`)

Since Rust 1.71, `extern "C-unwind"` allows C++ exceptions to traverse Rust
frames safely. In RE, seeing `C-unwind` in symbol names or LSDA records
indicates deliberate cross-language exception handling.

[5](https://rust-lang.github.io/rfcs/2945-c-unwind-abi.html)

---

## 2. Rust Name Mangling

### 2.1 Legacy mangling

Before Rust 1.69 (approx), the compiler used an ad-hoc scheme based on Itanium
C++ mangling with hash suffixes:

```
_ZN3std2io5stdio6_print6Output
// std::io::stdio::print::Output
```

The hash suffix (e.g. `28e99a5b4f6d7c8a`) disambiguated identical-named
instantiations. These symbols are **not** decodable by standard C++ demanglers
because the internal structure differs.

[6](https://rust-lang.github.io/rfcs/2603-rust-symbol-name-mangling-v0.html)

### 2.2 v0 mangling scheme

Since 1.69, the default is the **v0 scheme**. All symbols begin with `_R`:

```
_RNvMs_NtCs1234_7mycrate3foo3bar
```

Breakdown:

| Segment | Meaning |
|---------|---------|
| `_R` | v0 prefix |
| `N` | namespace root |
| `v` | version tag |
| `M` | "impl" context |
| `s_` | string (base-26 encoded) |
| `Nt` | type namespace |
| `C` | crate tag |
| `s1234_` | crate name disambiguator (base-62) |
| `7mycrate` | crate name |
| `3foo` | module name |
| `3bar` | function name |

Key encoding rules:

- **Identifiers**: length-prefixed (e.g. `3foo` = "foo", `7mycrate` = "mycrate")
- **Paths**: separated by namespace tags (`N` for normal, `t` for type, `v` for variable)
- **Generics**: encoded after the function path in angle brackets
- **Disambiguators**: base-62 encoded hashes prefixed with `s`
- **Punycode**: Unicode identifiers are Punycode-encoded with `u` prefix

Example decoding:

```
_RINvNs9_4core3ops9function6FnOnce9call_once
// <core::ops::function::FnOnce::call_once>
```

v0 is deliberately decodable by design — every mangled name carries enough
information to reconstruct the full path.

[7](https://doc.rust-lang.org/rustc/symbol-mangling/index.html)

### 2.3 Demangling tools

| Tool | Source | Usage |
|------|--------|-------|
| `rustfilt` | crates.io | `rustfilt _RNvCskwGfYPst2Cb_3foo16example_function` |
| `llvm-cxxfilt` | LLVM | `llvm-cxxfilt _RNvCskwGfYPst2Cb_3foo16example_function` (partial support) |
| `rust-demangler` | rust repo | `rust-demangler _R...` |
| `rustc-demangle` | crate | Programmatic demangling in Rust code |
| `c++filt -n` | binutils | Supports some Rust v0 since binutils 2.39 |
| `gdb` / `lldb` | built-in | Recent versions demangle Rust automatically |

```bash
# rustfilt one-liner
$ rustfilt _RNvCskwGfYPst2Cb_3foo16example_function
foo::example_function
```

For bulk demangling from a binary:

```bash
$ strings binary | grep '^_R' | rustfilt
```

[8](https://crates.io/crates/rustfilt) [9](https://crates.io/crates/rustc-demangle)

### 2.4 Generic monomorphization in mangled names

Generics produce **separate symbols per concrete type**:

```rust
fn id<T>(x: T) -> T { x }
let a = id(42u32);
let b = id(42u64);
```

Produces two distinct mangled symbols:

```
_RINv...id...u32
_RINv...id...u64
```

This is a fingerprinting gift: counting monomorphized instances reveals how many
generic types are used, and the type parameters are encoded in the mangled name.

[10](https://purplesyringa.moe/blog/rusts-v0-mangling-scheme-in-a-nutshell)

---

## 3. Rust Standard Library Patterns

### 3.1 Memory layout cheat sheet (64-bit)

| Type | Size | Layout | Notes |
|------|------|--------|-------|
| `Vec<T>` | 24 bytes | `ptr(8) + len(8) + cap(8)` | Three words, heap pointer |
| `String` | 24 bytes | `ptr(8) + len(8) + cap(8)` | Identical to `Vec<u8>` |
| `Box<T>` | 8 bytes | `ptr(8)` | Thin pointer to heap |
| `Rc<T>` | 16 bytes | `ptr(8) + strong_count(8)` | Heap ptr + refcount |
| `Arc<T>` | 16 bytes | `ptr(8) + strong_count(8)` | Atomic refcount |
| `&[T]` (fat) | 16 bytes | `ptr(8) + len(8)` | Slice reference |
| `&dyn Trait` (fat) | 16 bytes | `ptr(8) + vtable_ptr(8)` | Trait object |
| `Option<&T>` | 8 bytes | niche: `None` = null ptr | Zero-cost via null niche |
| `Option<Box<T>>` | 8 bytes | niche: `None` = null ptr | Same null niche |
| `Option<NonZeroUsize>` | 8 bytes | niche: `None` = 0 | Uses invalid zero |
| `Result<T, E>` | varies | discriminant + data | Tagged union |

[11](https://web.mit.edu/rust-lang_v1.25/arch/amd64_ubuntu1404/share/doc/rust/html/reference/type-layout.html)

### 3.2 Vec<T> and String in memory

Both are identical at the binary level:

```
Vec<String> or Vec<u8>
Offset 0: *mut T       (heap pointer to element data)
Offset 8: usize        (length)
Offset 16: usize       (capacity)
```

Common patterns in decompilation:

```c
// Decompiler sees this pattern for Vec iteration:
// Rust:
//   for x in vec { ... }
// Generates:
while (ptr < ptr + len * elem_size) {
    use *ptr;
    ptr = ptr + elem_size;
}
```

Resizing operations call `core::alloc::alloc::alloc` (jemalloc or system
allocator). The growth factor is not exactly 2x — Rust uses a capacity-adaptive
strategy.

[12](https://nnethercote.github.io/perf-book/heap-allocations.html)

### 3.3 Box<T>

Simply a `*mut T` with ownership semantics. No metadata. At the binary level,
a `Box<T>` is identical to a raw pointer — only the lack of `free` calls on the
pointer reveals the ownership distinction.

### 3.4 Rc<T> and Arc<T>

```
Rc<T> layout:
Offset 0: *mut T          (heap block pointer)
    heap block:
    +0: usize strong_count
    +8: usize weak_count   (only for Rc with Weak)
    +16: T                 (actual data)
```

`Arc` replaces `usize` with `AtomicUsize` (still 8 bytes). The atomic operations
(`lock cmpxchg` on x86) reveal `Arc` vs `Rc` in assembly.

[13](https://doc.rust-lang.org/std/rc/struct.Rc.html)

### 3.5 HashMap / BTreeMap

**`HashMap<K, V, S>`** uses Swiss table (Google's Abseil flat_hash_map) as of
Rust 1.36:

```
Offset 0: *mut (Group)  // metadata + entries
Offset 8: usize         // number of entries
Offset 16: usize        // capacity (power of 2)
Offset 24: *mut S       // hasher state
```

The metadata bytes (1 per slot, `0xFF` = empty, `0x80` = deleted) are a strong
identifying pattern.

**`BTreeMap<K, V>`** is a B-tree (not a red-black tree). In decompilation, expect
recursive tree search with internal node arrays of 6-11 elements.

[14](https://doc.rust-lang.org/std/collections/struct.HashMap.html)

### 3.6 Option<T> — niche optimization

This is the single most important Rust layout to understand.

```rust
enum Option<T> {
    None,
    Some(T),
}
```

The compiler exploits **niches** in `T`'s valid bit patterns to store the
discriminant for free:

| `Option<T>` where T is | Discriminant encoding | Size |
|------------------------|----------------------|------|
| `bool` | `None = 2` (valid bool: 0,1) | 1 byte |
| `&T` | `None = 0` (null ptr) | 8 bytes |
| `Box<T>` | `None = 0` | 8 bytes |
| `fn()` | `None = 0` | 8 bytes |
| `NonZeroUsize` | `None = 0` | 8 bytes |
| `u8` | No niche available | 2 bytes (+padding) |
| `char` | `None = 0x110000+` | 4 bytes |

In hex:

```rust
// Option<bool> bytes:
Some(true)  -> 0x01
Some(false) -> 0x00
None        -> 0x02
```

```rust
// Option<&u32> on 64-bit:
Some(&42)   -> 0xDEADBEEF...  (valid pointer)
None        -> 0x0000000000000000
```

When no niche exists, `Option<T>` becomes:

```
discriminant (8 bytes, aligned) | T (aligned)
None  -> discriminant = 0
Some  -> discriminant = 1
```

[15](https://www.0xatticus.com/posts/understanding_rust_niche/) [16](https://stackoverflow.com/questions/76429517/how-does-niche-optimization-for-an-enum-work-in-rust)

### 3.7 Result<T, E>

Similar tagged-union layout. Niche optimization also applies — if `E` has
an invalid bit pattern (e.g. `ParseIntError` is zero-sized), the discriminant
fits in the niche.

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

For `Result<&T, E>` where E is a ZST (zero-sized type):

```
Ok(&data)  -> valid pointer
Err(_)     -> null pointer
```

### 3.8 panic! format strings

Panic messages are embedded as `&str` constants in `.rodata`. Look for:

```
"called `Option::unwrap()` on a `None` value"
"called `Result::unwrap()` on an `Err` value"
"index out of bounds: the len is % but the index is %"
"assertion failed: %"
```

These strings are a reliable signal that the binary is Rust. The corresponding
functions (`core::panicking::panic`, `core::option::unwrap_failed` etc.) are
identifiable by their cross-references to these strings.

[17](https://doc.rust-lang.org/std/macro.panic.html)

### 3.9 Box<dyn Trait> vtable layout

A `Box<dyn Trait>` is a fat pointer:

```
Box<dyn Trait>:
  +0: *mut data     (8 bytes)
  +8: *mut vtable   (8 bytes)
```

The vtable itself is laid out as:

```
vtable entry layout (each entry = function pointer, 8 bytes):
  [0]: drop_in_place destructor
  [1]: size_of::<T> (usize)
  [2]: align_of::<T> (usize)
  [3]: first trait method
  [4]: second trait method
  ...
```

To reconstruct trait methods:
1. Find the vtable address from the fat pointer assignment
2. Walk entries 3+ as function pointers
3. Compare method bodies across different vtables (same trait = same layout)

[18](https://amritsingh183.github.io/rust/concepts/2025/10/23/rust-dyn.html)

---

## 4. Rust Binary Fingerprinting

### 4.1 Identifying rustc-compiled binaries

**Quick checks in order of reliability:**

| Check | What to look for | How |
|-------|-----------------|-----|
| `.rustc` section (ELF) | A section named `.rustc` | `readelf -S binary | grep rustc` |
| `_R` mangled symbols | Any symbol starting with `_R` | `nm binary | grep '^_R'` |
| Language item symbols | `_ZN4core...`, `_ZN3std...` | `strings binary | grep core::\|std::` |
| Panic strings | `unwrap()` / panic format strings | `strings binary | grep "unwrap\|called `Option"` |
| `.chill` section (old Rust) | Debug info section | Deprecated section name |
| `__rustc` ELF note | NT_GNU_BUILD_ID note | `readelf -n binary` |

**YARA rule for Rust detection:**

```
rule rust_binary {
    strings:
        $v0_mangle = /_R[A-Z][a-zA-Z0-9_]+/
        $panic_str = "called `Option::unwrap()`"
        $core_panic = "core::panicking"
        $std_alloc = "std::alloc::"
    condition:
        #v0_mangle > 5 or ($panic_str and $core_panic)
}
```

[19](https://github.com/JPCERTCC/rust-binary-analysis-research-en)

### 4.2 Cargo profile fingerprints

| Profile | `opt-level` | `debug` | Characteristics |
|---------|-------------|---------|-----------------|
| `debug` (default) | 0 | true | Huge binary, all symbols, no inlining |
| `release` | 3 | false | Small-ish, stripped, heavy inlining |
| `release` + `lto` | 3 + fat LTO | false | Very small, all inlined, hard to read |

The `.debug_str` section in debug builds contains full source paths from the
build machine (e.g. `/home/user/.cargo/registry/src/...`). Even in release
builds, `.cargo/registry` paths often survive in `.rodata` strings.

[20](https://kobzol.github.io/rust/cargo/2024/01/23/making-rust-binaries-smaller-by-default.html)

### 4.3 rustc version detection

Version strings appear in:

- `.comment` section: `rustc version 1.82.0 (e.g., 6b00bc388 2025-06-23)`
- Build ID note
- `.rodata` strings near compiler intrinsics
- `build_info` struct emitted with `-C build-id`

```bash
$ strings binary | grep -i 'rustc version'
rustc version 1.82.0 (6b00bc388 2025-06-23)
```

**`patina`** automates this: [https://github.com/alecnunn/patina](https://github.com/alecnunn/patina)

### 4.4 Crate hash identification

Each crate dependency gets a 64-bit hash in v0 mangling. The `CsXXXXXXXX_`
prefix encodes the crate's hash. You can:

1. Extract all crate hashes from mangled symbols
2. Match against known crate hashes from the Rust standard library
3. Identify which third-party crates are statically linked

```bash
$ nm binary | grep -oP '_R[^ ]*Cs[a-zA-Z0-9]+_' | sort -u
_RNvCs1234_  -> hash 0x1234...
```

[21](https://github.com/JPCERTCC/rust-binary-analysis-research-en)

---

## 5. Rust Obfuscation

### 5.1 String encryption

Popular Rust obfuscators include:

- **`string_cache`** (`librs-obfuscator` style): XOR/diffuse string constants
  at compile time, decrypt at first use
- **`obfstr`**: Compile-time XOR with randomized keys per string
- **`const_plain`**: LSB steganography in numeric constants

Pattern in decompilation:

```c
// Before obfuscation:
println!("hello world");

// After obfuscation:
char key[] = { 0x1A, 0x3F, ... };
char enc[] = { 0x6E, 0x52, ... };
for (int i = 0; i < 11; i++) enc[i] ^= key[i];
println(enc); // "hello world"
```

Look for:
- Tight loops XOR-ing byte arrays
- Constant byte arrays in `.rodata` next to key arrays
- `unsafe` blocks containing pointer arithmetic on strings

[22](https://clawgrc.com/skills/reverse-engineering-rust-malware)

### 5.2 Control-flow obfuscation

Rust binaries obfuscated with `llvm-obfuscator` or `mangopay` show:

- Bogus control flow (opaque predicates)
- Control-flow flattening (single dispatcher loop)
- Instruction substitution (add -> xor + sub etc.)

Ghidra's `deobf` plugin and angr's CFG recovery are the standard countermeasures.

### 5.3 Static vs dynamic dispatch

**Static dispatch** (generics): monomorphized — each type combination produces
a separate function. Binary bloat is the giveaway.

**Dynamic dispatch** (`dyn Trait`): vtable-based. In the decompiler:

```c
// Calls go through function pointer load:
(vtable[3])(self, arg1, arg2);
```

To reconstruct the trait:
1. Find the vtable (section 3.9)
2. Identify the virtual methods by cross-referencing
3. Build a struct for the vtable layout

[23](https://tdmathison.github.io/posts/How-rusts-ownership-model-affects-malware-re/)

---

## 6. Rust RE Tools

### 6.1 Demangling and symbol recovery

| Tool | Purpose | URL |
|------|---------|-----|
| `rustfilt` | CLI demangler | [crates.io/rustfilt](https://crates.io/crates/rustfilt) |
| `rust-demangler` | Rust compiler demangler | [github.com/rust-lang/rust](https://github.com/rust-lang/rust) |
| `patina` | Rust binary analysis | [github.com/alecnunn/patina](https://github.com/alecnunn/patina) |

### 6.2 IDA Pro plugins

| Plugin | Features |
|--------|----------|
| **IDARustler** | Function name fixer via known hashes + string matching |
| **IDARust** | Community scripts for vtable recovery |
| `idarust` (0xdea) | Rust symbol demangling in IDA |
| **SyntheticRust** | Heuristic function naming |

```python
# IDARustler workflow (simplified):
# 1. Load binary in IDA
# 2. Run function_hash_downloader to build hash DB
# 3. Run core_function_fixer to rename known functions
# 4. Run string_function_detector for string-based naming
```

[24](https://github.com/r3dhun9/IDARustler)

### 6.3 Ghidra plugins

| Plugin | Features |
|--------|----------|
| **GhidraRust** | Rust v0 demangling, standard lib recognition |
| **rust2gba** | Game Boy Advance Rust specific |
| **RustAnalyzer** | Crate dependency extraction |

### 6.4 Binary Ninja

Built-in Rust v0 demangling since 3.0. Use the `rust_demangle` plugin for
additional analysis.

### 6.5 Debugging tools

```bash
# Rust-aware debugging
rust-gdb ./binary       # GDB with Rust pretty-printers
rust-lldb ./binary      # LLDB with Rust support
gdb -ex "set language rust" ./binary

# In GDB, Rust-specific commands:
info functions ^_R       # List all Rust functions
print/x *(&my_vec)       # Examine Vec/Box layout
```

### 6.6 Binary analysis workflow

```bash
# Step 1: Confirm Rust
strings binary | grep -E '^_R|unwrap\(\)|core::panicking'

# Step 2: Extract version
strings binary | grep 'rustc version'

# Step 3: Demangle all symbols to recover function names
strings binary | grep '^_R' | rustfilt > demangled.txt

# Step 4: Identify standard library functions
# Look for patterns matching core::*, std::*, alloc::*

# Step 5: Recover trait objects
# Look for fat pointers (data_ptr + vtable_ptr)
```

[25](https://github.com/mytechnotalent/Hacking-Rust)

---

## 7. Rust Error Handling

### 7.1 Result/Option enum discriminants in assembly

```asm
; match option {
;     Some(x) => use(x),
;     None => fallback(),
; }
; x86-64:
test    rax, rax          ; check if pointer is null (None niche)
je      .none_branch      ; jump if None
mov     rdi, rax          ; use the value
call    use_value
jmp     .done
.none_branch:
call    fallback
.done:
```

For `Result<T, E>` without niche optimization:

```asm
; Check discriminant byte:
cmp     byte ptr [rsp+discrim], 0
je      .ok_branch        ; 0 = Ok, 1 = Err (typically)
```

### 7.2 panic/unwind side channels

Panics are often visible in decompilation as calls to:

- `core::panicking::panic()` — simple panic
- `core::panicking::panic_fmt()` — with format arguments
- `core::option::unwrap_failed()` — from `.unwrap()`
- `core::result::unwrap_failed()` — from `Result::unwrap()`
- `core::slice::index::index_start_len_fail()` — bounds check

`#[inline(never)]` functions are separate call targets; `#[inline]` functions
(most std library methods) are inlined and harder to distinguish.

### 7.3 catch_unwind frames

```rust
let result = std::panic::catch_unwind(|| {
    panic!("inside");
});
```

At the binary level, this compiles to:
1. `setjmp`-like save of the current unwind context
2. Call the closure (fn pointer)
3. If panic unwinding hits this frame, transfer control to the recovery path

Look for calls to `std::panicking::try` followed by a conditional check on the
return value.

### 7.4 `expect()` and `unwrap()` string literals

```rust
let x = opt.expect("custom message");
// binary contains:
// "custom message"
let y = opt.unwrap();
// binary contains:
// "called `Option::unwrap()` on a `None` value"
```

These strings are gold for understanding the programmer's intent.

[26](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html)

---

## 8. Rust async/await Internals

### 8.1 The Future trait

```rust
pub trait Future {
    type Output;
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}

pub enum Poll<T> {
    Ready(T),
    Pending,
}
```

### 8.2 State machine reconstruction

Every `async fn` compiles to a state machine struct. Example:

```rust
async fn read_and_process() -> u32 {
    let data = read_data().await;   // State0
    let result = process(data).await; // State1
    result                          // Final
}
```

Becomes (conceptually):

```rust
enum ReadAndProcessStateMachine {
    State0 { fut1: ReadDataFuture },
    State1 { data: Vec<u8>, fut2: ProcessFuture },
    Done,
}

impl Future for ReadAndProcessStateMachine {
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<u32> {
        loop {
            match self {
                State0 => {
                    match self.fut1.poll(cx) {
                        Ready(d) => *self = State1 { data: d, fut2: ... },
                        Pending => return Pending,
                    }
                }
                State1 => { ... }
                Done => panic!("polled after Ready"),
            }
        }
    }
}
```

In the binary:
- The state machine is a tagged union (enum) with a discriminant
- Each `.await` point adds a state variant
- The `poll` method is a loop over state transitions
- Size of the state machine = max size of any state variant

Recognizing the poll loop:

```c
// Decompiled async fn poll:
switch (this->state) {
    case 0:
        // First await point
        ret = fut1.poll(cx);
        if (ret.tag == PENDING) return Poll::Pending;
        this->data = ret.OK;
        this->state = 1;
        // Fall through
    case 1:
        ret = fut2.poll(cx);
        ...
}
```

[27](https://www.atharvapandey.com/post/rust/rust-runtime-future-internals)

### 8.3 Waker vtable

The `Waker` is a fat pointer:

```
Waker:
  +0: *mut data        (arbitrary context)
  +8: *mut waker_vtable
  
Waker vtable:
  [0]: clone fn pointer
  [1]: wake fn pointer
  [2]: wake_by_ref fn pointer
  [3]: drop fn pointer
```

Looking at the waker vtable entries reveals how the executor integrates:

- Tokio: waker stores task ID; wake() queues the task in the scheduler
- `futures` crate: waker may use thread-local or global executor
- Embedded: may be a simple flag-set + ISR-trigger

### 8.4 Executor identification

| Executor | Tell |
|----------|------|
| **Tokio** | `tokio::runtime::` symbols, `mio` dependency, epoll/kqueue/IOCP usage |
| **async-std** | `async_std::task::` symbols, uses `block_on` pattern |
| **smol** | Tiny runtime, `smol::run()` exec |
| **embassy** | Embedded async, no-alloc, `embassy_executor::` symbols |

Tokio's work-stealing scheduler creates thread pools:

- Each worker thread has a local queue
- LIFO slot optimization for recently spawned tasks
- Cross-thread stealing when local queues are empty

[28](https://tokio.rs/tokio/tutorial/async)

---

## 9. Rust Vtable & Trait Object Recovery

### 9.1 Fat pointer structure

```
&dyn Trait / Box<dyn Trait> / Rc<dyn Trait>:
  +0: *const () data        (pointer to concrete value)
  +8: *const () vtable_ptr  (pointer to vtable)
```

Total: 16 bytes on 64-bit platforms (same as a slice reference).

### 9.2 Vtable layout

```
Vtable for (T, Trait):
  [0]: fn drop_in_place(*mut T)
  [1]: usize size_of::<T>()
  [2]: usize align_of::<T>()
  [3]: fn first_trait_method(&self, ...)
  [4]: fn second_trait_method(&self, ...)
  ...
```

The first three entries are **always** present. Methods start at index 3 in
declaration order.

### 9.3 Reconstructing trait hierarchy

Given a vtable pointer, to find the trait definition:

1. **Identify concrete type size**: read vtable[1] (size_of) and vtable[2] (align)
2. **Count methods**: iterate from vtable[3] forward to find function pointers
3. **Compare vtables**: same method count + same entry types = same trait
4. **Cross-reference**: find where the vtable is constructed (at monomorphization
   sites in the compiler-generated code)

Example procedural recovery (pseudocode):

```python
data_ptr = read_qword(fat_pointer_addr)
vtable_ptr = read_qword(fat_pointer_addr + 8)

drop_fn = read_qword(vtable_ptr + 0)
type_size = read_qword(vtable_ptr + 8)
type_align = read_qword(vtable_ptr + 16)

methods = []
offset = 24
while True:
    fn_ptr = read_qword(vtable_ptr + offset)
    if is_valid_code_address(fn_ptr):
        methods.append(fn_ptr)
        offset += 8
    else:
        break

print(f"Trait object: type_size={type_size}, methods={len(methods)}")
```

[29](https://alexanderobregon.substack.com/p/trait-objects-in-rust-and-the-mechanics)

### 9.4 Comparing Rust vtables to C++ vtables

| Feature | Rust | C++ |
|---------|------|-----|
| First vtable entry | `drop_in_place` | first virtual method or offset-to-top |
| RTTI in vtable | No built-in | Yes, `type_info` pointer |
| Method order | Declaration order | Declaration order |
| Multiple inheritance | Not supported (use trait composition) | Separate vtables per base |
| Virtual inheritance | N/A | Extra thunks |
| `size_of`/`align_of` | Explicit entries at start | Not stored in vtable |

---

## 10. Rust vs Go vs C++ Discrimination

### 10.1 Quick identification table

| Feature | Rust | Go | C++ |
|---------|------|----|-----|
| Mangling prefix | `_R` (v0) or `_ZN` (legacy) | None (or pclntab) | `_Z` (Itanium) or `?` (MSVC) |
| Entry point | `main` | `main.main` via `_rt0_amd64_*` | `main` or `WinMain` |
| Runtime strings | `unwrap()` / `panic!` | `runtime: ` prefix | C++ exception names |
| Symbol section | `.rustc` | `.gopclntab` | `.rdata` / `.rodata` |
| DWARF producer | `rustc` | `Go cmd/compile` | `GCC` / `clang` / `MSVC` |
| Stack size | Platform default (2MB) | Small (2KB, growable) | Platform default |
| Allocator | jemalloc/system | TCMalloc-like | `malloc`/`new` |
| TLS | `__tls_get_addr` | `runtime.tlsg` | `__tls_get_addr` |

### 10.2 Unique Rust markers

1. **`_R` mangled symbols** — any binary with >5 `_R...` symbols is almost
   certainly Rust (v0 scheme)
2. **Panic strings**: `"called \`Option::unwrap()\` on a \`None\` value"` is
   Rust-specific and embedded in every binary that uses `.unwrap()`
3. **`.rustc` section** (ELF) — empty marker section unique to rustc
4. **`core::` / `alloc::` / `std::` module paths** in debug info or error strings
5. **`__rustc` note** in ELF NT_GNU_BUILD_ID
6. **No `main` symbol** — Rust's `main` is wrapped in `std::rt::lang_start`

### 10.3 Unique Go markers

1. **`runtime.goexit`**, **`runtime.main`**, **`runtime.newproc`** in symbol table
2. **`fmt.Println`** / **`fmt.Sprintf`** in linked library (if used)
3. **`.gopclntab`** section (Go PC/line table) — survives stripping
4. **debug/buildinfo** — embedded Go version and module path
5. **Large binaries** with simple source due to static runtime linking

### 10.4 Unique C++ markers

1. **`_Z` (Itanium) or `?` (MSVC)** prefix on mangled symbols
2. **`std::` namespace** in demangled output
3. **`operator new` / `operator delete`** symbols (Rust uses `alloc::alloc::*`)
4. **`__cxa_*`** (Itanium) or **`_Cxx*`** (MSVC) exception handling symbols
5. **RTTI** (`__ZTI`, `__ZTV` for Itanium; `RTTI*` for MSVC)

[30](https://fuzzinglabs.com/reversing-modern-binaries)

---

## PART II: PYTHON

---

## 11. PyInstaller Reversing

### 11.1 How PyInstaller works

PyInstaller packages Python scripts into standalone executables:

1. **Bootloader** — a native executable (C) that unpacks the Python environment
2. **PYZ archive** — Zlib-compressed archive of `.pyc` bytecode, appended to the
   executable
3. **Embedded Python** — `pythonXY.dll` / `libpythonX.Y.so` statically loaded
4. **CArchive** — structured container for all bundled files

The executable is a self-extracting archive with a native launcher.

### 11.2 Identifying PyInstaller binaries

```bash
# Python DLL reference:
$ strings binary.exe | grep -i python
python310.dll
Python 3.10

# PyInstaller bootloader strings:
$ strings binary.exe | grep -i pyinstaller
PyInstaller
pyi_main
PYZ

# Look for:
# - "MEIPASS2" environment variable reference
# - "_MEI" temporary directory pattern
# - "pyi-windib" or "pyi-gui" bootloader types
```

### 11.3 Extraction workflow

```
pyinstxtractor > .pyc files > decompiler > .py source
```

**Step 1: Extract with pyinstxtractor**

```bash
$ python pyinstxtractor.py malware.exe
[+] Processing malware.exe
[+] Pyinstaller version: 6.0+
[+] Python version: 310
[+] Found 47 files in CArchive
[+] Found 89 files in PYZ archive
[+] Possible entry point: main.pyc
[+] Successfully extracted to: malware.exe_extracted/
```

**Step 2: Examine the PYZ archive**

The `PYZ-00.pyz` file is a custom archive format (not standard zip). It contains
zlib-compressed marshalled code objects concatenated with a table of contents.

**Step 3: Fix .pyc headers**

PyInstaller strips the 16-byte `.pyc` header. You must prepend it:

```bash
# Get the correct magic number for the Python version:
$ python -c "import importlib; print(importlib.util.MAGIC_NUMBER.hex())"
610d0d0a
```

Then prepend:

```bash
# Prepending 16-byte header manually (hex):
# Magic(4) + Flags(4) + Timestamp(4) + Size(4)
$ printf '\x61\x0d\x0d\x0a\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00' | \
    cat - main.pyc > main_fixed.pyc
```

Or use the built-in header fix in pyinstxtractor (handles this automatically
since v4.0+).

**Step 4: Decompile .pyc to .py**

```bash
$ uncompyle6 main_fixed.pyc > main.py
# or for Python 3.9+:
$ decompyle3 main_fixed.pyc > main.py
# or:
$ pycdc main_fixed.pyc > main.py
```

[31](https://github.com/extremecoders-re/pyinstxtractor) [32](https://github.com/pyinstxtractor/pyinstxtractor-ng)

### 11.4 .pyc header structure

```
.pyc file format (Python 3.7+):
Offset  Size  Field
0       4     Magic number  (e.g. 0x610d0d0a for 3.10)
4       4     Bit field flags (PEP 552: 0=timestamp, 1=hash)
8       4     Source timestamp (or hash if bit 0 set)
12      4     Source size
16      ...   Marshalled code object
```

| Python | Magic (hex LE) |
|--------|----------------|
| 3.8 | `0x550d0d0a` |
| 3.9 | `0x610d0d0a` |
| 3.10 | `0x6f0d0d0a` |
| 3.11 | `0xa70d0d0a` |
| 3.12 | `0xb30d0d0a` |
| 3.13 | `0xbf0d0d0a` |

### 11.5 Decompilation quality by tool

| Tool | Python support | Quality | Notes |
|------|---------------|---------|-------|
| `uncompyle6` | 2.7 - 3.8 | Good | Unmaintained since 2021 |
| `decompyle3` | 3.7+ | Better | Fork of uncompyle6, actively maintained |
| `pycdc` | 2.7 - 3.12 | Fair | C++ impl, handles obfuscation better |
| `pylingual.io` | Any | Best | Online AI-powered, paid tier |

[33](https://github.com/rocky/python-uncompyle6) [34](https://github.com/zrax/pycdc)

### 11.6 Encrypted PyInstaller binaries

PyInstaller 5.0+ supports encryption via `--key` flag using AES-256-CTR.
`pyinstxtractor-ng` can decrypt these automatically with the correct key.

Detection: Look for `_pyinstaller_encryption_key` string or `Crypto.Cipher` in
imports.

---

## 12. Nuitka Compiled Python

### 12.1 How Nuitka works

Nuitka is a **true Python compiler** (not a packer):

```
Python source  →  Nuitka C++ translator  →  C++ source
  →  gcc/clang/MSVC  →  native machine code
```

Unlike PyInstaller which bundles bytecode, Nuitka translates Python constructs
to C++ that uses CPython API calls. The output is genuinely compiled.

### 12.2 Identifying Nuitka binaries

```bash
# Nuitka markers:
$ strings binary | grep -i nuitka
Nuitka
Nuitka-Built
NUITKA_BUILT

# Look for:
# - "Compiled with Nuitka" strings
# - `__nuitka_*` hidden symbols
# - Large RCDATA resources (Windows) containing frozen modules
$ strings binary | grep "__nuitka"
__nuitka_builtins
__nuitka_module_*
```

### 12.3 Nuitka binary structure

A Nuitka-compiled binary contains:

1. **Native code** — C++ translation of Python source, compiled to machine code
2. **Frozen module data** — compressed in RCDATA (Windows) or embedded blobs
3. **CPython library** — statically linked (or dynamically referenced)
4. **Module registry** — `__nuitka_module_*` globals mapping module names to init
   functions

On Windows, the frozen modules are in `RCDATA` resources. Use Resource Hacker or
7-zip to extract:

```
Resource Type: RCDATA
Resource ID: 10 (or 3, varies by version)
Contains: serialized module constants
```

### 12.4 Reversing Nuitka output

Nuitka-dumper and nuitka-extractor tools can help:

```bash
# 1. Extract RCDATA from PE binary (Windows)
$ 7z e binary.exe -oextracted

# 2. Run nuitka-unstreamer to dump constants
$ python -m nuitka_unstreamer.main extracted_RCDATA.bin \
    -o output \
    --base-map __main__:0x180942BD0
```

This generates:
- An IDAPython script to name constants
- Decompressed Python bytecode-like data
- Cross-reference annotations for IDA Pro

### 12.5 Decompilation difficulty

| Aspect | Difficulty | Notes |
|--------|-----------|-------|
| String recovery | Easy | Strings in plain `.rodata` |
| Control flow | Hard | C++ translations of Python constructs |
| Variable names | Lost | Only compiler-generated temporaries |
| Class structure | Medium | Objects are `PyObject*` |
| Python semantics | Hard | `.py` is recoverable but not exact |

The generated C++ is structured but verbose. Each Python construct becomes
CPython API calls:

```c
// Python: result = x + y
// Nuitka generated C++:
PyObject *result = BINARY_OPERATION_ADD(x, y);

// Python: if condition: do_thing()
// Nuitka generated C++:
if (CHECK_truth(condition)) {
    do_thing();
}
```

AI-assisted decompilation (Claude, GPT-4) can reconstruct the original Python
from decompiled C++ with moderate accuracy (60-80% depending on complexity).

[35](https://github.com/Nuitka/Nuitka) [36](https://github.com/4equest/Nuitka-Dumper)

---

## 13. Cython (.so) Reversing

### 13.1 How Cython works

Cython compiles Python-like code (`.pyx`) to C which is then compiled to a
native shared library (`.so` / `.pyd`). The C code makes direct CPython API calls.

### 13.2 Identifying Cython modules

```bash
# Cython initializer function:
$ nm module.so | grep PyInit_
PyInit_crypto_check

# Cython internals:
__Pyx_*
__pyx_*

# Standard Cython strings in .rodata:
"cython_function"
"__pyx_"
```

The exported initializer is always `PyInit_<modulename>` — this is the only
symbol a Cython `.so` exports.

### 13.3 Cython-generated C patterns

```c
// __pyx_ variables hold Python references:
static PyObject *__pyx_v_self;
static PyObject *__pyx_v_result;

// Cython error handling:
__Pyx_TraceCall("function_name", __PYX_FILE, 42);
// ... logic ...
__Pyx_ErrFetch(&__pyx_type, &__pyx_value, &__pyx_tb);

// Type conversion:
if (unlikely(!PyArg_ParseTupleAndKeywords(args, kw, "O:method_name",
    __pyx_kwds, &__pyx_v_arg))) {
    return NULL;
}

// Method table:
static PyMethodDef __pyx_methods[] = {
    {"process", (PyCFunction)__pyx_pw_4crypto_7process,
        METH_VARARGS | METH_KEYWORDS, "process docstring"},
    {NULL, NULL, 0, NULL}
};

// Type definition:
static PyTypeObject __pyx_type_4crypto_Processor = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "crypto.Processor",
    .tp_basicsize = sizeof(struct __pyx_obj_4crypto_Processor),
    .tp_flags = Py_TPFLAGS_DEFAULT,
    .tp_methods = __pyx_methods,
    .tp_init = (initproc)__pyx_pw_4crypto_5Processor___init__,
    // ...
};
```

### 13.4 Reconstructing Python semantics

Each Cython function decompiles to a predictable pattern:

```c
// Python: def process(self, data):
//   return self.hash(data)

// Cython generated C (simplified):
static PyObject *__pyx_pf_4crypto_7Processor_2process(
    PyObject *__pyx_v_self, PyObject *__pyx_v_data) {

    PyObject *__pyx_r = NULL;
    PyObject *__pyx_t_1 = NULL;
    PyObject *__pyx_t_2 = NULL;

    // Get attribute 'hash' from self
    __pyx_t_1 = PyObject_GetAttr(__pyx_v_self, __pyx_n_s_hash);
    if (unlikely(!__pyx_t_1)) { __pyx_filename = __pyx_f[0]; ... }

    // Call hash(data)
    __pyx_t_2 = PyObject_Call(__pyx_t_1, __pyx_v_data, NULL);
    Py_DECREF(__pyx_t_1);
    if (unlikely(!__pyx_t_2)) { __pyx_filename = __pyx_f[0]; ... }

    // Return result
    __pyx_r = __pyx_t_2;
    __pyx_t_2 = 0;
    goto __pyx_L0;

    // Cleanup
    __pyx_L0:
    Py_XDECREF(__pyx_r);
    return __pyx_r;
}
```

Key reconstruction rules:

| Cython pattern | Python equivalent |
|----------------|-------------------|
| `PyObject_GetAttr(obj, name)` | `obj.name` / `getattr(obj, name)` |
| `PyObject_Call(fn, args, kwargs)` | `fn(*args, **kwargs)` |
| `PyArg_ParseTuple(args, "O\|O", &a, &b)` | function signature |
| `PyList_New(0)` / `PyList_Append` | `result = []; result.append(x)` |
| `__pyx_tuple_` | Tuple constants |
| `__pyx_k_` | String constants |

### 13.5 Tools for Cython RE

| Tool | Purpose |
|------|---------|
| **PydAnalyzer** | Analyze Cython `.pyd` from IDA pseudocode output |
| **IDA Pro + CPython headers** | Load `Python.h` types for proper struct recognition |
| **Ghidra + Python types** | GDT for CPython types |
| **Claude/GPT-4** | AI translation of Cython C back to Python |

Key IDA workflow:
1. Load `.so` / `.pyd` in IDA
2. Apply CPython type library (Python.h → .til / GDT)
3. Locate `PyInit_*` as the entry point
4. Walk `__pyx_methods` table to enumerate module functions
5. Decompile each `__pyx_pf_*` function and map back to Python

[37](https://frehberg.com/2019/05/rust-handling-executables-and-their-debug-symbols)

### 13.6 CPython API calls as markers

| API call | Meaning |
|----------|---------|
| `PyObject_GetItem` | Indexing: `obj[key]` |
| `PyObject_SetItem` | Assignment: `obj[key] = val` |
| `PyList_Append` | `.append()` |
| `PyDict_SetItem` | `dict[key] = val` |
| `PyUnicode_FromString` | String creation |
| `PyNumber_Add` | `x + y` |
| `PyNumber_Multiply` | `x * y` |
| `PyIter_Next` | `next(iterator)` |
| `PyObject_CallMethod` | `obj.method()` |
| `PyErr_SetString` | `raise Exception(msg)` |

Each of these maps directly to a Python AST node. Reversing Cython is largely a
matter of recognizing these API call sequences and translating them back.

[38](https://stackoverflow.com/questions/71269170/decompile-cython-extension-back-to-python)

---

## 14. Python .pyc Bytecode

### 14.1 pyc header magic numbers

```python
import importlib.util
# Get current version magic:
hex_magic = importlib.util.MAGIC_NUMBER.hex()
print(f"Magic number: 0x{hex_magic}")
```

Common magic numbers:

| hex (little-endian) | Python version |
|---------------------|---------------|
| `03f30d0a` | 2.7 |
| `ee0c0d0a` | 3.4 |
| `170d0d0a` | 3.5 |
| `200d0d0a` | 3.6 |
| `420d0d0a` | 3.7 |
| `550d0d0a` | 3.8 |
| `610d0d0a` | 3.9 |
| `6f0d0d0a` | 3.10 |
| `a70d0d0a` | 3.11 |
| `b30d0d0a` | 3.12 |
| `bf0d0d0a` | 3.13 |

The magic number changes every minor release to ensure `.pyc` files are
invalidated across versions. The `0d0a` suffix (carriage return + newline) is
consistent and helps with identification.

[39](https://peps.python.org/pep-0552)

### 14.2 Code object structure

The `marshal` format serializes code objects recursively:

```
Code object (marshal type code 'c' / 99):
  co_argcount:        int (number of arguments)
  co_posonlyargcount: int (positional-only args, 3.8+)
  co_kwonlyargcount:  int (keyword-only args)
  co_nlocals:         int (number of local variables)
  co_stacksize:       int (maximum stack size)
  co_flags:           int (bitfield: 0x02=generator, 0x20=coroutine, etc.)
  co_code:            bytes (raw bytecode)
  co_consts:          tuple of constants
  co_names:           tuple of names (global/attribute names)
  co_varnames:        tuple of local variable names
  co_freevars:        tuple of free variable names
  co_cellvars:        tuple of cell variable names
  co_filename:        str (source file path)
  co_name:            str (function name)
  co_firstlineno:     int (first line number)
  co_lnotab:          bytes (line number table)
  co_exceptiontable:  bytes (exception handling table, 3.11+)
```

```python
import dis, marshal

with open("module.pyc", "rb") as f:
    f.read(16)  # skip header
    code_obj = marshal.load(f)

print(f"Function: {code_obj.co_name}")
print(f"Args: {code_obj.co_varnames[:code_obj.co_argcount]}")
print(f"Bytecode length: {len(code_obj.co_code)} bytes")
print(f"Constants: {code_obj.co_consts}")
dis.dis(code_obj)
```

### 14.3 Bytecode instruction overview

| Opcode | Name | Stack Effect | Description |
|--------|------|-------------|-------------|
| 0x01 | `POP_TOP` | TOS → pop | Discard top of stack |
| 0x03 | `ROT_TWO` | swap top two | (Python <3.11) |
| 0x05 | `ROT_THREE` | rotate top three | (Python <3.11) |
| 0x09 | `NOP` | — | No operation |
| 0x19 | `BINARY_OP` | TOS1 op TOS → result | 3.11+ unified binary op |
| 0x1B | `STORE_SUBSCR` | TOS1[TOS] = TOS2 | Store subscript |
| 0x23 | `BINARY_MULTIPLY` | TOS1 × TOS | (pre-3.11) |
| 0x3C | `UNPACK_SEQUENCE` | TOS → *sequence | Unpack iterable |
| 0x46 | `LOAD_CONST` | const → TOS | Load constant |
| 0x47 | `LOAD_NAME` | name → TOS | Load global/builtin |
| 0x48 | `BUILD_TUPLE` | tuple → TOS | Build tuple from stack |
| 0x53 | `RETURN_VALUE` | TOS → return | Return function result |
| 0x5A | `LOAD_FAST` | local → TOS | Load local variable |
| 0x5B | `STORE_FAST` | TOS → local | Store local variable |
| 0x5C | `DELETE_FAST` | delete local | Delete local variable |
| 0x5E | `LOAD_CONST` |  | 3.11+ adaptive |
| 0x5F | `LOAD_GLOBAL` | global → TOS | Load global |
| 0x86 | `LOAD_ATTR` | TOS.name → TOS | Load attribute |
| 0x90 | `LOAD_BUILD_CLASS` | __build_class__ → TOS | For class definitions |
| 0x91 | `GET_AWAITABLE` | awaitable → TOS | Async/await |
| 0x92 | `LOAD_ASSERTION_ERROR` | builtins.AssertionError | For assert |
| 0x96 | `LIST_TO_TUPLE` | list → tuple | Optimization |
| 0x9B | `MATCH_KEYS` | keys, match → result | Structural pattern matching (3.10+) |
| 0xA0 | `PRECALL` | prepare call frame | 3.11+ calling convention |
| 0xA1 | `CALL` | function call | 3.11+ calling convention |
| 0xA2 | `KW_NAMES` | keyword names | 3.11+ precompute kw names |
| 0xAB | `LOAD_METHOD` | self, method → method, self | Before method call |

The single most important doc for bytecode is:
```python
import dis
print(dis.opmap)   # opcode -> name mapping
print(dis.opname)  # name -> opcode mapping (array)
```

Or from the CLI:
```bash
python -c "import dis; print('LOAD_FAST:', dis.opmap['LOAD_FAST'])"
```

[40](https://docs.python.org/3/library/dis.html)

### 14.4 3.11+ bytecode changes

Python 3.11 introduced **adaptive bytecode** — opcodes can be patched at runtime
to specialized forms:

- `PRECALL/CALL` replaces the old `CALL_FUNCTION` family
- `RESUME` replaces `SETUP_FINALLY` at function entry
- `BINARY_OP` unifies all binary operations into one opcode with a sub-op
- `LOAD_FAST_CHECK` — bounds-checked local load

The `co_code` now includes inline cache entries (extra bytes after certain
opcodes). Use `dis.get_instructions()` to handle these automatically.

### 14.5 Reversing .pyc without source

```python
# disassemble.py — full bytecode dump
import dis, marshal, sys

def dis_pyc(path):
    with open(path, "rb") as f:
        magic = f.read(4)
        f.read(12)  # flags + timestamp + size
        code = marshal.load(f)
    dis.dis(code)

if __name__ == "__main__":
    dis_pyc(sys.argv[1])
```

For control flow graph reconstruction:

```bash
# Use py2cfg or flowgraph:
pip install py2cfg
python -m py2cfg module.pyc
```

[41](https://github.com/knight0x07/pyc2bytecode)

### 14.6 .pyc modification and patching

Bytecode can be modified directly — change constants in `co_consts`, alter
branch targets in `co_code`, or swap opcodes. Tools:

- **`xdis`** — cross-version bytecode library
- **`bytecode`** / **`cpython`** — Python bytecode assembler/disassembler
- **`pycparser`** — modify and reassemble `.pyc` files

---

## 15. Python Built-in Module RE (C Extensions)

### 15.1 Module init function

Every CPython extension module exposes exactly one exported symbol:

```c
// Python 3.x:
PyMODINIT_FUNC PyInit_cryptoutils(void)
{
    return PyModuleDef_Init(&cryptoutils_module);
}
```

The module definition is a `PyModuleDef` struct:

```c
static struct PyModuleDef cryptoutils_module = {
    PyModuleDef_HEAD_INIT,
    "cryptoutils",           // m_name
    "Crypto utility module", // m_doc
    -1,                      // m_size (per-module state, -1 = no state)
    cryptoutils_methods,     // m_methods
};
```

### 15.2 Method table

```c
static PyMethodDef cryptoutils_methods[] = {
    {"encrypt",
     (PyCFunction)cryptoutils_encrypt,
     METH_VARARGS | METH_KEYWORDS,
     "Encrypt data using AES-256"},
    {"decrypt",
     (PyCFunction)cryptoutils_decrypt,
     METH_VARARGS | METH_KEYWORDS,
     "Decrypt data"},
    {NULL, NULL, 0, NULL}  // Sentinel
};
```

In IDA/Ghidra:
1. Find `PyInit_*` → follow to `PyModuleDef`
2. Read `m_methods` → array of `PyMethodDef`
3. Each entry: name string pointer → C function pointer

### 15.3 Type objects

Custom types defined in C extensions use `PyTypeObject`:

```c
static PyTypeObject Cryptor_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "cryptoutils.Cryptor",
    .tp_basicsize = sizeof(CryptorObject),
    .tp_itemsize = 0,
    .tp_dealloc = (destructor)Cryptor_dealloc,
    .tp_doc = PyDoc_STR("Cryptor object"),
    .tp_methods = Cryptor_methods,
    .tp_members = Cryptor_members,
    .tp_getset = Cryptor_getset,
    .tp_init = (initproc)Cryptor_init,
    .tp_new = Cryptor_new,
};
```

To reconstruct the class from the binary:
1. Locate the `PyTypeObject` structure in `.data` / `.rodata`
2. Extract `tp_name` for class name
3. Walk `tp_methods`, `tp_members`, `tp_getset` for API surface
4. Decompile `tp_init` (constructor), `tp_dealloc` (destructor), and methods

[42](https://docs.python.org/3/c-api/typeobj.html)

### 15.4 PyArg_ParseTuple format strings

Function signatures are encoded in format strings:

```c
PyArg_ParseTuple(args, "O|O!i:encrypt", &data, &PyBytes_Type, &key, &mode)
//     "O"             = PyObject* (required)
//     "|"             = start of optional args
//     "O!"            = type-checked object (must be bytes)
//     "i"             = int
//     ":encrypt"      = function name for error messages
```

Common format codes:

| Code | C type | Python type |
|------|--------|-------------|
| `O` | `PyObject*` | Any object |
| `O!` | `PyObject*` | Type-checked (needs extra type arg) |
| `i` | `int` | Integer |
| `l` | `long` | Integer |
| `d` | `double` | Float |
| `s` | `const char*` | String (bytes) |
| `u` | `Py_UNICODE*` | Unicode string |
| `z` | `const char*` | String or None |
| `b` | `unsigned char` | Small int (0-255) |
| `|` | — | Optional separator |
| `:` | — | Error message name separator |
| `!` | — | Type check |

[43](https://docs.python.org/3/c-api/arg.html)

---

## 16. Embedded CPython in Games/Apps

### 16.1 Finding the embedded Python environment

Applications (games, tools) may embed CPython via:

```c
// Initialize Python:
Py_Initialize();

// Run a string of Python code:
PyRun_SimpleString("import sys\nprint('hello')");

// Evaluate an expression:
PyObject *val = PyRun_String("1 + 2", Py_eval_input, globals, locals);

// Import and execute a module:
PyObject *mod = PyImport_ImportModule("game_script");
PyObject *result = PyObject_CallMethod(mod, "run", NULL);
```

### 16.2 Signature scanning for embedded Python

```bash
# Look for Py_Initialize at known offsets:
$ strings binary | grep Py_Initialize
# Look for Python library references:
$ strings binary | grep python
python3.dll
python310.dll
# Look for .py or .pyc in embedded resources:
$ strings binary | grep '\.py$'
```

### 16.3 Extracting frozen modules

CPython supports **frozen modules** — pre-compiled bytecode compiled into the
binary as C arrays:

```c
// Frozen module in C:
static unsigned char _Py_M__frozen_module[] = {
    99, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // ... marshalled code object
};

static const struct _frozen _Py_FrozenModules[] = {
    {"__main__", _Py_M__frozen_module, sizeof(_Py_M__frozen_module)},
    {NULL, NULL, 0}  // sentinel
};
```

To extract:
```bash
# Find frozen module arrays in binary (look for marshal type 'c' = 0x63):
$ xxd binary | grep "63 00 00 00" | head
```

Or scan for the `_Py_FrozenModules` table: it's a sequence of `{name, code, size}`
structs ending with `{NULL, NULL, 0}`. The name strings are plain ASCII `.rodata`.

### 16.4 PyImport_ExecCodeModule pattern

```c
// Load a module from a code object in memory:
PyObject *code = ...; // from marshalled data
PyObject *mod = PyImport_ExecCodeModule("dynamic_mod", code);
```

This is the most common pattern for injecting Python code at runtime. In
reversing, locate the `PyImport_ExecCodeModule` call and trace the code object
argument to find the embedded Python logic.

---

## 17. Python Simple Obfuscation

### 17.1 Compression + base64 chains

The simplest Python obfuscation pattern:

```python
# Decompressed from:
exec(compile(base64.b64decode(zlib.decompress(encoded_bytes)),
              '<string>', 'exec'))

# Or simpler:
exec(zlib.decompress(base64.b64decode(encoded)))
```

In hex:
```python
import zlib, base64

# Typical structure in the binary:
encoded = b'eJx9klFrgzAQx7/...'  # base64 string
# The pattern is:
# exec -> compile -> zlib.decompress -> base64.b64decode
```

Detection:
```bash
$ strings obfuscated.py | grep -E '(exec|compile|base64|zlib|marshal)'
```

### 17.2 marshal.loads(compile(...)) pattern

```python
# One-shot decryption chain:
import marshal, zlib, base64
exec(marshal.loads(zlib.decompress(base64.b64decode(
    "eJx9klF..."
))))
```

The `marshal.loads` recovers the code object directly without `compile()`.
This is detectable by:
1. `marshal` import
2. `b64decode` + `decompress` chain
3. Raw bytes after `marshal.loads`

### 17.3 PyArmor

PyArmor is a commercial obfuscator. Its protection model:

1. **Code object encryption**: Each code object's bytecode is encrypted with AES
2. **Runtime decryptor**: `pyarmor_runtime` shared library handles decryption
3. **Wrap mode**: Extra bytecode wrapper (`__armor_enter__` / `__armor_exit__`)
   that decrypts on entry and re-encrypts on exit
4. **BCC mode**: Irreversible — converts Python functions to C then compiles to
   machine code
5. **RFT mode**: Renames functions, classes, variables to random strings

PyArmor wrapped bytecode structure:

```
Wrap header:
  LOAD_GLOBALS    N (__armor_enter__)
  CALL_FUNCTION   0
  POP_TOP

Original encrypted bytecode:
  ... encrypted opcodes ...

Wrap footer:
  LOAD_GLOBALS    N + 1 (__armor_exit__)
  CALL_FUNCTION   0
  POP_TOP
  END_FINALLY
```

Unpacking tools:

| Tool | Method |
|------|--------|
| **PyArmor-Unpacker** | Dynamic — hooks crypto functions to dump decrypted code |
| **Pyarmor-Static-Unpack-1shot** | Static — extracts AES keys from runtime, decrypts offline |
| **disrobe** | Universal Python deobfuscator |

The static unpack workflow:

```bash
# 1. Extract pyarmor_runtime shared library
# 2. Find AES key material in runtime library
# 3. Decrypt code objects using AES-CTR
# 4. Reconstruct clean .pyc with decrypted bytecode
# 5. Decompile with pycdc / decompyle3
```

[44](https://github.com/Lil-House/Pyarmor-Static-Unpack-1shot) [45](https://pyarmor.dashingsoft.com/)

### 17.4 PyObfuscate / other tools

| Obfuscator | Technique | Reversibility |
|------------|-----------|---------------|
| `pyobfuscate` | Name mangling, string XOR | Easy (static) |
| `pyarmor` Basic | AES encryption + name mangling | Medium (key extraction) |
| `pyarmor` BCC | C compilation | Hard (native code) |
| `Opy` | Control flow flattening | Medium |
| `Intensio` | String obfuscation + junk code | Easy |
| `pyminifier` | Minification only | Trivial |

Common deobfuscation order:
1. Decompress (zlib/bz2/lzma)
2. Decode (base64/base32/hex)
3. De-marshal (`marshal.loads`)
4. Decompile (uncompyle6/pycdc)
5. Replace obfuscated names (heuristic/pattern matching)

---

## 18. Quick Reference: Rust

### 18.1 Rust memory layout summary

| Rust type | Bytes (64-bit) | Layout |
|-----------|---------------|--------|
| `bool` | 1 | `00` or `01` |
| `i32` / `u32` | 4 | standard integer |
| `i64` / `u64` | 8 | standard integer |
| `usize` / `isize` | 8 | pointer-sized |
| `f64` | 8 | IEEE 754 |
| `char` | 4 | Unicode scalar (0..0x10FFFF) |
| `*const T` / `*mut T` | 8 | thin pointer |
| `&T` / `&mut T` | 8 | thin pointer (unsized = 16) |
| `Box<T>` | 8 | thin pointer to heap |
| `String` | 24 | `(ptr, len, cap)` |
| `Vec<T>` | 24 | `(ptr, len, cap)` |
| `&[T]` / `&str` | 16 | fat: `(ptr, len)` |
| `&dyn Trait` | 16 | fat: `(data_ptr, vtable_ptr)` |
| `Rc<T>` / `Arc<T>` | 16 | `(ptr, refcount)` |
| `Option<&T>` | 8 | null niche |
| `Option<NonZeroUsize>` | 8 | zero niche |
| `Result<(), E>` | 0-8 | depends on E |

### 18.2 Rust binary triage checklist

```bash
# 1. Is it Rust?
strings binary | grep -E '^_R[A-Z]|unwrap\(\)|core::panicking|rust_panic'

# 2. What version?
strings binary | grep 'rustc version'

# 3. Extract crate names (v0 mangling)
strings binary | grep -oP '_RCs[a-zA-Z0-9]+_' | sort -u

# 4. Demangle all symbols
strings binary | grep '^_R' | head -100 | rustfilt

# 5. Find panic strings (high-value targets)
strings binary | grep -E '^called `|^index out of bounds|^assertion failed'

# 6. Identify allocator
strings binary | grep -i 'jemalloc\|mimalloc\|system allocator'
```

---

## 19. Quick Reference: Python

### 19.1 Python binary triage checklist

```bash
# 1. Is it PyInstaller?
strings binary | grep -iE 'pyinstaller|PYZ|MEIPASS|pyi-main'

# 2. What Python version?
strings binary | grep -iE 'python[0-9]+\.[0-9]+\.dll|libpython[0-9]+\.[0-9]+'

# 3. Is it Nuitka?
strings binary | grep -iE 'nuitka|__nuitka|Nuitka-Built'

# 4. Is it Cython?
nm binary 2>/dev/null | grep PyInit_
# or on PE:
objdump -p binary | grep PyInit_

# 5. Extract .pyc from PyInstaller
pyinstxtractor-ng binary.exe

# 6. Decompile extracted .pyc
for f in *_extracted/*.pyc; do
    pycdc "$f" > "${f%.pyc}.py" 2>/dev/null
done
```

### 19.2 Python memory layout for C extensions

| CPython type | `sizeof` (64-bit) | Key fields |
|-------------|-------------------|------------|
| `PyObject` | 16 | `ob_refcnt, ob_type` |
| `PyVarObject` | 24 | `+ ob_size` |
| `PyUnicodeObject` | 48+ | `+ length, state, hash, interned, ...` |
| `PyBytesObject` | 32 | `+ ob_shash, ob_sval` |
| `PyListObject` | 40 | `+ ob_item, allocated` |
| `PyDictObject` | 48 | `+ ma_keys, ma_values, ma_used` |
| `PyTupleObject` | 24 | `+ ob_item[1]` (variable-length) |
| `PySetObject` | 48 | `+ table, mask, fill, used` |
| `PyCFunctionObject` | 48 | `+ m_ml, m_self, m_module` |

### 19.3 Decompiler selection guide

| Input type | Tool | Expected outcome |
|-----------|------|-----------------|
| `.pyc` (2.7-3.8) | uncompyle6 | 90-100% recovery |
| `.pyc` (3.7+) | decompyle3 | 85-95% recovery |
| `.pyc` (any) | pycdc | 60-80% recovery |
| `.pyc` (any) | pylingual.io | 70-90% recovery (AI) |
| PyInstaller EXE | pyinstxtractor + decompile | Full .py recovery |
| Cython .so | IDA + Python.h types | Reconstruct Python semantics |
| Nuitka binary | nuitka_dumper + reverse | Partial Python recovery |
| PyArmor basic | Pyarmor-Static-Unpack-1shot | Clean .pyc then decompile |
| PyArmor BCC | Manual RE (native code) | Very difficult |

---

## Sources

### Rust

- [1] Rust Reference — Type Layout: https://doc.rust-lang.org/reference/type-layout.html
- [2] Rust Reference — ABI: https://doc.rust-lang.org/reference/abi.html
- [3] Rust RFC 2603 — v0 Symbol Mangling: https://rust-lang.github.io/rfcs/2603-rust-symbol-name-mangling-v0.html
- [4] Rust RFC 2945 — C Unwind ABI: https://rust-lang.github.io/rfcs/2945-c-unwind-abi.html
- [5] Rustonomicon — Unwinding: https://doc.rust-lang.org/nomicon/unwinding.html
- [6] rustc Book — Symbol Mangling: https://doc.rust-lang.org/rustc/symbol-mangling/index.html
- [7] Purplesyringa — Rust's v0 mangling scheme in a nutshell: https://purplesyringa.moe/blog/rusts-v0-mangling-scheme-in-a-nutshell
- [8] rustfilt crate: https://crates.io/crates/rustfilt
- [9] rustc-demangle crate: https://crates.io/crates/rustc-demangle
- [10] FuzzingLabs — Reversing Modern Binaries: https://fuzzinglabs.com/reversing-modern-binaries
- [11] MIT — Rust Type Layout Reference: https://web.mit.edu/rust-lang_v1.25/arch/amd64_ubuntu1404/share/doc/rust/html/reference/type-layout.html
- [12] Rust Performance Book — Heap Allocations: https://nnethercote.github.io/perf-book/heap-allocations.html
- [13] Rust std::rc::Rc documentation: https://doc.rust-lang.org/std/rc/struct.Rc.html
- [14] Rust std::collections::HashMap: https://doc.rust-lang.org/std/collections/struct.HashMap.html
- [15] 0xAtticus — Niche Optimizations in Rust: https://www.0xatticus.com/posts/understanding_rust_niche/
- [16] Stack Overflow — Niche optimization for enum in Rust: https://stackoverflow.com/questions/76429517
- [17] Rust std::panic: https://doc.rust-lang.org/std/macro.panic.html
- [18] Amrit Singh — Mastering Rust's Trait Objects: https://amritsingh183.github.io/rust/concepts/2025/10/23/rust-dyn.html
- [19] JPCERT/CC — Study of Binaries Created with Rust: https://github.com/JPCERTCC/rust-binary-analysis-research-en
- [20] Kobzol — Making Rust binaries smaller by default: https://kobzol.github.io/rust/cargo/2024/01/23/making-rust-binaries-smaller-by-default.html
- [21] JPCERT/CC Blog — Rust Binary Analysis: https://blogs.jpcert.or.jp/en/2026/03/rust_research_en.html
- [22] Travis Mathison — How Rust's Ownership Model Affects Malware RE: https://tdmathison.github.io/posts/How-rusts-ownership-model-affects-malware-re/
- [23] Clawgrc — Reverse Engineering Rust Malware: https://clawgrc.com/skills/reverse-engineering-rust-malware
- [24] IDARustler — IDA Plugin for Rust: https://github.com/r3dhun9/IDARustler
- [25] Hacking Rust — Full RE Tutorial: https://github.com/mytechnotalent/Hacking-Rust
- [26] Rust std::panic::catch_unwind: https://doc.rust-lang.org/std/panic/fn.catch_unwind.html
- [27] Atharva Pandey — Future Internals: https://www.atharvapandey.com/post/rust/rust-runtime-future-internals
- [28] Tokio Tutorial — Async in Depth: https://tokio.rs/tokio/tutorial/async
- [29] Alexander Obregon — Trait Objects and Dynamic Dispatch: https://alexanderobregon.substack.com/p/trait-objects-in-rust-and-the-mechanics
- [30] FuzzingLabs Training — Rust & Go Analysis: https://academy.fuzzinglabs.com/reversing-modern-binaries-practical-rust-go-analysis

### Python

- [31] pyinstxtractor: https://github.com/extremecoders-re/pyinstxtractor
- [32] pyinstxtractor-ng: https://github.com/pyinstxtractor/pyinstxtractor-ng
- [33] uncompyle6: https://github.com/rocky/python-uncompyle6
- [34] pycdc (Decompyle++): https://github.com/zrax/pycdc
- [35] Nuitka: https://github.com/Nuitka/Nuitka
- [36] Nuitka-Dumper: https://github.com/4equest/Nuitka-Dumper
- [37] Reverse Engineering Cython — Blog: https://frederickalt.github.io/blog/reversing-cython-binaries-with-ai/
- [38] Stack Overflow — Decompile Cython extension: https://stackoverflow.com/questions/71269170
- [39] PEP 552 — Deterministic pycs: https://peps.python.org/pep-0552
- [40] Python `dis` module: https://docs.python.org/3/library/dis.html
- [41] pyc2bytecode: https://github.com/knight0x07/pyc2bytecode
- [42] CPython Type Objects: https://docs.python.org/3/c-api/typeobj.html
- [43] CPython PyArg_ParseTuple: https://docs.python.org/3/c-api/arg.html
- [44] PyArmor Static Unpack 1shot: https://github.com/Lil-House/Pyarmor-Static-Unpack-1shot
- [45] PyArmor: https://pyarmor.dashingsoft.com/
