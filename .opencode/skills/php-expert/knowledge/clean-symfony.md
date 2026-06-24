# Clean Code in Symfony

> Docs: https://symfony.com/doc/current/index.html | Best Practices: https://symfony.com/doc/current/best_practices.html | Components: https://symfony.com/components | Source: https://github.com/symfony/symfony

## Senior DNA Applied to Symfony

- **Gall's Law**: Use Symfony's built-in structure. Don't layer DDD/CQRS until your domain proves complex enough.
- **Explicit > Magic**: Symfony favors explicit configuration. Don't fight it with custom magic. Autowire + autoconfigure is explicit enough.
- **Golden Hammer**: Messenger isn't always needed. Direct service call is fine until you need async/retry.
- **YAGNI**: Don't split into microservices. Symfony bundles give modularity within a monolith.
- **Shipping is a Feature**: `bin/console make:controller` gets you started. Refine later.

---

## Controllers

```php
// Thin controller - orchestrates, doesn't contain logic
#[Route('/orders', methods: ['POST'])]
public function create(
    CreateOrderCommand $command,   // auto-deserialized by Symfony
    MessageBusInterface $bus,
): JsonResponse {
    $bus->dispatch($command);
    return new JsonResponse(null, 202);
}
```

- One action per controller is valid (invokable controllers with `__invoke`)
- Use `#[MapRequestPayload]` (Symfony 6.3+) for automatic deserialization
- Return early on validation failure (handled by Validator + exception listener)

## Services

```php
// Autowired by default - just typehint
final class OrderService
{
    public function __construct(
        private readonly OrderRepository $orders,
        private readonly MessageBusInterface $bus,
        private readonly LoggerInterface $logger,
    ) {}
}
```

- `final` by default (Symfony best practice)
- Constructor injection only (never `$container->get()` in application code)
- One service = one responsibility. If name contains "And", split it.

## Messenger (CQRS)

```php
// Command - intention to change state
final readonly class PlaceOrder
{
    public function __construct(
        public string $customerId,
        public array $items,
    ) {}
}

// Handler - executes the intention
#[AsMessageHandler]
final class PlaceOrderHandler
{
    public function __construct(private readonly OrderRepository $orders) {}

    public function __invoke(PlaceOrder $command): void
    {
        $order = Order::place(new CustomerId($command->customerId), $command->items);
        $this->orders->save($order);
    }
}

// Query - read model (separate bus)
final readonly class GetOrder { public function __construct(public string $id) {} }

#[AsMessageHandler(bus: 'query.bus')]
final class GetOrderHandler { ... }
```

- Separate command bus (writes) from query bus (reads)
- Commands return void. Queries return data. Never mix.
- Add `doctrine_transaction` middleware to command bus (one transaction per command)

## Events

```php
// Domain event - record what happened
final readonly class OrderPlaced
{
    public function __construct(
        public string $orderId,
        public \DateTimeImmutable $occurredAt = new \DateTimeImmutable(),
    ) {}
}

// Listener (not subscriber - Symfony deprecated subscribers)
#[AsEventListener]
final class SendOrderConfirmation
{
    public function __invoke(OrderPlaced $event): void { ... }
}
```

## Validation

```php
final readonly class CreateUserDTO
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Email]
        public string $email,

        #[Assert\Length(min: 8)]
        public string $password,
    ) {}
}
```

- Validation via attributes on DTO properties
- Validate at boundary (controller/command entry point)
- Domain objects enforce invariants internally (no assertions - throw exceptions)

## Testing

```php
// Functional test (Symfony standard)
final class OrderControllerTest extends WebTestCase
{
    public function testCreateOrder(): void
    {
        $client = static::createClient();
        $client->request('POST', '/orders', content: json_encode([...]));

        self::assertResponseStatusCodeSame(202);
    }
}

// Unit test for domain
final class OrderTest extends TestCase
{
    public function testCannotCancelShippedOrder(): void
    {
        $order = OrderMother::shipped();

        $this->expectException(DomainException::class);
        $order->cancel();
    }
}
```

## Directory Structure

```
src/
├── Controller/           # HTTP layer (thin)
├── Command/              # CLI commands
├── Message/              # Commands, Queries, Handlers
├── Entity/               # Doctrine entities (or Domain/)
├── Repository/           # Doctrine repositories
├── EventListener/        # Event handlers
├── Service/              # Application services
└── ValueObject/          # Immutable value types
```

Or with bounded contexts:
```
src/
├── Order/
│   ├── Message/
│   ├── Domain/
│   └── Infrastructure/
├── Catalog/
└── SharedKernel/
```
