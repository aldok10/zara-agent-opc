---
type: subskill
title: "CQRS (Command Query Responsibility Segregation)"
---

# CQRS (Command Query Responsibility Segregation)

Separate read and write models. Commands mutate state. Queries read from optimized projections. The write model is optimized for consistency; the read model is optimized for queries.

## Core Concepts

- **Command**: intent to change state. Validated, may be rejected. `PlaceOrder`, `CancelPayment`.
- **Query**: request for data. Never modifies state. Always succeeds (or returns empty).
- **Write Model**: domain model, enforces invariants, handles commands.
- **Read Model**: denormalized projection, optimized for specific query patterns.
- **Eventual Consistency**: read model lags behind write model (milliseconds to seconds typically).

## Architecture

```
Client
  |
  +-- Commands --> Command Handler --> Write Model (Domain) --> Event Store / DB
  |                                                              |
  |                                                              v
  |                                                      Event Publisher
  |                                                              |
  |                                                              v
  +-- Queries  --> Query Handler  --> Read Model <-------- Projection Builder
```

## Write Side

The write side handles business logic and consistency:

```
Command flow:
1. Receive command (validate input)
2. Load aggregate from write store
3. Execute business logic (check invariants)
4. Persist state change (event or state update)
5. Publish event for read side to consume
```

**Write store options**: event store (with event sourcing), relational DB, document store.
Keep write model normalized for consistency. No query optimization here.

## Read Side

The read side is optimized for specific query patterns:

```
Projection flow:
1. Subscribe to events from write side
2. Transform event into read model update
3. Store in query-optimized format
4. Serve queries directly from read store
```

**Read store options**: Elasticsearch (full-text), Redis (fast lookups), PostgreSQL (complex queries), MongoDB (flexible schema), materialized views.

Multiple read models for different query patterns are normal and expected.

## Sync vs Async Projections

### Synchronous (Same Transaction)

- Write + projection update in same transaction
- Strong consistency (read = write)
- Simpler, but couples read/write performance
- Use when: consistency matters more than throughput

### Asynchronous (Event-Driven)

- Projection updates after write commits
- Eventually consistent (lag: ms to seconds)
- Decoupled performance, scales independently
- Use when: high read volume, multiple read models, different stores

## Handling Eventual Consistency

Strategies when users need to "read their own writes":

1. **Causal consistency**: after write, query includes version; read model waits until caught up.
2. **Read from write store**: for the specific user who just wrote, query write side.
3. **Optimistic UI**: client applies change locally, read model catches up in background.
4. **Version stamping**: response includes version; client polls until read model reaches it.

## Projection Strategies

### Single Projection per View

One projection serves one UI view or API endpoint. Simple, focused, easy to reason about.

### Shared Projection

Multiple queries served from one projection. More efficient storage, but projection changes affect multiple consumers.

### Projection Rebuild

When projection logic changes:
1. Deploy new projection code
2. Create new read store (or new table/index)
3. Replay events from beginning
4. Switch traffic to new projection
5. Drop old projection

## When to Use CQRS

**Good fit**: read/write ratio >10:1, different optimization needs for reads vs writes, multiple read models needed, event sourcing already in use, complex domain logic on write side.

**Bad fit**: simple CRUD, 1:1 read/write ratio, small data sets, team unfamiliar with eventual consistency.

## Without Event Sourcing

CQRS works without event sourcing. Write to normalized DB, publish change events (CDC or outbox pattern), project into read stores.

```
Write: PostgreSQL (normalized, constraints)
Read: Elasticsearch (search), Redis (dashboard), PostgreSQL materialized view (reports)
```

## Anti-Patterns

- **Querying the write model**: defeats the purpose. Read side exists to serve queries.
- **Fat events**: events should carry enough data for projections, not entire aggregate state.
- **Single read model**: if you only have one read model identical to write model, you don't need CQRS.
- **Ignoring consistency guarantees**: document and communicate the consistency model to consumers.
- **Projection as source of truth**: projections are disposable. Write model/events are truth.

## Verification

- Commands rejected for invalid input return meaningful errors.
- Read model eventually reflects write model changes (test with polling + timeout).
- Projection rebuild produces identical results to live projection.
- Concurrent writes to same aggregate handled correctly (optimistic locking).
- Read model serves queries without hitting write store.
