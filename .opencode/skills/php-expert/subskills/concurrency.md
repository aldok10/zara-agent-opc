# PHP Concurrency Subskill

## Activation Triggers
- Fibers, async, AMPHP, ReactPHP, Revolt, parallel, non-blocking, event loop
- "How to do async in PHP", concurrent requests, parallel processing

## Senior DNA
- Most PHP apps don't need async. FPM handles concurrency at the process level.
- Fibers are a library primitive, not an application-level tool.
- AMPHP v3 is the modern choice for async PHP. ReactPHP is mature but older API.
- True parallelism requires separate processes or ext-parallel. Fibers are cooperative only.

---

## Decision Tree

```
Do you need async?
├── Web app with FPM? → Probably not. FPM processes ARE your concurrency.
├── Need concurrent HTTP calls? → Guzzle async or AMPHP HTTP client
├── WebSocket server? → Swoole, AMPHP, or ReactPHP
├── CPU-bound parallel work? → amphp/parallel (spawns processes)
└── Building a library? → Use Fibers for non-blocking without callbacks
```

---

## Fibers (PHP 8.1+)

Fibers provide cooperative multitasking. They suspend/resume execution but do NOT run in parallel.

```php
$fiber = new Fiber(function (): void {
    $value = Fiber::suspend('waiting');
    echo "Got: $value\n";
});

$result = $fiber->start();        // "waiting"
$fiber->resume('hello');          // "Got: hello"
```

**Limitations**:
- No built-in scheduler - you must write or use one (AMPHP/Revolt)
- Cannot suspend across internal function calls (array_map callback, etc.)
- Single-threaded - no parallelism
- Meant for library authors, not application code

**Use case**: Libraries that need to pause execution (HTTP client waits for response) without blocking the event loop.

---

## Revolt (Shared Event Loop)

Revolt is the common event loop used by both AMPHP v3 and modern ReactPHP.

```php
use Revolt\EventLoop;

// Timer
EventLoop::delay(1.0, function (): void {
    echo "1 second later\n";
});

// I/O watching
EventLoop::onReadable($stream, function ($id, $stream): void {
    $data = fread($stream, 8192);
    if ($data === '' || $data === false) {
        EventLoop::cancel($id);
    }
});

EventLoop::run();
```

---

## AMPHP v3

The modern async PHP framework. Built on Revolt + Fibers.

```php
use Amp\Future;
use function Amp\async;
use function Amp\await;

// Concurrent execution
$futures = [
    async(fn() => $httpClient->request('GET', 'https://api1.example.com')),
    async(fn() => $httpClient->request('GET', 'https://api2.example.com')),
    async(fn() => $httpClient->request('GET', 'https://api3.example.com')),
];
$responses = Future\await($futures); // All 3 run concurrently

// Cancellation
use Amp\CancelledException;
use Amp\DeferredCancellation;

$cancel = new DeferredCancellation();
$future = async(function () use ($cancel): string {
    $token = $cancel->getCancellation();
    // Long operation that checks cancellation
    $token->throwIfRequested();
    return 'done';
});
$cancel->cancel(); // Cancels the operation

// Semaphore (limit concurrency)
use Amp\Sync\LocalSemaphore;

$semaphore = new LocalSemaphore(10); // Max 10 concurrent
$futures = array_map(function ($url) use ($semaphore, $client) {
    return async(function () use ($url, $semaphore, $client) {
        $lock = $semaphore->acquire();
        try {
            return $client->request('GET', $url);
        } finally {
            $lock->release();
        }
    });
}, $urls);
```

**Worker pools** (true parallelism via child processes):
```php
use Amp\Parallel\Worker;

$result = Worker\submit(function (): int {
    return heavy_computation(); // Runs in separate process
})->await();
```

---

## ReactPHP

Mature async library. Older promise-based API, now also supports Fibers via Revolt.

```php
use React\Http\Browser;
use function React\Async\await;
use function React\Async\async;

$browser = new Browser();

// Modern (fiber-based)
$response = await($browser->get('https://example.com'));

// Concurrent
$promises = [
    $browser->get('https://api1.example.com'),
    $browser->get('https://api2.example.com'),
];
$responses = await(React\Promise\all($promises));
```

---

## ext-parallel

True threading extension. Mostly abandoned - prefer amphp/parallel.

```php
// Only if you really need shared-nothing threads
use parallel\Runtime;

$runtime = new Runtime();
$future = $runtime->run(function (): int {
    return heavy_cpu_work();
});
$result = $future->value();
```

Status: Works on ZTS PHP builds only. Limited maintenance. Use amphp/parallel (process-based) instead.

---

## When to Use What

| Scenario | Solution |
|----------|----------|
| Standard web app | FPM (no async needed) |
| 3 concurrent API calls in a request | Guzzle async or AMPHP |
| WebSocket server | Swoole or AMPHP WebSocket |
| Background job processing | Queue worker (Laravel/Symfony) |
| CPU-heavy batch job | amphp/parallel |
| Building a non-blocking library | Fibers + Revolt |
| High-throughput microservice | Swoole or RoadRunner |

The right answer for 90% of PHP projects: use FPM and don't think about async.
