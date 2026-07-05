---
type: subskill
title: "PHP Performance Subskill"
---

# PHP Performance Subskill

## Activation Triggers
- OPcache, JIT, preloading, slow queries, N+1, profiling, caching, memory leak
- "Why is this slow", "optimize", "benchmark", performance tuning

## Senior DNA
- Measure before optimizing. Profile first, guess never.
- OPcache is the single biggest win for any PHP app. JIT rarely matters for web.
- N+1 queries are the #1 performance killer in PHP apps.
- APCu for local hot data, Redis for shared state. Never cache what's cheap to compute.

---

## OPcache Production Config

```ini
; /etc/php/conf.d/opcache.ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=65536
opcache.validate_timestamps=0          ; NEVER check file mtime in prod
opcache.save_comments=1                ; needed for annotations/attributes
opcache.enable_file_override=1
opcache.huge_code_pages=1              ; requires OS hugepages configured
opcache.interned_strings_buffer=32
```

Deploy strategy: restart PHP-FPM or call `opcache_reset()` via deploy hook.

`validate_timestamps=0` means file changes are invisible until restart. This is correct for production.

### OPcache Internals

```
How OPcache works:

Without OPcache:
  Request → Lexer → Parser → Compiler → Execute → Discard opcodes

With OPcache:
  First request: Lexer → Parser → Compiler → Store in SHM → Execute
  Subsequent:    Lookup in SHM → Execute (skip compile entirely)

Shared Memory (SHM) structure:
┌────────────────────────────────────────────────┐
│ OPcache SHM (opcache.memory_consumption MB)     │
├────────────────────────────────────────────────┤
│ Script entries (hash table: path → op_array)    │
│ Op arrays (compiled functions/methods)          │
│ Class entries (compiled class definitions)      │
│ Interned strings (deduplicated string literals) │
│ File cache index                                │
└────────────────────────────────────────────────┘

All FPM workers share the SAME SHM segment (mmap).
Result: 50-100 workers share one copy of compiled code.
Without OPcache: each worker compiles independently (waste).
```

### OPcache Key Behaviors

| Behavior | Detail |
|----------|--------|
| File identity | Keyed by realpath (symlinks resolved) |
| Invalidation | `validate_timestamps=1`: check mtime per `revalidate_freq` seconds |
| SHM full | New scripts not cached; `opcache_reset()` or restart needed |
| Restart types | Graceful (OOM), forced (hash table full), scheduled (via API) |
| Interned strings | String literals shared across all scripts in SHM |
| File cache | `opcache.file_cache=/tmp/opcache` secondary disk cache (cold start) |
| Preloading | Classes/functions loaded into SHM at startup, can't be modified |
| Huge pages | `opcache.huge_code_pages=1` uses 2MB pages (less TLB misses) |

### OPcache Monitoring

```php
// Production monitoring
$status = opcache_get_status(false); // false = don't include per-script data
$stats = $status['opcache_statistics'];

// Key metrics to monitor:
$stats['num_cached_scripts'];     // scripts in cache
$stats['opcache_hit_rate'];       // should be >99% in production
$stats['oom_restarts'];           // OOM → increase memory_consumption
$stats['hash_restarts'];          // hash full → increase max_accelerated_files
$stats['manual_restarts'];        // opcache_reset() calls

$memory = $status['memory_usage'];
$memory['used_memory'];           // current SHM used
$memory['free_memory'];           // available SHM
$memory['wasted_memory'];         // invalidated but not freed (needs restart)
// If wasted > 10%: too many deploys without restart, or max_wasted_percentage too high
```

---

## JIT Compiler (PHP 8.0+)

```ini
opcache.jit=1255                       ; tracing mode (best general performance)
opcache.jit_buffer_size=128M
```

Mode breakdown: `1255` = use AVX, tracing JIT, optimize all functions, full optimization.

**When JIT helps**: CPU-bound math, image processing, ML inference, tight loops.
**When JIT doesn't help**: Typical web apps (I/O-bound - waiting on DB/Redis/HTTP).

Rule: If your app spends 90% waiting on I/O, JIT gives <5% improvement. Don't bother.

### JIT Internals

```
JIT compilation pipeline:

1. OPcache compiles PHP to opcodes (bytecode)
2. JIT observes execution (tracing mode counts loop iterations + call frequency)
3. Hot code detected → JIT compiles opcodes to native machine code (x86-64/ARM64)
4. Subsequent executions of hot path: run native code directly (bypass VM)

JIT uses DynASM (LuaJIT's assembler) - NOT LLVM.
Result: fast compilation (< 1ms per function), decent optimization.

JIT modes (opcache.jit CRTO format):
  C = CPU-specific optimizations (0=none, 1=AVX)
  R = register allocation (0=none, 1=local, 2=root/global)
  T = trigger (0=VM handler, 1=function entry, 2=loop entry, 3=return, 4=hot counter, 5=tracing)
  O = optimization level (0=none, 1=minimal, 2=optimized, 3=inline, 4=inline+type inference, 5=full)

Common configs:
  1255 = tracing (best general - profiles then compiles hot traces)
  1235 = function (compiles whole functions, not traces)
  disable = 0 or opcache.jit_buffer_size=0
```

### JIT vs OPcache Performance

```
Without OPcache: 1x (baseline - compile every request)
With OPcache:    5-10x (skip compilation)
With OPcache+JIT: 5-15x for CPU-bound, 5-10x for I/O-bound

For typical web apps: OPcache is 95% of the win.
JIT adds 1-5% for web (maybe 2x-4x for CPU-bound like mandelbrot).
```

### JIT Debugging

```php
// Check JIT status
$status = opcache_get_status();
$jit = $status['jit'];
$jit['enabled'];          // JIT active?
$jit['on'];               // JIT producing code?
$jit['opt_level'];        // optimization level
$jit['buffer_size'];      // allocated buffer
$jit['buffer_free'];      // free buffer space

// If buffer_free is low: increase jit_buffer_size or hot code is too large
// JIT disabled on OOM: check opcache.jit_buffer_size

// Debug: dump JIT output
opcache.jit_debug=0x01    // output generated assembly (dev only)
```

---

## Preloading (PHP 7.4+)

```ini
opcache.preload=/app/preload.php
opcache.preload_user=www-data
```

```php
// preload.php
$files = array_merge(
    glob('/app/src/Domain/**/*.php'),
    glob('/app/src/Application/**/*.php'),
);
foreach ($files as $file) {
    opcache_compile_file($file);
}
```

Preload: domain models, value objects, interfaces, hot service classes.
Don't preload: controllers (too many), test files, dev-only code.

Caveat: Preloaded classes cannot be changed without FPM restart.

---

## Memory Management

PHP uses ZMM (Zend Memory Manager) - allocated memory is NOT returned to OS until process dies.

```php
// Generators for large datasets - O(1) memory
function readLargeFile(string $path): Generator {
    $handle = fopen($path, 'r');
    while (($line = fgets($handle)) !== false) {
        yield $line;
    }
    fclose($handle);
}

// WeakMap - no memory leaks in caches tied to object lifecycle
$cache = new WeakMap();
$cache[$entity] = computeExpensiveResult($entity);
// When $entity is GC'd, cache entry disappears automatically

// Force GC in long-running processes
gc_collect_cycles();
gc_mem_caches();
```

FPM: set `pm.max_requests=1000` to recycle workers and reclaim leaked memory.

---

## Database Query Optimization

```php
// N+1 detection - eager load relationships
$users = User::with(['posts', 'posts.comments'])->get(); // 3 queries, not 1+N+N*M

// Use EXPLAIN
DB::listen(fn($query) => logger()->debug($query->sql, $query->bindings));

// Index usage - composite indexes match leftmost prefix
// INDEX(status, created_at) works for WHERE status=? AND created_at>?
// Does NOT work for WHERE created_at>? alone
```

Rules:
- Every WHERE/JOIN/ORDER BY column needs an index (or composite)
- Use `EXPLAIN ANALYZE` to verify index usage
- Paginate with cursor (WHERE id > ?) not OFFSET

---

## Profiling Tools

| Tool | Use Case | Overhead |
|------|----------|----------|
| Blackfire | Production profiling, CI assertions | ~2% always-on |
| Xdebug (mode=profile) | Dev callgrind generation | Heavy, dev only |
| Tideways | Production APM, trace sampling | ~1% |
| SPX | Quick local profiling, web UI | Dev only |

```ini
; Xdebug profiling (dev only)
xdebug.mode=profile
xdebug.output_dir=/tmp/xdebug
xdebug.profiler_output_name=cachegrind.out.%R
```

---

## Caching Strategies

| Layer | Tool | Scope | TTL |
|-------|------|-------|-----|
| Bytecode | OPcache | Per-worker | Until restart |
| Local data | APCu | Per-server | Seconds-minutes |
| Shared data | Redis/Memcached | Cluster-wide | Minutes-hours |
| HTTP | Varnish/CDN | Edge | Varies |

```php
// APCu - fast local cache (shared memory, single server)
$value = apcu_fetch('key', $hit);
if (!$hit) {
    $value = expensive_computation();
    apcu_store('key', $value, 300);
}

// PSR-6/PSR-16 for portable caching
$item = $cache->getItem('stats');
if (!$item->isHit()) {
    $item->set(computeStats())->expiresAfter(3600);
    $cache->save($item);
}
```

Never cache what's cheap. Cache what's slow AND accessed often AND tolerates staleness.

---

## Long-Running Performance (Swoole/RoadRunner/FrankenPHP/Workerman)

> When using application servers, think like a Go developer: memory is YOUR responsibility, goroutines = coroutines, every resource must be explicitly managed.

### Mindset Shift (FPM → Long-Running)

| FPM (die after request) | Long-Running (persist) |
|-------------------------|----------------------|
| Memory freed automatically | Memory leaks accumulate forever |
| Connections created per request | Connections pooled and reused |
| Static state reset each time | Static state persists (DANGER) |
| No concurrency within request | Coroutines/fibers enable intra-request concurrency |
| OPcache = main win | Bootstrap elimination = main win |
| Profiling: Xdebug/Blackfire | + memory_get_usage() monitoring per worker |

### Swoole Concurrency Mechanisms

```php
use Swoole\Coroutine;
use Swoole\Coroutine\WaitGroup;
use Swoole\Coroutine\Channel;

// --- Parallel I/O (like Go's errgroup) ---
$wg = new WaitGroup();
$results = [];

$wg->add();
Coroutine::create(function () use ($wg, &$results) {
    $results['users'] = $this->db->query('SELECT * FROM users LIMIT 100');
    $wg->done();
});

$wg->add();
Coroutine::create(function () use ($wg, &$results) {
    $results['orders'] = $this->http->get('https://api.orders.com/recent');
    $wg->done();
});

$wg->wait(5.0); // timeout 5s - like context.WithTimeout in Go

// --- Channel (like Go channels) ---
$chan = new Channel(10); // buffered channel, size 10

Coroutine::create(function () use ($chan) {
    for ($i = 0; $i < 100; $i++) {
        $chan->push($i); // blocks when full (backpressure)
    }
    $chan->close();
});

Coroutine::create(function () use ($chan) {
    while ($data = $chan->pop()) { // blocks when empty
        processItem($data);
    }
});

// --- Connection Pool (like sync.Pool in Go) ---
$pool = new Channel(20); // pool of 20 connections
for ($i = 0; $i < 20; $i++) {
    $pool->push(new PDO($dsn));
}

// Borrow
$conn = $pool->pop(3.0); // timeout 3s, returns false if empty
try {
    $result = $conn->query($sql);
} finally {
    $pool->push($conn); // ALWAYS return - like defer in Go
}

// --- Semaphore (bounded concurrency) ---
$sem = new Channel(5); // max 5 concurrent

foreach ($urls as $url) {
    $sem->push(true); // acquire
    Coroutine::create(function () use ($url, $sem) {
        try {
            $this->fetch($url);
        } finally {
            $sem->pop(); // release - like defer sem.Release() in Go
        }
    });
}
```

### Workerman Concurrency

```php
use Workerman\Worker;
use Workerman\Timer;
use Workerman\Connection\AsyncTcpConnection;

// Multi-process (not coroutine - process-based like PHP-FPM but persistent)
$worker = new Worker('http://0.0.0.0:8080');
$worker->count = cpu_count() * 2; // worker processes

// Async HTTP request (event-driven, non-blocking)
$worker->onMessage = function ($connection, $request) {
    // Non-blocking external call
    $http = new AsyncTcpConnection('tcp://api.example.com:80');
    $http->onConnect = function ($http) {
        $http->send("GET /data HTTP/1.1\r\nHost: api.example.com\r\n\r\n");
    };
    $http->onMessage = function ($http, $response) use ($connection) {
        $connection->send($response); // reply to original client
        $http->close();
    };
    $http->connect();
};

// Timer (like Go's time.Ticker)
Timer::add(60, function () {
    cleanupExpiredSessions();
});
```

### Memory Management Rules (applies to ALL long-running servers)

```php
// 1. NEVER accumulate in static/class properties
class BadService {
    private static array $cache = []; // GROWS FOREVER across requests
}

// 2. Reset container state between requests (framework-specific)
// Laravel Octane: handled automatically
// Symfony Runtime: handled via kernel.reset event
// Raw Swoole: manual reset in onRequest

// 3. Monitor per-worker
$server->on('workerStart', function ($server, $workerId) {
    Timer::tick(60000, function () use ($workerId) {
        $mem = memory_get_usage(true) / 1024 / 1024;
        if ($mem > 200) { // 200MB threshold
            // Log and graceful restart
            exit(0); // worker manager auto-restarts
        }
    });
});

// 4. Connection health check before use
function getConnection(Channel $pool): PDO {
    $conn = $pool->pop(1.0);
    if ($conn === false) throw new RuntimeException('Pool exhausted');
    try {
        $conn->query('SELECT 1'); // ping
        return $conn;
    } catch (PDOException) {
        return new PDO($dsn); // reconnect
    }
}
```

### Performance Comparison (measured)

| Runtime | Req/sec (JSON API) | Latency p99 | Memory/worker |
|---------|-------------------|-------------|---------------|
| PHP-FPM | ~2,000-5,000 | 5-20ms | 30-50MB (dies) |
| FrankenPHP | ~8,000-15,000 | 2-8ms | 50-100MB |
| RoadRunner | ~8,000-15,000 | 2-8ms | 50-100MB |
| Swoole | ~20,000-50,000 | <1-3ms | 50-100MB |
| Workerman | ~15,000-30,000 | 1-5ms | 40-80MB |

**Rule**: Numbers depend heavily on app complexity. These are ballpark for simple JSON API on modern hardware. Always benchmark YOUR app.
