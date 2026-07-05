---
type: fact
title: "Zend Engine Internals - zval, Type System, Request Lifecycle, COW"
---

# Zend Engine Internals

Source: PHP source (Zend/), PHP Internals Book (phpinternalsbook.com), Nikita Popov's blog posts, Dmitry Stogov's presentations.

## Zend Engine Overview

```
PHP code execution pipeline:

Source Code (.php)
    ↓ Lexer (zend_language_scanner.l)
Token Stream
    ↓ Parser (zend_language_parser.y)
Abstract Syntax Tree (AST)
    ↓ Compiler (zend_compile.c)
OPcodes (zend_op_array)
    ↓ Executor (zend_vm_execute.h) [or JIT-compiled native code]
Result

OPcache caches the compiled opcodes, skipping lexer/parser/compiler on subsequent requests.
JIT compiles hot opcodes to native machine code, skipping the VM interpreter.
```

## zval (Zend Value) - The Core Data Structure

```c
// Simplified zval struct (PHP 8.x, 16 bytes on 64-bit)
typedef struct _zval_struct {
    zend_value value;          // 8 bytes: union of actual data
    union {
        uint32_t type_info;    // type + flags
        struct {
            uint8_t type;      // IS_UNDEF, IS_NULL, IS_FALSE, IS_TRUE, IS_LONG, IS_DOUBLE, IS_STRING, IS_ARRAY, IS_OBJECT, IS_RESOURCE, IS_REFERENCE
            uint8_t type_flags;
            union {
                uint16_t extra;
            } u;
        } v;
    } u1;
    union {
        uint32_t next;         // hash collision chain
        uint32_t cache_slot;   // runtime cache slot
        uint32_t opline_num;
        uint32_t lineno;
        uint32_t num_args;
        uint32_t fe_pos;       // foreach position
        uint32_t fe_iter_idx;
        uint32_t guard;        // recursion guard
        uint32_t constant_flags;
    } u2;                      // 4 bytes: context-dependent extra data
} zval;

// zend_value union (8 bytes)
typedef union _zend_value {
    zend_long   lval;     // IS_LONG (int)
    double      dval;     // IS_DOUBLE (float)
    zend_string *str;     // IS_STRING
    zend_array  *arr;     // IS_ARRAY
    zend_object *obj;     // IS_OBJECT
    zend_resource *res;   // IS_RESOURCE
    zend_reference *ref;  // IS_REFERENCE
    // ... others
} zend_value;
```

### Key Insights

```
- zval is ALWAYS 16 bytes (stack-allocated in most cases since PHP 7)
- Simple types (null, bool, int, float) stored directly in zval (no heap allocation)
- Complex types (string, array, object) store pointer to heap-allocated structure
- zvals are NOT reference-counted themselves (since PHP 7)
- The POINTED-TO structures (zend_string, zend_array, etc.) are reference-counted
- This means: $a = $b copies the zval (16 bytes), increments refcount on pointed data
```

## Reference Counting & Copy-on-Write (COW)

### How COW Works

```
$a = [1, 2, 3];
// zend_array allocated on heap, refcount=1, $a's zval points to it

$b = $a;
// $b's zval copies pointer, refcount becomes 2. NO array copy yet.

$b[] = 4;
// refcount > 1, so: duplicate the array (COW separation)
// $b now points to new array with refcount=1
// $a still points to original with refcount=1 (decremented from 2)
```

### Reference Counting Rules

```c
// Counted types (heap-allocated, have refcount):
// - zend_string (IS_STRING)
// - zend_array (IS_ARRAY)
// - zend_object (IS_OBJECT, but different: always refcount, never COW)
// - zend_resource (IS_RESOURCE)
// - zend_reference (IS_REFERENCE)

// Non-counted (embedded in zval, no heap):
// - IS_UNDEF, IS_NULL, IS_FALSE, IS_TRUE, IS_LONG, IS_DOUBLE
// - Interned strings (shared, permanent, never freed)

// Object semantics: Objects ALWAYS pass by handle (like Java references)
// $a = new Foo(); $b = $a; → both point to same object, refcount=2
// $b->x = 5; → modifies same object (no COW for objects!)
// This is different from arrays (which COW).
```

### Interned Strings

```
Interned strings = deduplicated, permanent strings (never freed, never refcounted).
Used for: variable names, function names, class names, string literals in source code.

OPcache extends this: strings are interned in shared memory (SHM),
shared across ALL PHP-FPM workers. Huge memory saving.

opcache.interned_strings_buffer=32  → 32MB for interned strings in SHM
```

## PHP Type System (Internal)

### Type Flags

| Constant | Value | Notes |
|----------|-------|-------|
| IS_UNDEF | 0 | Uninitialized |
| IS_NULL | 1 | null |
| IS_FALSE | 2 | false (separate from true since PHP 8) |
| IS_TRUE | 3 | true |
| IS_LONG | 4 | Integer (64-bit on 64-bit platform) |
| IS_DOUBLE | 5 | Float (IEEE 754 double) |
| IS_STRING | 6 | zend_string pointer |
| IS_ARRAY | 7 | HashTable pointer |
| IS_OBJECT | 8 | zend_object pointer |
| IS_RESOURCE | 9 | zend_resource pointer (deprecated pattern) |
| IS_REFERENCE | 10 | zend_reference wrapper (for &$ref) |

### Type Coercion (strict_types impact)

```php
declare(strict_types=1);
// Engine checks: actual type must match declared type EXACTLY
// No silent int→float, string→int, etc.
// TypeError thrown on mismatch

// Without strict_types (default, coercive mode):
// Engine applies "preferred type" coercion:
// int context: "123" → 123, "12abc" → 12 + E_WARNING, "abc" → TypeError
// float context: "1.5" → 1.5, int → float (lossless)
// string context: int/float → string representation
// bool context: 0/""/[]/null → false, everything else → true
```

## Request Lifecycle (SAPI Lifecycle)

```
PHP Process Start (once per FPM worker / CLI execution):
┌─────────────────────────────────────────────────┐
│ MINIT (Module Init) - each extension             │
│ - Register classes, functions, constants          │
│ - Allocate persistent resources                   │
│ - OPcache: map shared memory segment             │
└─────────────────────────────────────────────────┘
         ↓ (for each request in FPM)
┌─────────────────────────────────────────────────┐
│ RINIT (Request Init) - each extension             │
│ - Initialize request-scoped globals               │
│ - Reset error state                               │
│ - Start output buffering                          │
│ - Session: read session data                      │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│ Script Execution                                  │
│ - Compile (or fetch from OPcache)                │
│ - Execute opcodes                                │
│ - All userland PHP runs here                     │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│ RSHUTDOWN (Request Shutdown) - each extension     │
│ - Destroy request-scoped variables               │
│ - Session: write session data                     │
│ - Flush output buffers                            │
│ - Run object destructors (__destruct)            │
│ - Free all request memory (ZMM reset)            │
│ - GC cycle collector runs if needed              │
└─────────────────────────────────────────────────┘
         ↓ (loop back to RINIT for next request)
┌─────────────────────────────────────────────────┐
│ MSHUTDOWN (Module Shutdown) - worker exit         │
│ - Free persistent resources                       │
│ - Unregister extensions                          │
│ - OPcache: unmap shared memory                   │
└─────────────────────────────────────────────────┘
```

### Long-Running Implications

```
In Swoole/RoadRunner/FrankenPHP worker mode:
- MINIT runs ONCE when worker starts
- RINIT/RSHUTDOWN may or may NOT run between requests (depends on runtime)
- ZMM does NOT reset between requests (memory persists!)
- Static variables, global state, singletons ALL persist
- Object destructors may run at unexpected times
- YOU must manually reset state (framework container reset)

This is why memory leaks accumulate in long-running PHP:
- FPM: ZMM resets after RSHUTDOWN → all request memory freed
- Long-running: ZMM never resets → leaked refs grow forever
```

## zend_array (HashTable) Internals

```c
// PHP arrays are ordered hash tables (unique in language design)
typedef struct _zend_array {
    zend_refcounted_h gc;          // refcount + type info
    union {
        struct {
            uint8_t flags;
            uint8_t nApplyCount;   // recursion guard
            uint8_t nIteratorsCount;
            uint8_t consistency;
        } v;
        uint32_t flags;
    } u;
    uint32_t nTableMask;           // hash table mask (power of 2 - 1, negated)
    Bucket *arData;                // array of Bucket entries (contiguous)
    uint32_t nNumUsed;             // slots used (including deleted)
    uint32_t nNumOfElements;       // actual live elements
    uint32_t nTableSize;           // total capacity (power of 2)
    uint32_t nInternalPointer;     // current() position
    zend_long nNextFreeElement;    // next integer key
} zend_array;

// Bucket = hash entry
typedef struct _Bucket {
    zval val;                      // the value (inline, not pointer)
    zend_ulong h;                  // hash of key
    zend_string *key;              // string key (NULL for integer keys)
} Bucket;
```

### Array Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Lookup by key | O(1) average | Hash collision → O(n) worst case |
| Append (numeric) | O(1) amortized | Doubles capacity when full |
| Insert with string key | O(1) average | + hash computation |
| Delete | O(1) | Marks as IS_UNDEF, doesn't compact |
| Iteration (foreach) | O(n) | Sequential scan of arData |
| Packed array (0,1,2...) | O(1) | No hash table, direct index |
| Count | O(1) | Stored in nNumOfElements |

### Packed vs Hash Arrays

```
Packed array (optimized): sequential integer keys starting from 0
- No hash table overhead
- Direct index access: arData[key]
- Triggered by: range(), array_values(), [1,2,3]

Hash array: string keys or non-sequential integers
- Full hash table with collision chains
- More memory (hash table + collision links)
- Triggered by: ['a'=>1], non-sequential keys, unset() in middle
```

## zend_object Internals

```c
typedef struct _zend_object {
    zend_refcounted_h gc;
    uint32_t handle;               // object ID (unique per request)
    zend_class_entry *ce;          // class definition pointer
    const zend_object_handlers *handlers; // method table
    HashTable *properties_table;   // dynamic properties (deprecated in 8.2+)
    zval properties_table[1];      // inline declared properties (C flexible array)
} zend_object;
```

### Object vs Array Semantics

```
Arrays: value semantics + COW
  $a = [1,2,3]; $b = $a; $b[] = 4; // $a unchanged

Objects: reference semantics (always)
  $a = new Foo(); $b = $a; $b->x = 5; // $a->x is also 5
  // $a and $b are different zvals pointing to SAME zend_object
  // Only `clone` creates a new object
```

## Execution Context

### Execution Frames (Call Stack)

```c
// Each function call creates a zend_execute_data on the VM stack
typedef struct _zend_execute_data {
    const zend_op *opline;         // current instruction
    zend_function *func;           // current function
    zval This;                     // $this
    zval *return_value;            // where to write return
    zend_execute_data *prev_execute_data; // caller frame
    zend_array *symbol_table;      // local variables (NULL for compiled code)
    // ... compiled variables (CVs) follow inline
} zend_execute_data;
```

### VM Stack (separate from C stack)

```
PHP uses its own VM stack (zend_vm_stack), not the C stack.
Default size: 256KB (configurable via zend.max_allowed_stack_size in 8.3+)

Each function call: push execute_data + local variables on VM stack
Function return: pop frame, restore previous execute_data

Implication: deep recursion hits VM stack limit, not OS stack limit.
PHP 8.3+: zend.max_allowed_stack_size configures this.
```

## Performance Implications

| Understanding | Optimization |
|---------------|-------------|
| zval is 16 bytes, stack-allocated | Passing by value is cheap for simple types |
| COW for arrays | Don't fear assignments; avoid unnecessary references |
| Objects never COW | Clone explicitly when needed; object pass = handle copy only |
| Packed arrays | Use sequential integer keys when possible |
| Interned strings | Literal strings in code = free (shared, no alloc) |
| ZMM per-request reset | In FPM, all memory freed at request end (no manual free needed) |
| VM stack for calls | Deep recursion is bounded; use iteration for large depth |
| OPcache SHM | Compiled code shared across workers (near-zero compile cost) |

## Common Misconceptions

| Myth | Reality |
|------|---------|
| "PHP copies arrays on assignment" | No. COW: only copies on write. Assignment = refcount++ |
| "Objects are passed by reference" | No. Object HANDLE is passed by value. Both variables point to same object. |
| "& references are faster" | No. References PREVENT COW optimization and add indirection. Slower in most cases. |
| "unset() frees memory" | It decrements refcount. Memory freed only when refcount=0 AND GC runs or request ends. |
| "PHP leaks memory" | In FPM: impossible (ZMM reset). In long-running: yes, if you accumulate refs. |
| "Arrays are linked lists" | No. Ordered hash table with contiguous bucket storage. Cache-friendly iteration. |
| "PHP is always slow" | OPcache + JIT + preloading + long-running = competitive with Node.js for I/O-bound work |
