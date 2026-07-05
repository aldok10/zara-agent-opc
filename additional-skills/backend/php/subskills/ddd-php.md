# DDD in PHP

## When to Load

Aggregates, value objects, domain events, CQRS, bounded contexts, repositories, domain services.

## Strategic Design

### Bounded Contexts

- Each context = separate namespace, own models, own language.
- Communication between contexts via domain events (async) or anti-corruption layer (sync).
- Shared kernel only for truly universal concepts (Money, Email).

```
src/
  Order/          -- Bounded context: orders
    Domain/
    Application/
    Infrastructure/
  Inventory/      -- Bounded context: inventory
    Domain/
    Application/
    Infrastructure/
  Shared/         -- Shared kernel (value objects only)
```

### Context Mapping

- **Upstream/Downstream**: who dictates the interface?
- **Anti-Corruption Layer**: translate external models at boundary.
- **Published Language**: shared schema (OpenAPI, Protobuf) between teams.
- **Conformist**: accept upstream's model (pragmatic for 3rd party APIs).

## Tactical Patterns

### Aggregate Root

- Consistency boundary — all mutations go through the root.
- Protect invariants — never allow invalid state.
- Record domain events — publish after persistence succeeds.
- Identity by ID (not database PK) — use UUID or ULID.

```php
final class Order
{
    /** @var list<DomainEvent> */
    private array $events = [];

    private function __construct(
        public readonly OrderId $id,
        private OrderStatus $status,
        private LineItems $items,
        private Money $total,
    ) {}

    public static function place(OrderId $id, LineItems $items): self
    {
        $items->ensureNotEmpty();
        $order = new self($id, OrderStatus::Placed, $items, $items->calculateTotal());
        $order->record(new OrderPlaced($id, $items, $order->total));
        return $order;
    }

    public function cancel(CancellationReason $reason): void
    {
        if (!$this->status->canTransitionTo(OrderStatus::Cancelled)) {
            throw new InvalidOrderTransition($this->status, OrderStatus::Cancelled);
        }
        $this->status = OrderStatus::Cancelled;
        $this->record(new OrderCancelled($this->id, $reason));
    }

    /** @return list<DomainEvent> */
    public function releaseEvents(): array
    {
        $events = $this->events;
        $this->events = [];
        return $events;
    }

    private function record(DomainEvent $event): void
    {
        $this->events[] = $event;
    }
}
```

### Value Objects

- Immutable, compared by value, self-validating.
- Readonly classes with validation in constructor.
- Named constructors for clarity.

```php
final readonly class Money
{
    public function __construct(
        public int $amount,     // cents
        public Currency $currency,
    ) {
        if ($amount < 0) {
            throw new InvalidArgumentException('Amount cannot be negative');
        }
    }

    public function add(self $other): self
    {
        $this->ensureSameCurrency($other);
        return new self($this->amount + $other->amount, $this->currency);
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount
            && $this->currency === $other->currency;
    }
}
```

### Domain Events

- Named in past tense: `OrderPlaced`, `PaymentFailed`.
- Immutable data carriers — readonly classes.
- Include aggregate ID + relevant data for consumers.
- Published AFTER successful persistence (outbox pattern or dispatcher).

### Repository Interface (Domain Layer)

```php
interface OrderRepository
{
    public function findById(OrderId $id): ?Order;
    public function save(Order $order): void;
    public function nextIdentity(): OrderId;
}
```

Implementation lives in Infrastructure (Doctrine/Eloquent).

## CQRS

- **Command**: mutates state, returns void or ID.
- **Query**: reads state, returns DTO, never modifies.
- Separate read models optimized for queries (denormalized projections).
- Command handlers: load aggregate → execute → persist → dispatch events.
- Query handlers: read from optimized read store → return DTO.

## Domain Services

- Logic that doesn't belong to a single aggregate.
- Stateless, injectable, operates on domain objects.
- Example: `PricingService` calculating discounts across multiple aggregates.

## Rules

1. Aggregates are consistency boundaries — one transaction per aggregate.
2. Reference other aggregates by ID only — never hold object references.
3. Domain events for cross-aggregate communication (eventual consistency).
4. No framework imports in Domain namespace — pure PHP only.
5. Value objects validate on construction — invalid state is impossible.
6. Repository returns domain objects — never Doctrine entities or Eloquent models directly.
7. Application layer orchestrates — domain layer contains the rules.

## Testing DDD Code

- Unit test aggregates with in-memory fakes (no DB).
- Assert on domain events recorded: `expect($order->releaseEvents())->toContainInstanceOf(OrderPlaced::class)`.
- Test invariant enforcement: invalid operations throw domain exceptions.
- Integration tests for repository implementations against real DB.

## Verify

- Domain layer has zero framework imports (architecture test).
- All value objects are readonly and self-validating.
- Aggregates enforce invariants — no way to create invalid state.
- Events published after persistence — never before.
