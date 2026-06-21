# PHP Architecture Subskill

## Activation Triggers
- DDD, hexagonal, clean architecture, CQRS, domain events, bounded context
- Repository pattern, value objects, aggregates, service layer, ports and adapters

## Senior DNA
- Architecture exists to manage complexity. If your app is simple, keep it simple.
- DDD is for complex domains. CRUD apps don't need aggregates.
- Hexagonal architecture protects domain from infrastructure churn.
- Every abstraction must earn its existence. Don't pattern-match your way into complexity.

---

## Domain-Driven Design

### Value Objects (PHP 8.2+)
```php
readonly class Money
{
    public function __construct(
        public int $amount,
        public Currency $currency,
    ) {
        if ($amount < 0) {
            throw new InvalidArgumentException('Amount cannot be negative');
        }
    }

    public function add(self $other): self
    {
        if (!$this->currency->equals($other->currency)) {
            throw new CurrencyMismatch($this->currency, $other->currency);
        }
        return new self($this->amount + $other->amount, $this->currency);
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount
            && $this->currency->equals($other->currency);
    }
}
```

### Aggregates
```php
class Order
{
    private array $events = [];

    private function __construct(
        private OrderId $id,
        private CustomerId $customerId,
        private OrderStatus $status,
        private LineItems $items,
    ) {}

    public static function place(CustomerId $customer, LineItems $items): self
    {
        $order = new self(OrderId::generate(), $customer, OrderStatus::Placed, $items);
        $order->events[] = new OrderPlaced($order->id, $customer, $items->total());
        return $order;
    }

    public function cancel(): void
    {
        if ($this->status === OrderStatus::Shipped) {
            throw new CannotCancelShippedOrder($this->id);
        }
        $this->status = OrderStatus::Cancelled;
        $this->events[] = new OrderCancelled($this->id);
    }

    public function releaseEvents(): array
    {
        $events = $this->events;
        $this->events = [];
        return $events;
    }
}
```

### Repository
```php
interface OrderRepository
{
    public function findById(OrderId $id): ?Order;
    public function save(Order $order): void;
    public function nextIdentity(): OrderId;
}
```

---

## Hexagonal Architecture (Ports & Adapters)

```
┌─────────────────────────────────────────────┐
│  Driving Adapters         │  Driven Adapters │
│  (HTTP, CLI, Queue)       │  (DB, Mail, API) │
│         │                 │         ▲        │
│         ▼                 │         │        │
│  ┌─── Ports (Interfaces) ───────────┐       │
│  │         Domain + Application     │       │
│  └──────────────────────────────────┘       │
└─────────────────────────────────────────────┘
```

```php
// Port (interface in domain)
interface PaymentGateway
{
    public function charge(Money $amount, PaymentMethod $method): PaymentResult;
}

// Driven adapter (infrastructure)
class StripePaymentGateway implements PaymentGateway
{
    public function __construct(private StripeClient $stripe) {}

    public function charge(Money $amount, PaymentMethod $method): PaymentResult
    {
        $intent = $this->stripe->paymentIntents->create([
            'amount' => $amount->amount,
            'currency' => $amount->currency->value,
        ]);
        return PaymentResult::fromStripe($intent);
    }
}

// Driving adapter (controller)
class PlaceOrderController
{
    public function __construct(private PlaceOrderHandler $handler) {}

    public function __invoke(Request $request): Response
    {
        $command = new PlaceOrder(
            customerId: $request->user()->id,
            items: $request->validated('items'),
        );
        $result = ($this->handler)($command);
        return new JsonResponse($result, 201);
    }
}
```

---

## Clean Architecture Layers

```
Domain (entities, value objects, interfaces, domain events)
    ↑ depends on nothing
Application (use cases, command/query handlers, DTOs)
    ↑ depends on domain only
Infrastructure (repositories, API clients, queue, mail)
    ↑ depends on domain + application
Framework (controllers, middleware, config, DI wiring)
    ↑ depends on everything
```

Dependency rule: inner layers NEVER import from outer layers.

---

## CQRS

```php
// Command (write)
readonly class PlaceOrder
{
    public function __construct(
        public string $customerId,
        public array $items,
    ) {}
}

class PlaceOrderHandler
{
    public function __construct(
        private OrderRepository $orders,
        private EventDispatcher $events,
    ) {}

    public function __invoke(PlaceOrder $command): OrderId
    {
        $order = Order::place(
            new CustomerId($command->customerId),
            LineItems::fromArray($command->items),
        );
        $this->orders->save($order);
        $this->events->dispatch(...$order->releaseEvents());
        return $order->id();
    }
}

// Query (read) — separate model, optimized for reading
readonly class OrderSummary
{
    public function __construct(
        public string $id,
        public string $status,
        public float $total,
        public int $itemCount,
    ) {}
}

interface OrderQueryService
{
    public function findForCustomer(string $customerId): array;
}
```

---

## Repository vs Active Record

| Factor | Repository (Doctrine) | Active Record (Eloquent) |
|--------|----------------------|--------------------------|
| Domain purity | High — POPO entities | Low — extends Model |
| Testing | Easy to mock | Needs DB or heavy mocking |
| Complex domains | Excellent | Struggles |
| Rapid prototyping | Slower | Fast |
| Learning curve | Higher | Lower |
| Query flexibility | DQL/QueryBuilder | Fluent, scopes |

Use Eloquent for: CRUD apps, rapid prototyping, simple domains.
Use Doctrine for: Complex domains, DDD, long-lived enterprise apps.

---

## PSR Standards for Architecture

- **PSR-11**: Container interface. Program against `ContainerInterface`, not concrete containers.
- **PSR-14**: Event dispatcher. Domain events flow through `EventDispatcherInterface`.
- **PSR-15**: HTTP middleware. Stack composition for cross-cutting concerns.

```php
// PSR-14 domain event listener
class WhenOrderPlaced
{
    public function __construct(private Mailer $mailer) {}

    public function __invoke(OrderPlaced $event): void
    {
        $this->mailer->send(new OrderConfirmationEmail($event->orderId));
    }
}
```
