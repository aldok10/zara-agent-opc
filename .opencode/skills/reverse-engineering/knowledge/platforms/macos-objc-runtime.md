# Objective-C Runtime Internals and Name Decoding

TL;DR: ObjC runtime structures (objc_msgSend dispatch, class_ro_t/class_rw_t,
method_t, categories, protocols), method swizzling detection, message forwarding,
and ObjC name decoding (selector format, reconstructing msgSend calls from
disassembly, __objc_selrefs, class/protocol references).

See also: macos-swift-runtime-abi.md, macos-fairplay-app-analysis.md, macos-lldb-re-workflow.md, macos-kernel-antire-dtrace.md

---

## 3. Objective-C Runtime

Objective-C is a dynamic language. Method calls are **messages** resolved at
runtime via `objc_msgSend`. The runtime structures embedded in the binary
are the reverse engineer's primary source of method/class/ivar information
[3][7][22].

### 3.1 The objc_msgSend Dispatch

Every ObjC method call `[receiver message:arg]` compiles to:

```asm
; x86_64: receiver in RDI, selector in RSI, args in RDX, RCX, R8, R9
mov    rdi, qword [receiver_ptr]  ; self
mov    rsi, @selector(message:)   ; sel
mov    rdx, arg1                  ; first arg (if any)
call   _objc_msgSend

; ARM64: receiver in X0, selector in X1, args in X2-X7
ldr    x0, [receiver_ptr]
adrp   x1, [sel_message:]@page
add    x1, x1, [sel_message:]@pageoff
mov    x2, arg1
bl     _objc_msgSend
```

`objc_msgSend` does:
1. Check `receiver` for nil (returns nil/zero if nil)
2. Read the class pointer via `isa` (`[receiver class]`)
3. Look up the selector in the class's method cache (optimized hash table)
4. Miss: walk the method list → superclass chain → resolve → forward
5. Call the IMP (function pointer)

### 3.2 Class Structure

Modern Objective-C defines class metadata in two zones: **read-only** (clean,
pageable) and **read-write** (dirty, always resident) [23]:

```c
// Clean memory — paged out, never modified after load
struct class_ro_t {
    uint32_t flags;
    uint32_t instanceStart;
    uint32_t instanceSize;
    uint32_t reserved;       // for alignment
    const uint8_t *ivarLayout;
    const char *name;        // class name string
    method_list_t *baseMethods;  // method list
    protocol_list_t *baseProtocols;
    ivar_list_t *ivars;      // instance variable list
    const uint8_t *weakIvarLayout;
    property_list_t *baseProperties;
};

// Dirty memory — always resident, runtime mutates
struct class_rw_t {
    uint32_t flags;
    uint32_t version;
    class_ro_t *ro;           // pointer to read-only data
    method_array_t methods;    // methods (including categories)
    property_array_t properties;
    protocol_array_t protocols;
    Class firstSubclass;
    Class nextSiblingClass;
};
```

The visible `objc_class` (what `isa` points to):

```c
struct objc_class {
    Class isa;                          // metaclass pointer
    Class superclass;                   // parent class
    cache_t cache;                      // method cache (bucket ptr + mask + occupied)
    class_data_bits_t bits;             // contains class_rw_t * (fastpath)
};
```

The `bits` field uses bit packing. Extract the class_rw_t pointer:
```c
class_rw_t *data() {
    return (class_rw_t *)(bits & FAST_DATA_MASK);  // ~7 bit-aligned mask
}
```

To read at runtime via lldb:

```lldb
# Given an instance object $obj
# Get its class
po [0x12345 class]

# Read class_rw_t from an objc_class pointer
expr -l objc -O -- (struct class_rw_t *)(((uint64_t)[0x12345 class] + 0x20))

# Read class_ro_t fields
expr -l objc -O -- (struct class_ro_t *)(((uint64_t)[0x12345 class] + 0x20)->ro)
```

### 3.3 Method Lists and method_t

Each method is a `method_t` [3][22]:

```c
struct method_t {
    SEL name;       // selector (pointer to null-terminated string)
    const char *types; // type encoding string (e.g. "@24@0:8@16")
    IMP imp;        // function pointer (actual implementation)
};
```

`SEL` is just a unique string pointer (all selectors exist once in the runtime).

The type encoding encodes argument types:
- `@` = object (id)
- `#` = class (Class)
- `:` = SEL (selector)
- `v` = void
- `i` = int
- `f` = float
- `^v` = void*
- `?` = unknown/block

For a method `-(int)doSomething:(id)param`, the encoding is `i24@0:8@16`:
- `i`: return type (int)
- `24`: total size of arguments in bytes
- `@0`: object at offset 0 (self)
- `:8`: selector at offset 8
- `@16`: id param at offset 16

### 3.4 Categories

Categories add methods/properties/protocols to a class at runtime [3]:

```c
struct category_t {
    const char *name;
    Class cls;                          // class to extend
    method_list_t *instanceMethods;
    method_list_t *classMethods;
    protocol_list_t *protocols;
    property_list_t *instanceProperties;
    method_list_t *classProperties;
};
```

Categories are stored in `__DATA,__objc_catlist`. At runtime, the category
methods are attached to the class by `objc_loadCategories()`.

### 3.5 Protocols

```c
struct protocol_t {
    Class isa;
    const char *mangledName;
    protocol_list_t *protocols;          // adopted protocols
    method_list_t *instanceMethods;
    method_list_t *classMethods;
    method_list_t *optionalInstanceMethods;
    method_list_t *optionalClassMethods;
    property_list_t *instanceProperties;
    ...
};
```

Protocol metadata is emitted in `__DATA,__objc_protolist`.

### 3.6 Method Swizzling

Swizzling exchanges two method implementations at runtime [24]:

```objc
Method original = class_getInstanceMethod(cls, origSel);
Method swizzled = class_getInstanceMethod(cls, altSel);
method_exchangeImplementations(original, swizzled);
```

Detection via RE:
- Search for `method_exchangeImplementations` import
- Look for `class_getInstanceMethod` + `class_addMethod` patterns
- Runtime: enumerate method lists and compare IMP vs expected
- `dladdr()` on a method IMP can reveal the original dylib

### 3.7 Message Forwarding

When `objc_msgSend` can't find a method, it triggers the forwarding mechanism:

1. `+ (BOOL)resolveInstanceMethod:(SEL)sel` — ask the class to add one dynamically
2. `- (id)forwardingTargetForSelector:(SEL)aSelector` — redirect to another object
3. `- (NSMethodSignature *)methodSignatureForSelector:(SEL)` + `- (void)forwardInvocation:(NSInvocation *)` — full forwarding

In disassembly, look for overrides of these methods (especially in runtime
introspection frameworks like JSPatch or aspects).

---

## 5. Objective-C Name Mangling / Decoding

Objective-C method names are not mangled in the C++ sense — they are stored
as readable strings. But understanding the convention is essential for
reconstructing message sends from disassembly [7][22].

### 5.1 Method Name Format

```
-[ClassName methodName:]
```

A selector is a concatenation of method components with colons:

| Source | Selector |
|--------|----------|
| `- (void)foo` | `foo` |
| `- (void)setName:(NSString*)n` | `setName:` |
| `- (void)drawRect:(CGRect)r inContext:(CGContextRef)ctx` | `drawRect:inContext:` |

### 5.2 Reconstructing objc_msgSend Calls

Given assembly that calls `objc_msgSend`:

```asm
; ARM64 — send [self setTitle:@"Hello" forState:UIControlStateNormal]
ldr    x0, [x20, #0x10]            ; x0 = receiver (self)
adrp   x1, [sel_setTitle:forState:]@page   ; x1 = selector
add    x1, x1, [sel_setTitle:forState:]@pageoff
mov    x2, x21                      ; x2 = first arg ("Hello")
mov    w3, #0                       ; x3 = second arg (0 = UIControlStateNormal)
bl     _objc_msgSend
```

Reconstruction steps:
1. Identify the `bl _objc_msgSend` or `bl _objc_msgSend_stret`
2. Trace X0 (receiver): a stack/local variable or register holding the receiver
3. Trace X1 (selector): an `adrp+add` pair loading from `__objc_selrefs`
4. Trace X2-X7 (arguments): the actual method parameters
5. Read the selector string from the `__objc_selrefs` entry

At runtime with lldb:

```lldb
# Print the selector
po (SEL)$x1
# Or
po (const char *)$x1

# Print the receiver's class
po [$x0 class]

# Call the method manually
po [$x0 setTitle:@"Hello" forState:0]
```

### 5.3 The __objc_selrefs Section

`__objc_selrefs` in `__DATA` is an array of pointers to selector strings
residing in `__TEXT,__objc_methname`. Each entry is 8 bytes (pointer to a
`SEL`). Find references to selectors by locating `adrp+add` patterns that
load from `__objc_selrefs` relative to the data page.

### 5.4 Class Name and Protocol References

- `__objc_classrefs`: pointers to `objc_class` structs
- `__objc_classlist`: array of `Class` pointers (all classes defined by this binary)
- `__objc_protorefs`: protocol references
- `__objc_protolist`: protocol metadata list

### 5.5 Symbol Demangling

For C++ interoperability, ObjC symbols appear in `nm` output as:

```
$S4MyApp7MyClassC4funcS2SiF   (Swift name)
```

But symbols for pure ObjC classes are readable:
```
_OBJC_CLASS_$_MyViewController
_OBJC_METACLASS_$_MyViewController
_OBJC_IVAR_$_MyClass._ivarName
```
