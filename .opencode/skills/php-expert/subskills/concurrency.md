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

### Fiber Internals (Engine Level)

```
How Fibers work in Zend Engine:

1. Fiber creation: allocates separate C stack (default 8KB, grows to fiber.stack_size)
   - Uses mmap() with guard page (PROT_NONE) to detect overflow
   - Separate from main VM stack (zend_vm_stack)

2. Fiber::start() / resume():
   - Saves current execution context (registers, stack pointer)
   - Switches to fiber's C stack
   - Resumes fiber's VM execution (opline pointer restored)
   - Uses platform-specific context switch:
     - Linux/macOS: ucontext (makecontext/swapcontext) or boost.context assembly
     - Windows: Windows Fibers API (CreateFiber/SwitchToFiber)
     - Fallback: setjmp/longjmp

3. Fiber::suspend():
   - Saves fiber execution context
   - Switches back to caller's C stack
   - Returns suspended value to caller

4. Fiber completion:
   - Fiber function returns → fiber marked as terminated
   - C stack freed (munmap)
   - Cannot resume terminated fiber (FiberError thrown)
```

### Fiber vs Goroutine Comparison

| Aspect | PHP Fiber | Go Goroutine |
|--------|-----------|-------------|
| Scheduling | Cooperative (manual suspend/resume) | Preemptive (runtime scheduled) |
| Parallelism | None (single thread) | Full (M:N scheduler, multiple OS threads) |
| Stack | Fixed C stack (mmap'd, guard page) | Dynamic (starts 2KB, grows) |
| Who uses | Library authors (AMPHP, Revolt) | Application code directly |
| Event loop | Required (Revolt/ReactPHP) | Built into runtime (netpoller) |
| Context switch | ~100-500ns (C stack swap) | ~50-200ns (goroutine swap) |
| Count limit | ~10K per process (limited by memory for C stacks) | Millions (tiny stacks) |

### Fiber Stack Configuration

```ini
; php.ini
fiber.stack_size=8388608  ; 8MB default max per fiber (guard page at end)
; Most fibers use far less (pages faulted on demand)
; Reduce if running many fibers: fiber.stack_size=1048576 (1MB)
```

### Fiber State Machine

```
┌──────────┐  start()   ┌──────────┐  suspend()  ┌───────────┐
│ Created  │ ─────────→ │ Running  │ ──────────→ │ Suspended │
└──────────┘            └──────────┘             └───────────┘
                              │                       │
                              │ return/throw          │ resume()/throw()
                              ↓                       ↓
                        ┌──────────┐           ┌──────────┐
                        │Terminated│           │ Running  │ (back to running)
                        └──────────┘           └──────────┘

States:
- Created: Fiber instantiated but not started
- Running: Currently executing (only one fiber runs at a time per thread)
- Suspended: Paused via Fiber::suspend(), waiting for resume()
- Terminated: Function returned or threw (cannot be restarted)
```

### Event Loop Architecture (Revolt/AMPHP)

```
Main Fiber (application code)
    │
    │ I/O needed (e.g., HTTP request)
    │ Library calls Fiber::suspend()
    ↓
Event Loop (Revolt)
    │ Registers I/O watcher (epoll/kqueue/poll)
    │ Checks timers
    │ Polls for ready I/O
    │ I/O ready → Fiber::resume() on waiting fiber
    ↓
Main Fiber (continues after I/O)

Multiple fibers can be "in-flight" simultaneously:
- All suspended, waiting for their I/O
- Event loop resumes whichever is ready first
- Cooperative: no preemption, no race conditions
- Single-threaded: no mutex needed
```

### Common Fiber Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Suspend in internal function | FiberError: cannot suspend in internal function callback | Don't suspend inside array_map, array_filter, preg_replace_callback |
| No event loop | Fiber just stays suspended forever | Use Revolt/AMPHP or write a scheduler |
| Blocking call in fiber | Blocks entire thread (all fibers) | Use async I/O (hooks or async client) |
| Too many fibers | Each has C stack (default 8MB virtual) | Reduce fiber.stack_size or limit concurrency |
| Uncaught exception in fiber | Fiber terminates, caller doesn't know | Always catch at fiber boundary or use Future |

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
