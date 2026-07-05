---
type: fact
title: "PHP Async & Performance - Swoole, FrankenPHP, RoadRunner, OPcache"
---

# PHP Async & Performance

> Long-running PHP processes flip the performance model. Instead of boot-per-request overhead, you pay once and serve thousands. The tradeoff: memory leaks, state bleed, and connection management become your problems.

## Swoole

Swoole turns PHP into an event-driven async runtime with coroutines, similar to Go's goroutines.

### Coroutines

```php
use Swoole\Coroutine;

Coroutine\run(function () {
    $results = [];

    // Fan-out: 3 concurrent HTTP calls
    $wg = new Coroutine\WaitGroup();
    foreach (['api1', 'api2', 'api3'] as $endpoint) {
        $wg->add();
        Coroutine::create(function () use ($endpoint, &$results, $wg) {
            $client = new Coroutine\Http\Client('example.com', 443, true);
            $client->get("/$endpoint");
            $results[$endpoint] = $client->body;
            $client->close();
            $wg->done();
        });
    }
    $wg->wait(); // blocks until all 3 finish
});
```

Coroutines yield at I/O boundaries automatically—no manual `await`. Context switching costs ~200ns vs ~2μs for threads.

### Channels

```php
use Swoole\Coroutine\Channel;

$chan = new Channel(10); // buffered channel, capacity 10

Coroutine::create(function () use ($chan) {
    for ($i = 0; $i < 100; $i++) {
        $chan->push($i); // blocks if full
    }
    $chan->close();
});

Coroutine::create(function () use ($chan) {
    while ($data = $chan->pop()) { // blocks if empty
        processItem($data);
    }
});
```

### Connection Pooling

```php
use Swoole\Database\PDOPool;
use Swoole\Database\PDOConfig;

$pool = new PDOPool(
    (new PDOConfig())
        ->withHost('127.0.0.1')
        ->withDbname('app')
        ->withCharset('utf8mb4'),
    size: 64 // max connections
);

// In request handler:
$pdo = $pool->get();       // borrow
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([$id]);
$pool->put($pdo);          // return to pool
```

Rule: always return connections in a `finally` block to prevent pool exhaustion.

### WebSocket Server

```php
$server = new Swoole\WebSocket\Server('0.0.0.0', 9502);

$server->on('open', fn($server, $req) => null);
$server->on('message', function ($server, $frame) {
    $server->push($frame->fd, json_encode(['echo' => $frame->data]));
});
$server->on('close', fn($server, $fd) => null);

$server->set(['worker_num' => swoole_cpu_num()]);
$server->start();
```

### Performance: Swoole vs php-fpm

| Metric | php-fpm | Swoole HTTP |
|--------|---------|-------------|
| Requests/sec (hello world) | ~3,000 | ~45,000 |
| Memory per request | ~2MB boot | ~50KB marginal |
| Connection overhead | Full TCP per request | Persistent |
| Time to first byte | 5-15ms | <1ms |

## FrankenPHP

Go-based app server embedding PHP via CGO. Ships as a Caddy module.

### Worker Mode

Workers boot once, handle many requests without re-initialization:

```php
// worker.php
<?php

use frankenphp\worker;

// Boot once: load config, warm caches, establish connections
$app = require __DIR__ . '/bootstrap.php';
$db = new PDO('mysql:host=127.0.0.1;dbname=app', 'user', 'pass', [
    PDO::ATTR_PERSISTENT => true,
]);

// Handle requests in a loop
while ($request = worker\wait()) {
    try {
        $response = $app->handle($request);
        worker\respond($response);
    } catch (Throwable $e) {
        worker\respond(new Response(500));
    } finally {
        // Reset per-request state
        gc_collect_cycles();
    }
}
```

### Caddy Integration (Caddyfile)

```
app.example.com {
    route {
        php {
            root /srv/app/public
            worker /srv/app/worker.php
            num_workers {env.PHP_WORKERS}  # default: 2x CPU
        }
    }
    encode zstd gzip
}
```

### Early Hints (103)

FrankenPHP supports HTTP 103 Early Hints natively:

```php
header('Link: </style.css>; rel=preload; as=style', false, 103);
header('Link: </app.js>; rel=preload; as=script', false, 103);
// Browser starts fetching while server computes response
$html = renderPage();
echo $html;
```

Reduces perceived load time 100-300ms on asset-heavy pages.

## RoadRunner

Go application server communicating with PHP workers via Goridge (binary protocol over pipes/TCP).

### PSR-7 Worker

```php
use Spiral\RoadRunner\Http\PSR7Worker;
use Nyholm\Psr7\Factory\Psr17Factory;

$factory = new Psr17Factory();
$worker = new PSR7Worker(
    \Spiral\RoadRunner\Worker::create(),
    $factory, $factory, $factory
);

while ($request = $worker->waitRequest()) {
    try {
        $response = $app->handle($request);
        $worker->respond($response);
    } catch (Throwable $e) {
        $worker->respond($factory->createResponse(500));
    }
}
```

### gRPC Support

RoadRunner can serve gRPC directly from PHP:

```yaml
# .rr.yaml
grpc:
  listen: "tcp://0.0.0.0:9001"
  proto:
    - "proto/service.proto"
  workers:
    command: "php grpc-worker.php"
    pool:
      num_workers: 8
```

### Centrifugo Integration

RoadRunner + Centrifugo for real-time: PHP handles business logic, Centrifugo manages WebSocket connections at scale (millions concurrent).

## ReactPHP / Amp Event Loops

For IO-bound tasks without full server replacement:

```php
// ReactPHP: concurrent HTTP requests
use React\Http\Browser;
use React\EventLoop\Loop;

$browser = new Browser();
$promises = array_map(
    fn($url) => $browser->get($url),
    ['https://api1.com', 'https://api2.com', 'https://api3.com']
);

React\Promise\all($promises)->then(function (array $responses) {
    foreach ($responses as $response) {
        echo $response->getBody();
    }
});
```

Amp uses fibers (PHP 8.1+) for synchronous-looking async code—no callbacks or promise chains.

## OPcache Tuning

### Production Settings

```ini
opcache.enable=1
opcache.memory_consumption=256          ; MB, size for compiled scripts
opcache.interned_strings_buffer=64      ; MB, shared string table
opcache.max_accelerated_files=20000     ; prime number >= file count
opcache.validate_timestamps=0           ; NEVER recheck files in prod
opcache.revalidate_freq=0
opcache.save_comments=1                 ; needed for annotations/attributes
opcache.enable_file_override=1
```

### JIT Configuration (PHP 8.4+)

```ini
opcache.jit=tracing                     ; or 'function' for simpler workloads
opcache.jit_buffer_size=128M
opcache.jit_hot_func=127                ; calls before JIT compilation
opcache.jit_hot_loop=64                 ; iterations before loop JIT
```

PHP 8.4 JIT improvements: better register allocation, improved type inference for property hooks, reduced memory for JIT'd code (~15% smaller buffers needed).

**When JIT helps**: CPU-bound (math, image processing, serialization). **When it doesn't**: IO-bound (most web apps)—overhead of compilation > benefit.

### Preloading

```php
// preload.php (opcache.preload=/path/to/preload.php)
<?php
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator(__DIR__ . '/vendor/framework/src')
);
foreach ($files as $file) {
    if ($file->getExtension() === 'php') {
        opcache_compile_file($file->getPathname());
    }
}
```

Preloaded classes: zero autoload cost, zero compilation cost, shared across all workers. Downside: changing preloaded files requires full FPM/server restart.

## FFI for Performance-Critical Operations

```php
$ffi = FFI::cdef("
    double calculate_distance(double lat1, double lon1, double lat2, double lon2);
", "/usr/lib/libgeo.so");

$distance = $ffi->calculate_distance(40.7128, -74.0060, 51.5074, -0.1278);
```

Use cases: image processing, crypto operations, scientific computation. FFI call overhead is ~1μs—only worth it for operations that save >10μs vs pure PHP.

## Memory Management in Long-Running Processes

### Common Leaks

1. **Static/global accumulation**: arrays that grow per-request
2. **Event listener buildup**: registering without deregistering
3. **Circular references**: objects referencing each other (GC handles but slowly)
4. **PDO statement cache**: unbounded prepared statement accumulation

### Prevention Patterns

```php
// Per-request cleanup in worker loops
function resetState(): void {
    // Force cycle collection
    gc_collect_cycles();

    // Reset Monolog handlers buffer
    foreach ($this->logger->getHandlers() as $handler) {
        if ($handler instanceof BufferHandler) {
            $handler->clear();
        }
    }

    // Clear entity manager identity map (Doctrine)
    $this->entityManager->clear();
}
```

### Monitoring

```php
// Track memory growth per N requests
if ($requestCount % 100 === 0) {
    $current = memory_get_usage(true);
    if ($current > $memoryLimit * 0.9) {
        // Graceful restart: finish current request, then exit
        // Supervisor/systemd will respawn the worker
        break;
    }
}
```

Worker supervisors (Swoole, RoadRunner, FrankenPHP) support `max_requests` to auto-restart workers after N requests—crude but effective leak prevention.

## Performance Comparison Summary

| Server | Req/s (JSON API) | Latency p99 | Memory/worker | Best For |
|--------|-----------------|-------------|---------------|----------|
| php-fpm | 2-5k | 15-50ms | 20-40MB | Traditional apps |
| Swoole | 30-60k | 1-5ms | 10-20MB | High-concurrency, WebSocket |
| FrankenPHP | 15-30k | 2-8ms | 15-25MB | Symfony/Laravel, HTTP/3 |
| RoadRunner | 15-40k | 2-6ms | 10-20MB | Microservices, gRPC |
| ReactPHP | 10-20k | 3-10ms | 5-15MB | Event-driven, streaming |

Numbers vary wildly by workload. Always benchmark YOUR application, not hello-world.
