# DDD Tactical Patterns

Building blocks for expressing domain models in code -- the "how" of Domain-Driven Design inside a bounded context.

## When to Load

- Modeling complex business domains
- Deciding object identity vs value equality
- Designing transactional consistency boundaries
- Implementing event-driven communication between aggregates

## Key Concepts

**Entities** -- Objects defined by identity, not attributes. Two users with the same name are different if they have different IDs. Mutable over time.

**Value Objects** -- Defined by attributes, no identity. Immutable. Two Money(100, "USD") are the same regardless of where they exist. Use for measurements, ranges, addresses.

**Aggregates** -- Cluster of entities/values with one root entity. The root enforces invariants for the entire cluster. External references only point to the root. One aggregate = one transaction.

**Domain Events** -- Record that something meaningful happened. Past tense naming (OrderPlaced, PaymentFailed). Enable eventual consistency between aggregates and bounded contexts.

**Repositories** -- Collection-like interface for retrieving and persisting aggregates. One repository per aggregate root. Hides storage details from the domain layer.

## Patterns

```
// Value Object
class Money {
  constructor(readonly amount: number, readonly currency: string) {}
  add(other: Money): Money {
    if (this.currency !== other.currency) throw new CurrencyMismatch();
    return new Money(this.amount + other.amount, this.currency);
  }
  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}

// Aggregate with invariant enforcement
class Order {
  private items: OrderItem[] = [];
  addItem(product: ProductId, qty: number, price: Money): void {
    if (this.status !== "draft") throw new OrderLocked();
    if (this.items.length >= 50) throw new ItemLimitExceeded();
    this.items.push(new OrderItem(product, qty, price));
    this.record(new ItemAdded(this.id, product, qty));
  }
}

// Repository interface (domain layer)
interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
```

## Gotchas

- Aggregate too large: if you lock 1000 line items in one transaction, you get contention. Keep aggregates small.
- Anemic domain model: if all logic lives in services and aggregates are just data bags, you lost the benefit
- Events without idempotency: consumers must handle duplicate delivery gracefully
- Repository leaking queries: `findByNameAndStatusAndDateRange` belongs in a read model, not the repository
- Identity confusion: using database auto-increment IDs as domain identity couples persistence to domain

## Verification

- Aggregate: can you explain which invariants the root protects?
- Value Object: is it immutable? Does equality check attributes, not reference?
- Events: are they named in past tense? Do they carry enough data for consumers?
- Repository: does the interface live in the domain layer, implementation in infra?
- Boundaries: does each aggregate fit in one transaction without cross-aggregate writes?
