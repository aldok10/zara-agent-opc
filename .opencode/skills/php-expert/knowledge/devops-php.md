---
type: fact
title: "PHP DevOps"
---
# PHP DevOps

## Docker for PHP

### Multi-Stage Build
```dockerfile
FROM composer:2 AS deps
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist

FROM php:8.4-fpm-alpine AS runtime
RUN docker-php-ext-install pdo_pgsql opcache
COPY --from=deps /app/vendor /app/vendor
COPY . /app
WORKDIR /app
RUN php artisan config:cache && php artisan route:cache
EXPOSE 9000
CMD ["php-fpm"]
```

### FPM vs Swoole vs FrankenPHP

**PHP-FPM**
- Traditional process manager, one process per request
- Well-tested, widely supported, simple model
- Cold boot each request (mitigated by OPcache)
- Best for: most applications, shared hosting, traditional deployments

**Swoole/OpenSwoole**
- Event-driven, coroutine-based (persistent process)
- In-memory state between requests (connection pools, caches)
- 3-10x throughput improvement for I/O-bound workloads
- Best for: WebSocket, high-concurrency APIs, real-time apps
- Caveat: must manage memory carefully (no per-request cleanup)

**FrankenPHP**
- Built on Caddy server, written in Go
- Supports worker mode (persistent like Swoole, simpler API)
- Native HTTP/3, automatic HTTPS
- Best for: modern deployments, containers, teams wanting simplicity
- Early-maturity for production compared to FPM

### Docker Compose for Development
```yaml
services:
  app:
    build: .
    volumes:
      - .:/app
    depends_on:
      - db
      - redis
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: secret
  redis:
    image: redis:7-alpine
```

## CI/CD with GitHub Actions

### PHP CI Pipeline
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: secret
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
          extensions: pdo_pgsql, redis
          coverage: xdebug
      - run: composer install --prefer-dist
      - run: vendor/bin/phpstan analyse --no-progress
      - run: vendor/bin/pest --coverage --min=80
```

### Parallel Jobs
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: '8.4' }
      - run: composer install
      - run: vendor/bin/phpstan analyse
      - run: vendor/bin/php-cs-fixer fix --dry-run --diff

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: '8.4', coverage: xdebug }
      - run: composer install
      - run: vendor/bin/pest --parallel
```

## Deployment

### Deployer (Zero-Downtime)
```php
// deploy.php
host('production')
    ->set('deploy_path', '/var/www/app')
    ->set('repository', 'git@github.com:org/app.git');

task('deploy', [
    'deploy:prepare',
    'deploy:vendors',
    'artisan:migrate',
    'artisan:cache:clear',
    'deploy:publish',
]);

after('deploy:failed', 'deploy:unlock');
```

### Laravel Forge
- Managed servers (DigitalOcean, AWS, Hetzner)
- Auto-provisions: Nginx, PHP-FPM, SSL, queue workers
- Push-to-deploy via GitHub webhook
- Zero-downtime deployments with Envoyer integration

### Laravel Vapor (Serverless)
- Deploys to AWS Lambda + API Gateway
- Auto-scaling, pay-per-request
- Handles queues via SQS, storage via S3
- Cold starts: ~200-500ms (acceptable for most APIs)
- Not suitable for: WebSocket, long-running processes, Swoole

## Performance

### OPcache Configuration
```ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0          ; disable in production
opcache.jit=tracing                    ; PHP 8.4 JIT
opcache.jit_buffer_size=100M
```

### Preloading (PHP 8.0+)
```php
// preload.php
require __DIR__ . '/vendor/autoload.php';

$classMap = require __DIR__ . '/vendor/composer/autoload_classmap.php';
foreach ($classMap as $class => $file) {
    if (str_starts_with($class, 'App\\Domain\\')) {
        opcache_compile_file($file);
    }
}
```

```ini
opcache.preload=/app/preload.php
opcache.preload_user=www-data
```

### JIT (Just-In-Time Compilation)
- Tracing JIT: best for CPU-bound workloads (math, parsing, image processing)
- Minimal benefit for I/O-bound web apps (most PHP apps)
- Enable for: batch processing, CLI scripts, computation-heavy code
- Monitor: `opcache_get_status()` shows JIT stats

## Production Concerns

### Health Checks
```php
Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        Cache::store()->get('health-check');
        return response()->json(['status' => 'ok']);
    } catch (\Throwable $e) {
        return response()->json(['status' => 'error'], 503);
    }
});
```

### Graceful Shutdown
```php
// For Swoole/FrankenPHP worker mode
pcntl_signal(SIGTERM, function () {
    // finish current request
    // close connections
    // flush queues
    exit(0);
});
```

### Process Management
- PHP-FPM: pm.max_children based on available RAM (each worker ~30-50MB)
- Formula: max_children = available_ram / avg_worker_memory
- Use `pm = dynamic` for variable load, `pm = static` for predictable load
- Monitor: `pm.status_path` for pool metrics
- Supervisor for queue workers: auto-restart on failure, memory limits
