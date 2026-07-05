# DDD Patterns

## Core Concepts

### Bounded Context

A boundary within which a particular domain model is defined and applicable. The same real-world concept may have different representations in different bounded contexts.

Example: "Customer" in the Sales context has contact info and purchase history. "Customer" in the Shipping context has delivery addresses and shipping preferences. These are different models behind the same word.

### Ubiquitous Language

The shared vocabulary between developers and domain experts within a bounded context. Every term has one precise meaning. If stakeholders use different words for the same thing -- pick one. If they use one word for different things -- disambiguate.

Rules:
- Language lives inside a bounded context (not global)
- Code uses the same terms as domain experts
- If the language changes, the code changes
- Glossary is the authoritative reference

## Building Blocks

### Entity

An object defined by its identity rather than its attributes. Two entities with identical attributes but different IDs are different objects.

Characteristics:
- Has a unique identifier (ID)
- Has a lifecycle (created, modified, archived)
- Equality based on ID, not attribute values
- Mutable (attributes change over time)

Examples: User, Order, Invoice, Account

### Value Object

An object defined by its attributes rather than identity. Two value objects with the same attributes are interchangeable.

Characteristics:
- No unique identifier
- Immutable (replace, never modify)
- Equality based on all attributes
- Self-validating (invalid state cannot exist)

Examples: Money(amount, currency), Address(street, city, zip), DateRange(start, end)

### Aggregate

A cluster of entities and value objects treated as a single unit for data changes. The aggregate root is the entry point -- all modifications go through it.

Design rules:
- One aggregate root per aggregate
- External references point to the root only (never internal entities)
- Consistency guaranteed within an aggregate
- Eventually consistent between aggregates
- Keep aggregates small (prefer small clusters)
- Reference other aggregates by ID, not object reference

### Domain Event

Something that happened in the domain that domain experts care about. Named in past tense.

Examples: OrderPlaced, PaymentReceived, SubscriptionCancelled, InventoryDepleted

Properties:
- Immutable (it already happened)
- Contains all data needed to understand what happened
- Timestamp of occurrence
- Identity of the aggregate that produced it

### Domain Service

Operations that don't naturally belong to any entity or value object. Usually coordinate between multiple aggregates.

Signs you need a domain service:
- The operation involves multiple aggregates
- The operation requires external information
- The operation is a significant domain concept (not just CRUD)

Example: TransferFundsService (operates on two Account aggregates)

### Repository

Provides the illusion of an in-memory collection of aggregates. Abstracts persistence mechanics.

Interface:
- findById(id) -> Aggregate
- save(aggregate) -> void
- delete(aggregate) -> void
- Custom query methods based on domain needs

One repository per aggregate root.

### Factory

Encapsulates complex object creation. Use when constructing an aggregate requires non-trivial logic, validation, or coordination.

## Context Mapping Patterns

Relationships between bounded contexts:

| Pattern | Description | When to Use |
|---------|-------------|-------------|
| Shared Kernel | Two contexts share a subset of the model | Tightly coupled teams, small overlap |
| Customer-Supplier | Upstream provides, downstream consumes | Clear dependency direction |
| Conformist | Downstream adopts upstream model as-is | No influence over upstream |
| Anti-Corruption Layer | Translation layer between contexts | Protecting your model from external mess |
| Open Host Service | Published API for multiple consumers | Platform/service provider |
| Published Language | Shared interchange format | Integration standards |
| Separate Ways | No integration, duplicate if needed | Cost of integration > duplication |

## Aggregate Design Heuristics

1. Protect true invariants (business rules that must always hold)
2. Design for eventual consistency where possible
3. Reference other aggregates by identity
4. Use domain events for cross-aggregate coordination
5. If two things must change together atomically -- same aggregate
6. If they can change independently -- different aggregates
7. Smaller is better (1-3 entities per aggregate typical)
