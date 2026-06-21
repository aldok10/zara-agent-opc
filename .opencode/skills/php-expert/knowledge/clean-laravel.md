# Clean Code in Laravel

Source: [github.com/aldok10/clean-code-in-laravel](https://github.com/aldok10/clean-code-in-laravel)

Patterns from production Laravel apps. Every solution is proven in real projects.

## Senior DNA Applied to Laravel

- **Gall's Law**: Start with standard Laravel. Don't impose DDD/hexagonal until pain proves you need it.
- **Golden Hammer**: Eloquent is great for CRUD. It's NOT great for complex domain logic — know when to separate.
- **Pain-Driven**: Don't create Actions/DTOs/Services for simple CRUD. Do create them when controllers exceed 15 lines.
- **YAGNI**: No repository pattern wrapping Eloquent unless you genuinely plan to swap databases (you won't).
- **Tell Don't Ask**: `$order->ship()` not `if ($order->status === 'paid') { $order->status = 'shipped'; }`
- **Fail Fast**: Form Requests validate before controller runs. Never validate inside business logic.
- **Shipping is a Feature**: A working Eloquent model with tests > a perfect hexagonal architecture with no tests.

## Part 1 — Think Clean

### Philosophy of Simplicity
- Simple code > clever code
- If a junior can't understand it in 5 minutes, it's too complex
- Premature abstraction is as bad as premature optimization

### Naming Conventions
- Controllers: singular resource (`UserController`, not `UsersController`)
- Methods: verb + noun (`createOrder`, `sendNotification`)
- Variables: describe the thing, not the type (`$activeUsers`, not `$userArray`)
- Boolean: `is`/`has`/`can` prefix (`$isActive`, `$hasPermission`)

### Code Quality Automation
- **Pint**: `./vendor/bin/pint` (Laravel's CS fixer)
- **PHPStan**: `level: 8` minimum for production
- **Pest**: architecture tests for dependency rules
- Run in CI: Pint → PHPStan → Pest (fast → slow)

### Dependency Injection
- Constructor injection always (never `app()->make()` in application code)
- Interface binding for swappable implementations
- Contextual binding when same interface needs different implementations

## Part 2 — Write Clean

### Controllers (Thin)
- Max 5 CRUD methods: `index`, `show`, `store`, `update`, `destroy`
- No business logic — delegate to Actions or Services
- Return early on validation failure (Form Requests)
- Single responsibility: one resource per controller

### Actions (Single Purpose Classes)
```php
final class CreateOrderAction
{
    public function __construct(
        private readonly OrderRepository $orders,
        private readonly PaymentGateway $payments,
    ) {}

    public function execute(CreateOrderDTO $dto): Order
    {
        // All business logic here
    }
}
```
- One public method (`execute` or `__invoke`)
- Inject dependencies via constructor
- Use DTOs for input, return domain objects

### Data Transfer Objects
```php
final readonly class CreateOrderDTO
{
    public function __construct(
        public string $customerId,
        public array $items,
        public ?string $couponCode = null,
    ) {}

    public static function fromRequest(StoreOrderRequest $request): self
    {
        return new self(
            customerId: $request->validated('customer_id'),
            items: $request->validated('items'),
            couponCode: $request->validated('coupon_code'),
        );
    }
}
```
- `readonly` class (immutable)
- Named constructor from request
- Validated data only

### Form Requests
- One Form Request per action (not shared)
- All validation here, not in controller
- Authorization in `authorize()` method
- Custom messages in `messages()`

### Jobs
- Small, focused, single responsibility
- Idempotent (safe to retry)
- Use typed properties for serialization
- Rate limiting + unique jobs for expensive operations
- `#[WithoutRelations]` to prevent serializing loaded relations

### Pipelines
```php
app(Pipeline::class)
    ->send($order)
    ->through([
        ValidateInventory::class,
        CalculateDiscount::class,
        ApplyTax::class,
        ChargePayment::class,
    ])
    ->thenReturn();
```
- Each pipe: single transformation
- Order matters: validate early, charge last

### APIs
- Always return JSON Resources (never raw models)
- Pagination by default
- Consistent error format: `{message, errors}`
- API versioning via URL prefix or header

## Part 3 — Model Clean

### Eloquent Best Practices
- No business logic in models (models = data + relationships + scopes)
- Custom casts for value objects
- Scopes for reusable queries
- Observers only for side effects (not business logic)

### Enums & Value Objects
```php
enum OrderStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Cancelled = 'cancelled';

    public function canTransitionTo(self $status): bool
    {
        return match($this) {
            self::Pending => in_array($status, [self::Paid, self::Cancelled]),
            self::Paid => $status === self::Shipped,
            default => false,
        };
    }
}
```

### State Pattern
- Replace `if ($order->status === 'pending')` with state classes
- Each state knows valid transitions
- Encapsulate behavior per state

### Database
- Always use migrations (never raw SQL changes)
- Index frequently-queried columns
- Use `select()` to limit columns (avoid `SELECT *`)
- Eager load relationships (prevent N+1)
- Use `chunk()` or `lazy()` for large datasets

## Part 4 — Ship Clean

### Testing Strategy
- Feature tests for happy paths + edge cases
- Unit tests for complex business logic
- No testing implementation details (test behavior)
- Use factories, not manual data setup
- `RefreshDatabase` for isolation

### Queue Workers
- Monitor with Horizon (Redis) or default supervisor
- Set memory + timeout limits
- Graceful shutdown on deploy
- Dead letter queue for failed jobs

### Deployment
- Zero-downtime: `php artisan down --retry=60`
- Cache: `config:cache`, `route:cache`, `view:cache`, `event:cache`
- OPcache: `validate_timestamps=0` in production
- Run migrations in maintenance mode
- Health check endpoint for load balancer

---

## When to Use What (Senior Decision Framework)

### Controller vs Action vs Service vs Job

| Pattern | Use when | Example |
|---------|----------|---------|
| **Thin Controller** | Simple CRUD, <10 lines of logic | `UserController::store` that just validates + saves |
| **Action** | Reusable business operation (controller + command + job) | `CreateOrderAction` — called from API, CLI, and queue |
| **Service** | Orchestrates multiple actions or coordinates dependencies | `CheckoutService` — validates stock, creates order, charges payment |
| **Job** | Async, retryable, time-insensitive work | `SendWelcomeEmailJob` |

### Repository Pattern — Decision

| Scenario | Use Repository? | Why |
|----------|----------------|-----|
| Simple CRUD app | ❌ No | Eloquent IS your repository. Don't wrap it. |
| Complex queries shared across services | ✅ Yes | Extract to query object or repository |
| Need to swap database engine | ❌ No | You won't. YAGNI. |
| Domain logic separated from persistence | ✅ Yes | DDD bounded context needs this |
| Testing without database | ✅ Interface | Mock the interface, not Eloquent |

**Rule**: Don't create a repository that just proxies Eloquent. That's the Golden Hammer antipattern. If your repository methods are `find($id)`, `save($model)`, `delete($model)` — you've just recreated Eloquent with extra steps.

### When Actions Shine

```php
// Action = single responsibility, reusable, testable
final class CreateOrderAction
{
    public function __construct(
        private readonly OrderRepository $orders,
        private readonly PaymentGateway $payments,
        private readonly EventDispatcher $events,
    ) {}

    public function execute(CreateOrderDTO $dto): Order
    {
        $order = Order::create($dto->toArray());

        $this->payments->charge($order->total, $dto->paymentMethod);
        $this->events->dispatch(new OrderCreated($order));

        return $order;
    }
}

// Called from controller:
$order = $this->createOrder->execute(CreateOrderDTO::fromRequest($request));

// Called from Artisan command:
$order = $this->createOrder->execute(CreateOrderDTO::fromArray($data));

// Called from job:
$order = $this->createOrder->execute($this->dto);
```

### Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Fat controller (>30 lines) | Untestable, not reusable | Extract to Action |
| Repository wrapping Eloquent 1:1 | Extra indirection, no value | Use Eloquent directly |
| Service with "Manager" in name | God class | Split into focused Actions |
| `app()->make()` in business code | Hidden dependency, untestable | Constructor injection |
| Trait for shared logic | Horizontal inheritance, hard to track | Composition (inject service) |
| Event listener doing 5 things | SRP violation | One listener per side effect |
