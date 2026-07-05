---
type: subskill
title: "Swoole Senior Developer Subskill"
---

# Swoole Senior Developer Subskill

## Activation Triggers
- Swoole, OpenSwoole, coroutine, long-running PHP, WebSocket server, high-throughput
- Connection pooling, task workers, event-driven PHP, thread mode, io_uring
- Multi-thread PHP, Swoole\Thread, concurrent containers, coroutine lock

## Senior DNA
- Swoole turns PHP into a long-running application server. Different paradigm from FPM.
- Memory management is YOUR problem - statics persist, connections persist, leaks accumulate.
- Use `max_request` as a safety net, not as your memory strategy.
- Runtime hooks are magic - they make blocking code non-blocking transparently.
- Thread mode (v6+) is the future - think Go concurrency model in PHP.
- **Always check the Swoole version** - API surface changed dramatically between v4->v5->v6.

See `knowledge/swoole-versions.md` for full version matrix and migration guides.

---

## Architecture

```
Multi-Process Mode (default):
Master Process
├── Manager Process
│   ├── Worker 0 (handles HTTP/TCP via coroutines)
│   ├── Worker 1
│   ├── Worker N (worker_num)
│   ├── Task Worker 0 (blocking/heavy work)
│   └── Task Worker M (task_worker_num)
└── Reactor Threads (I/O multiplexing, epoll/kqueue/poll)

Multi-Thread Mode (v6+ with --enable-swoole-thread, PHP ZTS):
Main Thread
├── Manager Thread
│   ├── Worker Thread 0 (coroutines + shared memory)
│   ├── Worker Thread 1
│   └── Worker Thread N
└── Shared: Thread\Map, Thread\ArrayList, Thread\Queue, Thread\Atomic
```

- **Master**: signal handling, timer
- **Manager**: fork/respawn workers (or threads in thread mode)
- **Workers**: handle requests via coroutines (thousands per worker)
- **Task Workers**: offload blocking/CPU-heavy work
- **Thread mode advantage**: shared memory without serialization, lower overhead than IPC

---

## Basic HTTP Server

```php
<?php
declare(strict_types=1);

$server = new Swoole\HTTP\Server('0.0.0.0', 9501);

$server->set([
    'worker_num' => swoole_cpu_num() * 2,
    'max_request' => 10000,
    'enable_coroutine' => true,
    'hook_flags' => SWOOLE_HOOK_ALL,
]);

$server->on('request', function (Swoole\Http\Request $request, Swoole\Http\Response $response): void {
    $response->header('Content-Type', 'text/plain');
    $response->end('Hello World');
});

$server->start();
```

---

## Runtime Hooks (Auto-Coroutine)

```php
Co::set(['hook_flags' => SWOOLE_HOOK_ALL]);

// All blocking I/O becomes non-blocking automatically:
// - PDO/MySQLi → coroutine MySQL client
// - phpredis → coroutine Redis
// - file_get_contents → coroutine HTTP
// - sleep() → coroutine sleep (doesn't block worker)
// - fread/fwrite → coroutine file I/O (or io_uring in v6+)
// - stream_socket → coroutine socket
// - curl → coroutine curl (Guzzle works transparently)
// - pdo_pgsql → coroutine PostgreSQL (v5.1+)
// - pdo_sqlite → coroutine SQLite (v5.1+)
// - pdo_oci → coroutine Oracle (v5.1+)
// - pdo_firebird → coroutine Firebird (v6.2+)
```

This is Swoole's killer feature. Existing blocking code works without modification.

**Thread mode note (v6+)**: Runtime hooks can only be set in the main thread before creating child threads.

---

## Connection Pooling

```php
<?php
declare(strict_types=1);

use Swoole\Database\PDOPool;
use Swoole\Database\PDOConfig;

$pool = new PDOPool(
    (new PDOConfig())
        ->withHost('127.0.0.1')
        ->withDbname('app')
        ->withUsername('root')
        ->withPassword('secret'),
    64 // pool size
);

// In request handler:
$pdo = $pool->get();
try {
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch();
} finally {
    $pool->put($pdo); // ALWAYS in finally - like Go's defer
}
```

Channel-based custom pool:
```php
$pool = new Swoole\Coroutine\Channel(32);
for ($i = 0; $i < 32; $i++) {
    $pool->push(new PDO($dsn, $user, $pass));
}

// get: $conn = $pool->pop(timeout: 3.0);
// return: $pool->push($conn);
// health-check before use: if ($conn cannot ping) { create new }
```

---

## Thread Mode (v6+ - The Future)

```php
<?php
declare(strict_types=1);

// Requires: PHP ZTS + --enable-swoole-thread

use Swoole\Thread;
use Swoole\Thread\Map;
use Swoole\Thread\Queue;
use Swoole\Thread\Atomic;
use Swoole\Thread\Lock;
use Swoole\Thread\Barrier;

// Shared concurrent containers (thread-safe, no serialization needed)
$map = new Map();
$queue = new Queue();
$counter = new Atomic(0);
$lock = new Lock();
$barrier = new Barrier(count: 4); // wait for 4 threads

// Thread creation
$thread = new Thread(function () use ($map, $counter): void {
    $map['key'] = 'value'; // thread-safe write
    $counter->add(1);      // atomic increment
});

// Thread management (v6.0.2+)
$thread->join();
Thread::yield();              // yield CPU to other threads
Thread::activeCount();        // number of active threads
$thread->isAlive();           // check if thread is running
Thread::setName('worker-1');  // set thread name (like Go)
Thread::setAffinity([0, 1]);  // pin to CPU cores
Thread::setPriority(1);       // set priority

// Server in thread mode
$server = new Swoole\Http\Server('0.0.0.0', 9501, SWOOLE_THREAD);
$server->set([
    'worker_num' => 4,
    'enable_coroutine' => true,
    'hook_flags' => SWOOLE_HOOK_ALL,
]);
```

**When to use thread mode vs process mode:**
- Thread mode: shared state needed, lower memory, same-machine communication
- Process mode: isolation preferred, compatibility with non-ZTS extensions, proven stability

---

## io_uring (v6+ Linux only)

```php
// Compile with: --enable-iouring (requires liburing >= 2.8)
// File operations automatically use io_uring instead of thread pool:
// file_get_contents, file_put_contents, fopen, fclose, fread, fwrite,
// mkdir, unlink, fsync, fdatasync, rename, fstat, lstat, filesize

$server->set([
    'iouring_workers' => 4,       // number of io_uring threads
    'iouring_flags' => IORING_SETUP_SQPOLL, // kernel polling mode
]);

// v6.2+: io_uring for HTTP coroutine server
// Compile with: --enable-uring_socket + (--enable-iouring or --with-liburing-dir)

// Coroutine Lock with io_uring futex (v6.0.1+)
$lock = new Swoole\Coroutine\Lock(); // non-blocking, reentrant, cross-process/thread
```

---

## Coroutine Lock (v6+)

```php
<?php
declare(strict_types=1);

// Non-blocking, reentrant mutex - works across processes AND threads
$lock = new Swoole\Coroutine\Lock();

// Exclusive lock (like flock with LOCK_EX)
$lock->lock();
try {
    // critical section
} finally {
    $lock->unlock();
}

// Non-blocking attempt (LOCK_EX | LOCK_NB)
if ($lock->lock(LOCK_EX | LOCK_NB)) {
    try {
        // got the lock
    } finally {
        $lock->unlock();
    }
}

// v6.1+ simplified API: only __construct, lock, unlock remain
// Removed: lockwait, trylock (use LOCK_NB flag instead)
```

---

## WebSocket Server

```php
<?php
declare(strict_types=1);

$server = new Swoole\WebSocket\Server('0.0.0.0', 9502);

$server->on('open', function (Swoole\WebSocket\Server $server, Swoole\Http\Request $request): void {
    echo "Connection opened: {$request->fd}\n";
});

$server->on('message', function (Swoole\WebSocket\Server $server, Swoole\WebSocket\Frame $frame): void {
    // v6.1+: fragmented message support (frame->finish indicates last fragment)
    if (!$frame->finish) {
        // buffer partial message
        return;
    }
    $server->push($frame->fd, "Echo: {$frame->data}");
});

$server->on('close', function (Swoole\WebSocket\Server $server, int $fd): void {
    echo "Connection closed: {$fd}\n";
});

// v6.1+: disconnect and ping methods available
// $server->disconnect($fd, code: 1000, reason: 'bye');

$server->start();
```

---

## Memory Management (Critical)

In long-running Swoole, memory leaks kill you slowly.

```php
// AVOID: Static arrays that grow forever
class BadCache {
    private static array $cache = []; // Grows until OOM
}

// GOOD: Use LRU or TTL-based cache, or Swoole\Table
$table = new Swoole\Table(1024);
$table->column('value', Swoole\Table::TYPE_STRING, 256);
$table->create();

// Safety nets
$server->set([
    'max_request' => 10000,         // Restart worker after N requests
    'max_request_grace' => 5000,    // Randomize to avoid thundering herd
]);
```

Rules:
- Never use global/static state that accumulates
- Reset request-scoped state between requests
- Use `max_request` as insurance, not as your strategy
- Monitor RSS per worker - alert if growing linearly
- Thread mode: TLS variables destroyed on thread exit (watch for double-free in v6.1.3-)

---

## Task Workers (Offload Heavy Work)

```php
$server->on('request', function ($request, $response) use ($server): void {
    $taskId = $server->task(['type' => 'email', 'to' => 'user@example.com']);
    $response->end("Task queued: $taskId");
});

$server->on('task', function ($server, int $taskId, int $reactorId, mixed $data): string {
    sendEmail($data['to']); // Blocking is OK in task workers
    return 'sent';
});

$server->on('finish', function ($server, int $taskId, string $result): void {
    // Task completed callback
});
```

---

## Coroutine Patterns

```php
<?php
declare(strict_types=1);

use Swoole\Coroutine;
use Swoole\Coroutine\WaitGroup;
use Swoole\Coroutine\Channel;

// Parallel execution (fan-out)
$wg = new WaitGroup();
$results = [];

$wg->add();
go(function () use ($wg, &$results): void {
    $results['users'] = fetchUsers();
    $wg->done();
});

$wg->add();
go(function () use ($wg, &$results): void {
    $results['orders'] = fetchOrders();
    $wg->done();
});

$wg->wait(timeout: 5.0);

// Channel for producer-consumer
$chan = new Channel(capacity: 10);

go(function () use ($chan): void {
    for ($i = 0; $i < 100; $i++) {
        $chan->push($i); // blocks if full
    }
    $chan->close();
});

go(function () use ($chan): void {
    while ($data = $chan->pop()) { // blocks if empty, returns false when closed
        processItem($data);
    }
});

// Coroutine timeout (v6.2+)
Coroutine::setTimeLimit(seconds: 30.0); // kill coroutine if exceeds

// Coroutine cancellation (v6.1+)
$cid = go(function (): void {
    while (true) {
        Coroutine::sleep(1.0);
        if (Coroutine::isCanceled()) {
            break;
        }
    }
});
Coroutine::cancel($cid, throw_exception: true); // throws CanceledException
```

---

## Production Configuration

```php
$server->set([
    // Workers
    'worker_num' => swoole_cpu_num() * 2,
    'task_worker_num' => swoole_cpu_num(),
    'max_request' => 10000,
    'max_request_grace' => rand(0, 5000),

    // Dispatch
    'dispatch_mode' => 3,              // Preemptive assignment

    // Network
    'open_tcp_nodelay' => true,
    'tcp_fastopen' => true,

    // Coroutine
    'enable_coroutine' => true,
    'hook_flags' => SWOOLE_HOOK_ALL,

    // Logging
    'log_level' => SWOOLE_LOG_WARNING,
    'log_rotation' => SWOOLE_LOG_ROTATION_DAILY,

    // Process management
    'daemonize' => false,              // Let systemd/Docker manage
    'reload_async' => true,            // Graceful reload

    // Security
    'package_max_length' => 2 * 1024 * 1024, // 2MB max package
    'buffer_output_size' => 2 * 1024 * 1024,

    // v6+ io_uring (Linux only)
    // 'iouring_workers' => 4,
    // 'iouring_flags' => IORING_SETUP_SQPOLL,

    // v6+ Zstd compression
    // 'http_compression_types' => ['text/html', 'application/json'],
]);
```

Deploy behind Nginx:
```nginx
upstream swoole {
    server 127.0.0.1:9501;
    keepalive 64;
}
server {
    listen 80;
    location / {
        proxy_pass http://swoole;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    # WebSocket
    location /ws {
        proxy_pass http://swoole;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Graceful Lifecycle Management

```php
// Graceful shutdown (like Go's server.Shutdown)
$server->on('workerStart', function ($server, int $workerId): void {
    // Initialize per-worker resources (DB pool, etc.)
    pcntl_signal(SIGTERM, function () use ($server): void {
        // Drain active requests
        $server->shutdown();
    });
});

$server->on('workerStop', function ($server, int $workerId): void {
    // Close pools, flush metrics, release resources
    // This is your Go defer equivalent at worker level
});

$server->on('workerExit', function ($server, int $workerId): void {
    // Called when worker exits in reload_async mode
    // Clean up any remaining event listeners/timers
    Swoole\Timer::clearAll();
});

// v6.1+: Server::shutdown() uses pipe communication in Process mode (more reliable than signals)
```

---

## Standard Library Extensions (v6.1+ stdext)

```php
// Requires: swoole-cli OR ext-swoole compiled with --enable-swoole-stdext
// Works in: php-cli, php-fpm, cli-http-server, swoole modes

// Object-oriented string operations
$text = "Hello World";
$text->length();           // 11
$text->lower();            // "hello world"
$text->replace('World', 'Swoole'); // "Hello Swoole"

// Object-oriented array operations
$arr = [1, 2, 3, 4, 5];
$arr->filter(fn($v) => $v > 2);  // [3, 4, 5]
$arr->map(fn($v) => $v * 2);     // [2, 4, 6, 8, 10]

// Typed arrays (type-constrained)
$users = new typed_array('string', User::class); // keys: string, values: User
$users['john'] = new User('John');  // OK
$users['jane'] = 'not a user';     // TypeError
```

---

## Migration Guide

See `knowledge/swoole-versions.md` for full migration guides (v4->v5, v5->v6, v6.0->v6.1).

---

## When Swoole vs Alternatives

| Factor | FPM | Swoole | RoadRunner | FrankenPHP |
|--------|-----|--------|------------|------------|
| Simplicity | Win | Complex | Medium | Medium |
| WebSocket | No | Native | Plugin | No |
| Performance | Baseline | 5-10x | 3-5x | 3-5x |
| Memory model | Shared-nothing | Must manage | Shared-nothing | Shared-nothing |
| Ecosystem compat | Everything | Some break | Everything | Everything |
| Thread mode | N/A | Native (v6) | N/A | N/A |
| io_uring | N/A | Native (v6) | N/A | N/A |
| PHP version | Any | 8.2+ (v6.2) | Any | Any |
| Hosting | Everywhere | Self-managed | Self-managed | Self-managed |
| Learning curve | None | High | Low | Low |

**Use Swoole when**: WebSocket, >10k req/s, connection pooling, parallel I/O fan-out, thread-based shared state, io_uring file ops.

**Stick with FPM/RoadRunner/FrankenPHP when**: Standard CRUD, team unfamiliar with long-running, hosting constraints, simplicity wins, max ecosystem compatibility.

---

## Common Pitfalls & Debugging

1. **State leakage between requests**: Static vars, singletons, service container instances persist. Reset or use request-scoped containers.
2. **Memory leak**: Append-only arrays, event listeners not removed, circular references without `gc_collect_cycles()`.
3. **Connection stale**: DB connections idle too long → server disconnects. Use health-check on `pop()` from pool.
4. **Blocking in coroutine context**: One blocking call blocks the entire worker. Use `SWOOLE_HOOK_ALL` or task workers.
5. **Thread mode data race**: Shared state without locks/atomics. Use `Thread\Map`, `Thread\Queue`, `Thread\Atomic`.
6. **macOS limitations**: kqueue doesn't support cross-process pipe monitoring. Thread mode untested on macOS.

**Debug tools**:
- `Swoole\Coroutine::listCoroutines()` - list all active coroutines
- `Swoole\Coroutine::getBackTrace($cid)` - get coroutine stack trace
- `memory_get_usage()` per request - detect leaks
- `Swoole\Coroutine::stats()` - coroutine statistics
- `print_backtrace_on_error` config (v6.1+) - C stack trace on errors
- Tracker observer (v6.2+) - detect blocking functions automatically

---

## References

- [wiki.swoole.com](https://wiki.swoole.com/) - Official Chinese docs
- [github.com/swoole/swoole-src](https://github.com/swoole/swoole-src) - Source & releases
- [pecl.php.net/package/swoole](https://pecl.php.net/package/swoole) - PECL releases
- [hyperf.io](https://hyperf.io/) - Full-coroutine framework on Swoole
- [laravel.com/docs/octane](https://laravel.com/docs/octane) - Laravel Octane (Swoole driver)
