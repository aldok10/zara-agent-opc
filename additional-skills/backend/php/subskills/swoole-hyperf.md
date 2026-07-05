# Async PHP: Swoole & Hyperf

## When to Load

High-concurrency, WebSocket, gRPC, coroutines, connection pools, channels, long-running async PHP.

## Mental Model

Swoole is NOT PHP-FPM. Think Go: persistent processes, shared memory, coroutines for concurrency. Every blocking call blocks the ENTIRE worker unless wrapped in coroutine-aware I/O.

## Key Concepts

### Coroutines

- Lightweight cooperative threads — thousands per worker.
- `Coroutine::create()` or `go()` to spawn.
- Context switches happen at I/O boundaries (not preemptive).
- Each coroutine has isolated stack but shares process memory.

### Connection Pools

- Never create connections per-request — pool them.
- `ConnectionPool` with min/max/idle timeout configuration.
- Health checks: `ping()` before returning from pool.
- Separate pools for read/write replicas.

```php
$pool = new ConnectionPool(
    connector: fn() => new PDO($dsn),
    config: new PoolConfig(minConnections: 5, maxConnections: 50, waitTimeout: 3.0)
);
```

### Channels

- CSP-style communication between coroutines.
- Buffered channels for producer/consumer patterns.
- `Channel::push()` / `Channel::pop()` with timeouts.
- Use for fan-out/fan-in, rate limiting, work distribution.

### Swoole Server Lifecycle

```
onStart      → Master process started (write PID file)
onWorkerStart → Worker ready (init connections, warm caches)
onRequest    → Handle HTTP request (per-request scope)
onWorkerStop → Worker shutting down (close connections gracefully)
```

## Hyperf Framework

### Why Hyperf

- Full framework built on Swoole coroutines.
- AOP (Aspect-Oriented Programming) via annotations.
- Microservice toolkit: service discovery, circuit breaker, config center.
- gRPC server/client with code generation.

### Structure

```
app/
  Controller/     -- HTTP/gRPC controllers
  Service/        -- Business logic (injectable)
  Model/          -- Hyperf Model (coroutine-safe Eloquent-like)
  Listener/       -- Event listeners
  Process/        -- Custom long-running processes
  Middleware/     -- PSR-15 middleware
```

### Key Components

- **DI Container**: annotation-based injection (`#[Inject]`).
- **Config Center**: Nacos/Apollo/etcd integration for hot-reload.
- **Service Governance**: circuit breaker, rate limiter, retry.
- **Crontab**: coroutine-safe scheduled tasks.
- **WebSocket**: server + rooms with coroutine handlers.

## Critical Rules

1. NEVER use blocking I/O in coroutine context — use Swoole-compatible clients.
2. NEVER share state between requests without proper synchronization.
3. Reset all request-scoped state — no globals, no static caches that leak.
4. Connection pools MUST have health checks and timeout configuration.
5. `defer()` for cleanup (equivalent to Go's `defer`).
6. Graceful shutdown: handle SIGTERM, drain connections, finish in-flight.
7. Memory management: watch for leaks in long-running processes, profile with `memory_get_usage()`.
8. No `sleep()` — use `Coroutine::sleep()` (yields to scheduler).

## Anti-Patterns

- Using `file_get_contents()` for HTTP (blocks worker) — use Swoole HTTP client.
- Static properties for request state (shared across requests).
- PDO without connection pool (connection exhaustion under load).
- Ignoring coroutine context IDs (data leaks between requests).

## Testing

- `Swoole\Coroutine\run()` wrapper for coroutine tests.
- Mock connection pools with in-memory implementations.
- Load test with `wrk` or `k6` — verify no memory growth over time.
- Test graceful shutdown: send SIGTERM during active requests.

## Verify

- `php bin/hyperf.php start` — server starts without errors.
- `php bin/hyperf.php di:check` — container valid.
- Load test: consistent latency under concurrent load, no connection leaks.
- Memory: stable RSS over 10k requests (no growth = no leak).
