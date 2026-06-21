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

---

## JIT Compiler (PHP 8.0+)

```ini
opcache.jit=1255                       ; tracing mode (best general performance)
opcache.jit_buffer_size=128M
```

Mode breakdown: `1255` = use AVX, tracing JIT, optimize all functions, full optimization.

**When JIT helps**: CPU-bound math, image processing, ML inference, tight loops.
**When JIT doesn't help**: Typical web apps (I/O-bound — waiting on DB/Redis/HTTP).

Rule: If your app spends 90% waiting on I/O, JIT gives <5% improvement. Don't bother.

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

PHP uses ZMM (Zend Memory Manager) — allocated memory is NOT returned to OS until process dies.

```php
// Generators for large datasets — O(1) memory
function readLargeFile(string $path): Generator {
    $handle = fopen($path, 'r');
    while (($line = fgets($handle)) !== false) {
        yield $line;
    }
    fclose($handle);
}

// WeakMap — no memory leaks in caches tied to object lifecycle
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
// N+1 detection — eager load relationships
$users = User::with(['posts', 'posts.comments'])->get(); // 3 queries, not 1+N+N*M

// Use EXPLAIN
DB::listen(fn($query) => logger()->debug($query->sql, $query->bindings));

// Index usage — composite indexes match leftmost prefix
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
// APCu — fast local cache (shared memory, single server)
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

$wg->wait(5.0); // timeout 5s — like context.WithTimeout in Go

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
    $pool->push($conn); // ALWAYS return — like defer in Go
}

// --- Semaphore (bounded concurrency) ---
$sem = new Channel(5); // max 5 concurrent

foreach ($urls as $url) {
    $sem->push(true); // acquire
    Coroutine::create(function () use ($url, $sem) {
        try {
            $this->fetch($url);
        } finally {
            $sem->pop(); // release — like defer sem.Release() in Go
        }
    });
}
```

### Workerman Concurrency

```php
use Workerman\Worker;
use Workerman\Timer;
use Workerman\Connection\AsyncTcpConnection;

// Multi-process (not coroutine — process-based like PHP-FPM but persistent)
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
