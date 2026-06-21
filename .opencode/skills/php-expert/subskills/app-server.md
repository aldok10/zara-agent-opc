# PHP Application Servers Subskill

## Activation Triggers
- FrankenPHP, RoadRunner, worker mode, long-running PHP, application server
- Laravel Octane, Symfony Runtime, gRPC, early hints, Mercure

## Senior DNA
- Application servers keep PHP workers alive between requests. Massive performance gain, new failure modes.
- Memory leaks, static state pollution, and stale connections are your enemies.
- FrankenPHP for simplicity + modern features. RoadRunner for ecosystem + plugins.
- Always implement container reset between requests — frameworks handle this for you.

---

## FrankenPHP

Written in Go, embeds PHP directly. Built on Caddy.

**Key Features**:
- Worker mode (persistent PHP workers, no boot per request)
- Early Hints (HTTP 103 — preload CSS/JS before response ready)
- Mercure (native real-time push via SSE)
- Single binary deployment
- Automatic HTTPS via Caddy

```dockerfile
FROM dunglas/frankenphp

COPY . /app
RUN install-php-extensions pdo_pgsql intl opcache

ENTRYPOINT ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
```

```
# Caddyfile
{
    frankenphp
    order php_server before file_server
}
localhost {
    root * /app/public
    php_server {
        worker /app/public/index.php 4
    }
}
```

**Laravel Octane**:
```bash
composer require laravel/octane
php artisan octane:install --server=frankenphp
php artisan octane:start --workers=4 --max-requests=1000
```

**Symfony Runtime**:
```bash
composer require runtime/frankenphp-symfony
APP_RUNTIME=Runtime\\FrankenPhpSymfony\\Runtime php public/index.php
```

---

## RoadRunner

Go-based application server. Communicates with PHP workers via Goridge (binary protocol over pipes/sockets).

**Key Features**:
- Worker pool with configurable limits
- Native gRPC server
- Job queues (AMQP, Kafka, SQS, Beanstalk, In-Memory)
- Temporal workflow engine integration
- HTTP/2 + HTTP/3
- Plugin system (custom Go plugins)

```yaml
# .rr.yaml
version: "3"
server:
  command: "php worker.php"
  relay: pipes

http:
  address: 0.0.0.0:8080
  pool:
    num_workers: 8
    max_jobs: 1000
    supervisor:
      max_worker_memory: 128  # MB — restart if exceeded

jobs:
  pool:
    num_workers: 4
  pipelines:
    emails:
      driver: amqp
      config:
        queue: email_queue
```

```php
// worker.php
use Spiral\RoadRunner\Http\PSR7Worker;
use Nyholm\Psr7\Factory\Psr7Factory;

$worker = RoadRunner\Worker::create();
$psrFactory = new Psr7Factory();
$httpWorker = new PSR7Worker($worker, $psrFactory, $psrFactory, $psrFactory);

while ($request = $httpWorker->waitRequest()) {
    try {
        $response = $app->handle($request);
        $httpWorker->respond($response);
    } catch (\Throwable $e) {
        $httpWorker->getWorker()->error($e->getMessage());
    }
}
```

**gRPC**:
```yaml
grpc:
  listen: "tcp://0.0.0.0:9001"
  proto:
    - "proto/service.proto"
  pool:
    num_workers: 4
```

---

## Long-Running Process Patterns

These apply to ALL application servers (FrankenPHP, RoadRunner, Swoole).

### Memory Leaks
```php
// Container reset between requests (frameworks do this automatically)
// Manual reset pattern:
$app->getContainer()->reset();  // Clear request-scoped services
gc_collect_cycles();            // Force GC

// Monitor memory growth
if (memory_get_usage(true) > 100 * 1024 * 1024) {
    // Signal worker should restart after this request
    $shouldRestart = true;
}
```

### Static State Pollution
```php
// WRONG: Static state leaks between requests
class RequestContext {
    public static ?User $currentUser = null; // Persists across requests!
}

// RIGHT: Request-scoped via DI container or middleware reset
```

### Connection Pools
```php
// Connections persist across requests — this is a FEATURE
// But handle disconnections:
try {
    $result = $pdo->query($sql);
} catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'server has gone away')) {
        $pdo = createNewConnection(); // Reconnect
        $result = $pdo->query($sql);
    }
}
```

### Health Checks
```php
// Expose /health for load balancer
// Must verify: DB connection, Redis, required services
$router->get('/health', function () use ($db, $redis) {
    $db->query('SELECT 1');
    $redis->ping();
    return new Response(200, [], 'ok');
});
```

---

## Selection Guide

| Factor | FPM | FrankenPHP | RoadRunner | Swoole |
|--------|-----|------------|------------|--------|
| Setup complexity | Low | Low | Medium | High |
| Performance | 1x | 3-5x | 3-5x | 5-10x |
| WebSocket | No | Via Mercure | Plugin | Native |
| gRPC | No | No | Native | Limited |
| Job queues | External | External | Built-in | Task workers |
| Real-time | No | Mercure/SSE | Centrifugo plugin | Native |
| Ecosystem | Universal | Growing | Mature | Niche |
| Memory model | Shared-nothing | Must manage | Must manage | Must manage |
| Docker | Standard | Single binary | Single binary | Custom |
| Laravel | Default | Octane | Octane | Octane |
| Symfony | Default | Runtime | Runtime | - |

**Choose FPM**: When simplicity wins, shared hosting, team comfort.
**Choose FrankenPHP**: Modern stack, early hints, Mercure needed, simple worker mode.
**Choose RoadRunner**: Need gRPC, job queues, Temporal, plugin ecosystem.
**Choose Swoole**: Maximum throughput, WebSocket-heavy, willing to manage complexity.
