# Clean Code in Hyperf

## Documentation Reference

| Resource | URL |
|----------|-----|
| Official Wiki | https://hyperf.wiki |
| English Docs (3.1) | https://hyperf.wiki/3.1/#/en/ |
| Indonesian Docs | https://hyperf.wiki/3.1/#/id/ |
| GitHub Source | https://github.com/hyperf/hyperf |
| Docs Source (raw MD) | https://github.com/hyperf/hyperf/tree/master/docs |
| Skeleton Project | https://github.com/hyperf/hyperf-skeleton |

Fetch raw markdown: `https://raw.githubusercontent.com/hyperf/hyperf/master/docs/en/<topic>.md`

Key paths: `di.md`, `coroutine.md`, `router.md`, `middleware/middleware.md`, `annotation.md`, `aop.md`, `config.md`, `event.md`, `db/quick-start.md`, `db/model.md`, `json-rpc.md`, `grpc.md`, `async-queue.md`, `pool.md`, `testing.md`, `lifecycle.md`

---

## Senior DNA Applied to Hyperf

- **Gall's Law**: Hyperf is powerful but complex. Don't use AOP/annotations for everything - start with simple DI.
- **Golden Hammer**: Hyperf's coroutines are great for I/O fan-out. They're NOT needed for sequential CRUD.
- **"It Depends"**: Not every endpoint needs coroutine parallelism. Simple DB→JSON doesn't benefit.
- **Memory = Your Problem**: Hyperf runs on Swoole. Static state persists. Treat it like Go: explicit lifecycle.
- **YAGNI**: Don't use microservice features (RPC, circuit breaker) until your system genuinely needs them.
- **Not Invented Here**: Hyperf has 80+ components. Check before writing custom.

---

## Coroutine-Safe Code

```php
// BAD - static array grows forever across requests
class BadService
{
    private static array $cache = []; // MEMORY LEAK

    public function get(string $key): mixed
    {
        return self::$cache[$key] ?? null;
    }
}

// GOOD - use Hyperf's DI with request scope or bounded cache
#[Inject]
private CacheInterface $cache; // PSR-16, bounded, shared properly
```

### Parallel I/O (the main reason to use Hyperf)

```php
use Hyperf\Coroutine\Parallel;

// Fan-out: 3 API calls run simultaneously
$parallel = new Parallel();
$parallel->add(fn() => $this->userClient->get($userId));
$parallel->add(fn() => $this->orderClient->recent($userId));
$parallel->add(fn() => $this->notificationClient->unread($userId));

[$user, $orders, $notifications] = $parallel->wait();
// Total time = slowest call, not sum of all 3
```

### Connection Pooling (automatic in Hyperf)

```php
// config/autoload/databases.php - pool managed by framework
return [
    'default' => [
        'driver' => 'mysql',
        'pool' => [
            'min_connections' => 1,
            'max_connections' => 20, // per worker process
            'connect_timeout' => 3.0,
            'wait_timeout' => 3.0,
            'max_idle_time' => 60.0,
        ],
    ],
];
// No manual pool management needed - Hyperf handles borrow/return
```

## Controllers

```php
#[Controller(prefix: '/api/orders')]
final class OrderController
{
    public function __construct(
        private readonly OrderService $service,
    ) {}

    #[PostMapping('')]
    public function create(CreateOrderRequest $request): array
    {
        $order = $this->service->create(
            CreateOrderDTO::fromRequest($request)
        );

        return ['id' => $order->id, 'status' => $order->status->value];
    }
}
```

- One controller per resource
- Inject services via constructor (autowired)
- Validate with FormRequest classes
- Return arrays (auto-serialized to JSON)

## Middleware

```php
#[Middleware(AuthMiddleware::class)]
#[Middleware(RateLimitMiddleware::class)]
#[Controller(prefix: '/api/admin')]
final class AdminController { ... }
```

## AOP (Aspect-Oriented Programming)

```php
// Use sparingly - for cross-cutting concerns only
#[Aspect]
final class CacheAspect extends AbstractAspect
{
    public array $annotations = [Cacheable::class];

    public function process(ProceedingJoinPoint $point): mixed
    {
        $key = $this->buildKey($point);
        return $this->cache->remember($key, 3600, fn() => $point->process());
    }
}

// Usage - clean annotation on business method
#[Cacheable(prefix: 'user', ttl: 3600)]
public function findById(int $id): ?User { ... }
```

**Rule**: AOP is for logging, caching, rate limiting, circuit breaking. NEVER for business logic.

## gRPC Services

```php
// Hyperf has first-class gRPC support
#[GrpcService]
final class UserService extends UserServiceInterface
{
    public function GetUser(GetUserRequest $request): GetUserReply
    {
        $user = $this->repo->find($request->getId());
        return (new GetUserReply())->setName($user->name)->setEmail($user->email);
    }
}
```

## Testing

```php
// Hyperf uses PHPUnit with coroutine testing support
final class OrderServiceTest extends TestCase
{
    #[Inject]
    private OrderService $service;

    public function testCreateOrder(): void
    {
        $dto = new CreateOrderDTO(customerId: 'cust-1', items: [...]);
        $order = $this->service->create($dto);

        $this->assertNotNull($order->id);
        $this->assertEquals(OrderStatus::Pending, $order->status);
    }
}
```

## When to Use Hyperf vs Others

| Scenario | Hyperf | Laravel | Symfony |
|----------|--------|---------|---------|
| High-QPS API (>10k req/s) | ✅ Best | ⚠️ With Octane | ⚠️ With Runtime |
| Microservices with gRPC | ✅ Native | ❌ | ⚠️ Plugin |
| Simple CRUD app | ❌ Overkill | ✅ Best | ✅ Good |
| Real-time WebSocket | ✅ Native | ⚠️ Reverb/Pusher | ⚠️ Mercure |
| Team knows Laravel | ⚠️ Learning curve | ✅ | ❌ |
| Need Swoole coroutines | ✅ Built-in | ⚠️ Octane | ⚠️ |
