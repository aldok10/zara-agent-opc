# Async PHP Runtimes Comparison

## Overview

| Runtime | Language | Model | Best For |
|---------|----------|-------|----------|
| FrankenPHP | Go+PHP | Worker mode (Caddy) | Laravel/Symfony apps, easy adoption |
| Swoole | C ext | Coroutines + event loop | High-concurrency, WebSocket, gRPC |
| RoadRunner | Go | Worker pool (goridge) | Multi-protocol, stable, any framework |
| Hyperf | PHP+Swoole | Full framework on coroutines | Microservices, full async toolkit |

## FrankenPHP

### How It Works

- Caddy web server with embedded PHP SAPI.
- Worker mode: PHP boots once, handles requests in a loop (no re-bootstrap).
- Early hints (HTTP 103) support built-in.
- Automatic HTTPS via Caddy.

### When to Choose

- Existing Laravel/Symfony app wanting 2-4x throughput gain.
- Team unfamiliar with async PHP concepts.
- Need HTTP/3, automatic TLS, or early hints.
- Want simple deployment (single binary + PHP).

### Trade-offs

- Less control than Swoole (no coroutines, no custom protocols).
- Worker mode requires stateless app (no global state leaks).
- Newer ecosystem, less battle-tested at extreme scale.

### Laravel Octane + FrankenPHP

```bash
composer require laravel/octane
php artisan octane:install --server=frankenphp
php artisan octane:start --workers=4 --max-requests=1000
```

## Swoole

### How It Works

- PHP extension (C): event loop + coroutines in PHP userland.
- Each worker runs thousands of coroutines cooperatively.
- Built-in: HTTP/WebSocket server, TCP/UDP, timer, process manager.
- Coroutine-aware replacements for PDO, Redis, curl.

### When to Choose

- WebSocket servers, real-time applications.
- Microservices with high connection counts.
- gRPC server/client in PHP.
- Need CSP channels, coroutine-level concurrency.

### Trade-offs

- Must use coroutine-aware I/O clients (blocking calls block worker).
- Different mental model from traditional PHP.
- Extension installation required (not pure PHP).
- Some libraries incompatible (anything using blocking I/O internally).

### Critical Pattern

```php
// WRONG: blocks entire worker
$response = file_get_contents('https://api.example.com/data');

// RIGHT: coroutine-aware, yields while waiting
$client = new Swoole\Coroutine\Http\Client('api.example.com', 443, true);
$client->get('/data');
$response = $client->body;
```

## RoadRunner

### How It Works

- Go binary communicates with PHP workers via goridge protocol.
- PHP worker runs in a loop: receive request → process → return response.
- Plugins: HTTP, gRPC, jobs (queues), KV, metrics, TCP.

### When to Choose

- Need multi-protocol (HTTP + gRPC + queues) in one binary.
- Want Go-level stability with PHP application code.
- Team wants async benefits without Swoole's learning curve.
- Need custom plugins (write in Go, call from PHP).

### Trade-offs

- No in-process coroutines (concurrency is worker-level, not coroutine-level).
- Go binary adds deployment dependency.
- Less raw throughput than Swoole for connection-heavy workloads.

### Configuration (`.rr.yaml`)

```yaml
server:
  command: "php worker.php"
  relay: pipes

http:
  address: "0.0.0.0:8080"
  pool:
    num_workers: 8
    max_jobs: 1000
    supervisor:
      max_worker_memory: 128

jobs:
  consume: ["orders"]
  pipelines:
    orders:
      driver: amqp
      config:
        queue: orders
```

## Decision Matrix

| Factor | FrankenPHP | Swoole | RoadRunner |
|--------|-----------|--------|------------|
| Adoption ease | High | Low | Medium |
| Raw throughput | Good | Excellent | Good |
| WebSocket | Basic | Native | Plugin |
| Coroutines | No | Yes | No |
| Framework support | Laravel/Symfony | Hyperf/custom | Any |
| gRPC | No | Yes | Yes |
| Deployment | Single binary | PHP ext | Go binary |
| Learning curve | Low | High | Medium |

## Common Rule: All Runtimes

- Reset all request-scoped state between requests.
- No static property caches that grow unbounded.
- Connection pooling mandatory (DB, Redis, HTTP clients).
- Graceful shutdown on SIGTERM  -  finish in-flight, then exit.
- Monitor memory: `memory_get_usage()` per request, alert on growth.
- Set `max_requests` / `max_jobs` to recycle workers periodically.
