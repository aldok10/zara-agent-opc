---
type: subskill
title: "Aggregates"
---

# Aggregates

## Core Concepts

- An aggregate is a cluster of domain objects treated as a single unit for data changes
- One entity in the aggregate is the root  -  all external access goes through it
- Aggregates enforce invariants: business rules that must always hold true
- Transactions should not span multiple aggregates  -  design for eventual consistency
- Keep aggregates small: prefer references (IDs) over containment

## Key Practices

- Identify invariants first: "order total must equal sum of line items" defines aggregate boundary
- Use the aggregate root as the sole entry point  -  no direct manipulation of child entities
- Design aggregates around consistency boundaries, not data relationships
- When two things must be consistent immediately, they belong in the same aggregate
- When eventual consistency is acceptable, split into separate aggregates with domain events

## Common Mistakes

- Making aggregates too large: including everything related leads to contention and lock issues
- Referencing other aggregates by object instead of ID  -  creates hidden coupling
- Ignoring concurrency: two users modifying the same aggregate need optimistic locking

## When to Apply

- Modeling domain entities that have business rules spanning multiple objects
- Deciding what to include in a single database transaction
- Designing APIs: aggregate roots map naturally to REST resources
- Resolving contention issues in high-write systems
