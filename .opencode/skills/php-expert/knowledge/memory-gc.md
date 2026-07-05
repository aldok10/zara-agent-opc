---
type: fact
title: "PHP Memory Management & Garbage Collection"
---

# PHP Memory Management & Garbage Collection

Source: PHP Internals Book, Julien Pauli's memory management talks, PHP source (Zend/zend_alloc.c, Zend/zend_gc.c).

## Zend Memory Manager (ZMM)

### Architecture

```
Userland PHP code
    ↓ emalloc()/efree() (request-scoped)
    ↓ pemalloc()/pefree() (persistent, survives requests)
┌────────────────────────────────────────────┐
│ Zend Memory Manager (ZMM)                   │
│ - Request-bound allocator                   │
│ - Tracks all allocations for bulk free      │
│ - Provides memory_limit enforcement         │
│ - Debug mode: leak detection, overflow guard│
└────────────────────────────────────────────┘
    ↓ mmap() / malloc()
┌────────────────────────────────────────────┐
│ OS Memory (libc malloc / mmap)              │
└────────────────────────────────────────────┘
```

### Allocation Types

| Function | Scope | Freed When |
|----------|-------|-----------|
| `emalloc()` / `efree()` | Per-request | RSHUTDOWN (automatic) |
| `pemalloc()` / `pefree()` | Persistent | MSHUTDOWN (manual) |
| `safe_emalloc(n, size, offset)` | Per-request | Overflow-safe |
| `ecalloc()` | Per-request | Zero-initialized |
| `erealloc()` | Per-request | Resize |

### ZMM Internal Structure

```
ZMM uses a chunk-based allocator:

Chunk (2MB aligned via mmap)
├── Page 0: chunk header + free page bitmap
├── Page 1-511: data pages (4KB each)
│   ├── Small allocations: bin-sized (8, 16, 24, ..., 3072 bytes)
│   │   Pages divided into fixed-size slots
│   │   Free list per bin size
│   ├── Large allocations: 3073 bytes to 2MB-page_header
│   │   Allocated as contiguous pages within chunk
│   └── Huge allocations: > 2MB
│       Separate mmap per allocation (not in chunk)
└── Free pages tracked via bitmap

Size classes (bins): 30 sizes from 8 to 3072 bytes
- 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256,
  320, 384, 448, 512, 640, 768, 896, 1024, 1280, 1536, 1792, 2048, 2560, 3072

Allocation path:
1. Determine size class
2. Check free list for that bin → O(1) if available
3. Free list empty → allocate new page, divide into slots
4. No free pages → allocate new chunk (mmap 2MB)
```

### Memory Limit Enforcement

```php
// Set in php.ini or runtime
ini_set('memory_limit', '256M');

// ZMM tracks total allocated bytes
// Every emalloc checks: current + requested <= memory_limit
// Exceeds → fatal error: "Allowed memory size exhausted"

// Monitoring
memory_get_usage(false);     // ZMM allocated (emalloc'd, not freed)
memory_get_usage(true);      // Real memory from OS (includes ZMM overhead/fragmentation)
memory_get_peak_usage(false); // Peak ZMM usage this request
memory_get_peak_usage(true);  // Peak real memory this request
```

### Request End: Bulk Free

```
At RSHUTDOWN, ZMM doesn't free individual allocations.
Instead: entire chunks are returned to OS (munmap) or cached for next request.

This is why FPM "leaks" are impossible:
- Every request gets fresh ZMM state
- All emalloc'd memory is bulk-freed
- No manual free needed in request-scoped code

Exception: pemalloc (persistent) survives request boundaries.
Only used by: extension persistent resources (DB connections, etc.)
```

## Garbage Collection (Cycle Collector)

### Why PHP Needs GC

```
Reference counting handles most memory: refcount hits 0 → immediately freed.
Problem: circular references can never reach refcount 0.

Example:
$a = new stdClass();
$b = new stdClass();
$a->ref = $b;
$b->ref = $a;
unset($a, $b);
// Both objects have refcount=1 (from each other), never freed by refcounting alone.
// GC cycle collector breaks these cycles.
```

### Cycle Collector Algorithm

```
PHP uses a synchronous, mark-and-sweep cycle collector
based on the "Concurrent Cycle Collection in Reference Counted Systems" paper
(Bacon & Rajan, 2001). Simplified for single-threaded PHP.

Phase 1: Collect Possible Roots
- When refcount is decremented but doesn't reach 0
- AND the value is a potential container (array, object)
- → Added to "root buffer" (fixed size: 10,000 entries default)
- Root buffer full → trigger collection

Phase 2: Mark Roots (gc_mark_roots)
- For each root: simulate removing it
- Decrement refcounts of all children (mark grey)
- If any child reaches 0: it's only alive because of cycles

Phase 3: Scan Roots (gc_scan_roots)
- Traverse grey nodes
- If refcount > 0: still externally referenced → mark black (alive)
- If refcount == 0: only referenced by cycle → mark white (garbage)

Phase 4: Collect Roots (gc_collect_roots)
- Free all white (garbage) nodes
- Restore refcounts of black (alive) nodes

Color scheme:
- Purple: possible root (in root buffer)
- Grey: being scanned (refcount tentatively decremented)
- White: garbage (to be freed)
- Black: alive (externally referenced)
```

### GC Triggering

```
Automatic trigger: root buffer fills up (10,000 possible roots)
Manual trigger: gc_collect_cycles()

gc_enabled() → check if GC is active
gc_disable() → disable cycle collector (refcounting still works!)
gc_enable() → re-enable
gc_status() → returns stats array (PHP 7.3+):
  [
    'runs' => int,           // number of GC runs
    'collected' => int,      // total cycles collected
    'threshold' => int,      // current adaptive threshold
    'roots' => int,          // current root buffer count
    'running' => bool,       // GC currently executing?
    'protected' => bool,     // GC buffer protected?
    'full' => bool,          // root buffer full?
    'buffer_size' => int,    // root buffer capacity
  ]
```

### Adaptive Threshold (PHP 8.3+)

```
Problem: fixed 10,000 root buffer can trigger GC too often (large apps)
or too rarely (many small cycles).

PHP 8.3+: adaptive threshold
- Starts at 10,000
- After each GC run: adjusts based on effectiveness
- If GC collected many cycles: keep threshold low
- If GC collected few/none: increase threshold (less frequent GC)

zend.gc_threshold = 10001 (ini, 8.3+) → initial threshold
GC dynamically adjusts between 100 and 1,000,000 based on hit rate
```

### GC Performance Impact

```
GC pause time: typically 1-50ms depending on object graph size.
In production:
- Most FPM requests: GC never runs (request too short, buffer never fills)
- Long-running workers: GC runs periodically (monitor with gc_status())
- CPU-intensive apps: consider gc_disable() during hot loops, gc_enable() after

Measurement:
$before = hrtime(true);
$collected = gc_collect_cycles();
$duration = (hrtime(true) - $before) / 1_000_000; // ms
```

### GC Tuning for Long-Running

```php
// Pattern 1: Disable during hot loop, collect after
gc_disable();
foreach ($largeDataset as $item) {
    process($item); // no GC interruptions
}
gc_enable();
gc_collect_cycles(); // controlled collection point
gc_mem_caches();     // free ZMM cached pages

// Pattern 2: Periodic collection in worker
$server->on('request', function ($req, $res) {
    handleRequest($req, $res);

    // Every 100 requests, run GC explicitly
    static $counter = 0;
    if (++$counter % 100 === 0) {
        gc_collect_cycles();
        gc_mem_caches();
    }
});

// Pattern 3: Monitor and alert
$status = gc_status();
if ($status['runs'] > 100 && $status['collected'] < 10) {
    // GC running often but finding nothing → raise threshold or disable
    gc_disable();
}
```

## WeakMap and Weak References

### WeakReference (PHP 7.4+)

```php
$obj = new stdClass();
$weak = WeakReference::create($obj);

$weak->get(); // returns $obj
unset($obj);
$weak->get(); // returns null (object was garbage collected)

// Use case: caching without preventing GC
// Object is freed when no strong references exist
```

### WeakMap (PHP 8.0+)

```php
$cache = new WeakMap();
$entity = new User(id: 42);

$cache[$entity] = computeExpensiveResult($entity);
// Entry exists as long as $entity is alive

unset($entity);
// Cache entry automatically removed (no memory leak!)
// Unlike SplObjectStorage which keeps strong reference

// Use case: attaching metadata to objects without leaking
// Perfect for: ORMs (identity map), caches, event listeners
```

### Internals

```
WeakMap/WeakReference use the engine's weak reference mechanism:
- Object stores list of weak refs pointing to it
- When object is freed (refcount=0 OR GC cycle):
  All weak refs notified → set to null
- No prevent of GC (doesn't increment refcount)
- O(1) notification (linked list traversal)
```

## Memory Optimization Patterns

### Generators (O(1) Memory for Large Data)

```php
// BAD: loads entire file into memory
$lines = file('huge.csv'); // 1GB file = 1GB+ memory

// GOOD: generator, O(1) memory regardless of file size
function readCsv(string $path): Generator {
    $handle = fopen($path, 'r');
    try {
        while (($row = fgetcsv($handle)) !== false) {
            yield $row; // only 1 row in memory at a time
        }
    } finally {
        fclose($handle);
    }
}

foreach (readCsv('huge.csv') as $row) {
    process($row);
}
```

### Reducing Memory in Arrays

```php
// Packed arrays use less memory (no hash table)
$packed = [1, 2, 3, 4, 5]; // ~56 bytes overhead + 5×16 bytes
$hash = ['a' => 1, 'b' => 2]; // +hash table + string keys

// SplFixedArray for large numeric arrays (50% less memory)
$fixed = new SplFixedArray(1_000_000);
// No hash table, no resizing, direct index

// Typed properties reduce memory (no need for separate validation)
class Point {
    public function __construct(
        public readonly float $x,
        public readonly float $y,
    ) {}
}
```

### Avoiding Circular References

```php
// BAD: circular reference, needs GC
class Node {
    public ?Node $parent = null;
    public array $children = [];

    public function addChild(Node $child): void {
        $child->parent = $this; // circular: parent↔child
        $this->children[] = $child;
    }
}

// GOOD: WeakReference breaks cycle
class Node {
    private ?WeakReference $parentRef = null;
    public array $children = [];

    public function setParent(Node $parent): void {
        $this->parentRef = WeakReference::create($parent);
    }

    public function getParent(): ?Node {
        return $this->parentRef?->get();
    }
}
```

## Debugging Memory Issues

```php
// Track memory at key points
function memoryCheckpoint(string $label): void {
    static $last = 0;
    $current = memory_get_usage();
    $diff = $current - $last;
    error_log(sprintf('[MEM] %s: %.2f MB (+%.2f KB)',
        $label,
        $current / 1048576,
        $diff / 1024
    ));
    $last = $current;
}

// Detect leaks in long-running
function detectLeak(callable $task, int $iterations = 1000): void {
    gc_collect_cycles();
    $baseline = memory_get_usage();

    for ($i = 0; $i < $iterations; $i++) {
        $task();
    }

    gc_collect_cycles();
    $after = memory_get_usage();
    $leaked = $after - $baseline;

    if ($leaked > 1024) { // > 1KB growth
        echo "LEAK DETECTED: {$leaked} bytes over {$iterations} iterations\n";
        echo "Per iteration: " . ($leaked / $iterations) . " bytes\n";
    }
}
```

### php.ini Memory Settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `memory_limit` | 128M | Max emalloc per request |
| `realpath_cache_size` | 4M | Resolved path cache |
| `opcache.memory_consumption` | 128M | OPcache SHM |
| `opcache.interned_strings_buffer` | 8M | Interned strings SHM |
| `zend.gc_threshold` (8.3+) | 10001 | Initial GC root buffer trigger |

## FPM vs Long-Running Memory Comparison

| Aspect | FPM | Long-Running |
|--------|-----|-------------|
| Allocation | ZMM per-request | ZMM persists |
| Free | Bulk free at RSHUTDOWN | Manual / GC only |
| Leaks possible? | No (bulk free) | Yes (accumulation) |
| GC importance | Minimal (short requests) | Critical (run explicitly) |
| Static state | Reset each request | Persists forever |
| memory_limit | Per-request guard | Per-worker (less useful) |
| Circular refs | Freed at request end anyway | Must be broken or GC'd |
| Monitoring needed | Optional | Mandatory |
