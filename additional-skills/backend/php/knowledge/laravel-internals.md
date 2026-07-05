# Laravel Internals

## Service Container

### How It Works

- Central IoC (Inversion of Control) container for dependency resolution.
- `bind()`: new instance each resolution. `singleton()`: one instance per request lifecycle.
- `scoped()`: singleton within request, reset between requests (critical for Octane).
- Contextual binding: different implementation based on consumer class.

```php
// Interface binding
$this->app->bind(PaymentGatewayInterface::class, StripeGateway::class);

// Contextual
$this->app->when(SubscriptionService::class)
    ->needs(PaymentGatewayInterface::class)
    ->give(StripeGateway::class);

// Scoped (Octane-safe)
$this->app->scoped(CartService::class);
```

### Resolution Order

1. Check if already resolved (singleton cache).
2. Check explicit bindings.
3. Check contextual bindings for requesting class.
4. Attempt auto-resolution via reflection (constructor type hints).

## Service Providers

### Lifecycle

```
register()  → Boot all providers → boot()  → Application ready
```

- `register()`: only bind into container. Never resolve other services here.
- `boot()`: all providers registered. Safe to resolve, register routes, listeners.
- Deferred providers: `$defer = true` + `provides()`  -  loaded only when bound class requested.

### Best Practice

```php
final class PaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PaymentGatewayInterface::class, function ($app) {
            return match (config('payment.gateway')) {
                'stripe' => new StripeGateway(config('services.stripe.key')),
                'paddle' => new PaddleGateway(config('services.paddle.key')),
            };
        });
    }

    public function boot(): void
    {
        // Safe to use resolved services here
    }
}
```

## Facades

### Mechanism

- Static proxy to a service resolved from container.
- `Cache::get('key')` → resolves `cache` from container → calls `->get('key')`.
- `getFacadeAccessor()` returns the container binding key.

### Testing

- `Cache::shouldReceive('get')->once()->andReturn($value)`  -  Mockery integration.
- Or inject `CacheManager` directly in constructor (preferred for testability).

### Real-Time Facades

```php
use Facades\App\Services\PaymentService;

PaymentService::charge($amount); // Auto-generates facade for any class
```

## Middleware Pipeline

### How It Works

```
Request → Global Middleware → Route Middleware → Controller → Response
                                                              ↓
Request ← Global Middleware ← Route Middleware ← Controller ← Response
```

- Pipeline pattern: each middleware wraps the next.
- `$next($request)` passes to next middleware.
- Code before `$next`: runs on way IN.
- Code after `$next`: runs on way OUT (access to response).

### Middleware Groups

- `web`: session, CSRF, cookies, encrypted cookies.
- `api`: throttle, SubstituteBindings (no session/CSRF).
- Custom groups in `bootstrap/app.php` (Laravel 11).

### Terminable Middleware

```php
public function terminate(Request $request, Response $response): void
{
    // Runs AFTER response sent to client (logging, cleanup)
}
```

## Queue System

### Architecture

```
Dispatch → Serialize job → Push to driver → Worker picks up → Unserialize → handle()
```

### Key Components

- **Connection**: Redis/SQS/database/sync driver configuration.
- **Queue**: named queue within a connection (priority ordering).
- **Worker**: long-running process consuming jobs.
- **Supervisor**: monitors workers, restarts on failure.

### Job Lifecycle

```
Dispatched → Queued → Processing → [Completed | Failed → Retry → Failed Permanently]
```

### Critical Patterns

```php
// Unique job (prevent duplicates)
final class ProcessOrder implements ShouldQueue, ShouldBeUnique
{
    public int $uniqueFor = 3600;
    public function uniqueId(): string { return $this->order->id; }
}

// Job batching
Bus::batch([
    new ProcessPayment($order),
    new SendConfirmation($order),
    new UpdateInventory($order),
])->then(fn (Batch $batch) => /* all completed */)
  ->catch(fn (Batch $batch, \Throwable $e) => /* one failed */)
  ->dispatch();
```

### Worker Memory/Timeouts

- `--memory=128`: restart worker if exceeds 128MB.
- `--timeout=60`: kill job after 60s (prevents hanging).
- `--max-jobs=1000`: restart worker after 1000 jobs (memory leak protection).
- `--stop-when-empty`: exit when queue drained (useful for testing).

## Event System

```
Event::dispatch(new OrderPlaced($order))
  → EventServiceProvider maps to listeners
    → Each listener: handle() (sync) or ShouldQueue (async)
```

- Events are simple DTOs (data + no logic).
- Listeners contain the side-effect logic.
- `ShouldQueue` listeners run async  -  failures don't block main flow.
- Model events: `creating`, `created`, `updating`, `updated`, `deleting`, `deleted`.
