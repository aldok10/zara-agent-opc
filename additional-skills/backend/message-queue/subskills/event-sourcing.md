# Event Sourcing

Store state as immutable sequence of events. Current state = replay all events from beginning. Enables full audit trail, temporal queries, and independent read model projections.

## Core Concepts

### Event Store
- Append-only log per aggregate (stream per entity instance)
- Stream ID = aggregate type + entity ID: `Order-{orderId}`
- Events are immutable facts: `OrderCreated`, `ItemAdded`, `OrderShipped`
- Optimistic concurrency: expected version on append prevents conflicts

### Event Structure
```json
{
  "event_id": "uuid-v7",
  "stream_id": "Order-12345",
  "event_type": "OrderItemAdded",
  "version": 3,
  "timestamp": "2026-01-15T10:30:00Z",
  "data": { "item_id": "SKU-789", "quantity": 2, "price": 29.99 },
  "metadata": { "correlation_id": "req-abc", "caused_by": "AddItemCommand", "user_id": "usr-456" }
}
```

### Aggregate Reconstruction
1. Load all events for stream from version 0
2. Apply each event to aggregate state in order
3. Current state = fold over event sequence
4. No database queries, no joins -- pure function over events

## Projections (Read Models)

- Subscribe to event streams, build denormalized views
- Each projection = independent consumer, own position tracking
- Rebuild: drop read model, replay all events from start
- Async projections: eventually consistent (seconds typically)
- Sync projections: within same transaction (immediate consistency, coupling tradeoff)

### Projection Types
| Type | Consistency | Use Case |
|------|-------------|----------|
| Async (catch-up subscription) | Eventually consistent | Read-heavy views, dashboards |
| Sync (in-process) | Immediately consistent | Write validation, uniqueness checks |
| Live (real-time push) | Real-time | Notifications, WebSocket feeds |

## Snapshots

- Optimization: store aggregate state at version N to avoid full replay
- Snapshot every N events (e.g., every 100) or on schedule
- Load: snapshot + events since snapshot version
- Never replace events -- snapshots are optimization, events are source of truth
- Versioning: snapshot schema must evolve with aggregate changes

```
Load order-12345:
  1. Find latest snapshot (version 200, state: {...})
  2. Load events version 201-215
  3. Apply events 201-215 to snapshot state
  4. Result: current state at version 215
```

## Event Versioning

### Strategies
- **Weak schema**: events are untyped maps (flexible, hard to validate)
- **Strong schema**: typed events with version suffix (`OrderCreatedV2`)
- **Upcasting**: transform old event shapes to current schema on read

### Evolution Rules
1. Add optional fields freely (backward compatible)
2. Never remove fields from existing event types
3. Never rename fields (add new, deprecate old)
4. New event type for structural changes: `OrderCreatedV2`
5. Upcaster: `V1 -> V2` transform applied during replay

### Copy-and-Transform Migration
- Create new stream with transformed events
- Run in parallel until verified
- Switch consumers to new stream
- Archive old stream (never delete)

## CQRS Integration

- Command side: validate, produce events, store in event store
- Query side: projections build read-optimized models (SQL, Elasticsearch, Redis)
- Separate scaling: write to event store, read from projections
- Commands are imperative: `CreateOrder` (may be rejected)
- Events are past-tense facts: `OrderCreated` (already happened)

### Command Flow
```
Command -> Aggregate.handle(cmd)
  -> validate business rules against current state
  -> produce events (0 or more)
  -> append events to stream (optimistic concurrency check)
  -> publish events to projections
```

## Event Replay

- Rebuild projections: replay all events through projection handler
- Bug fix: fix projection logic, replay to correct read model
- New feature: create new projection, replay historical events to populate
- Temporal queries: replay to specific point in time for past state
- Caution: replayed events must NOT trigger side effects (emails, payments)

## Implementation Options

| Store | Type | Notes |
|-------|------|-------|
| EventStoreDB | Purpose-built | Native projections, subscriptions, optimized for ES |
| PostgreSQL | Relational | events table + optimistic locking, widely adopted |
| Kafka | Log | Topic per aggregate type, compaction for snapshots |
| DynamoDB | NoSQL | Stream ID as PK, version as SK, conditional writes |
| Marten (.NET) | Library | PostgreSQL-backed, .NET-native ES + projections |

## Anti-Patterns

- Large aggregates (1000+ events without snapshots) -- snapshot or split aggregate
- Events as CRUD: `OrderUpdated` with full state diff defeats the purpose
- Coupling projections to write model (shared DB, synchronous updates)
- Replaying events that trigger side effects (send email again on replay)
- Using event sourcing for simple CRUD entities (overkill, just use state-based)

## Verification Checklist

- [ ] Events are immutable -- no UPDATE/DELETE on event store
- [ ] Optimistic concurrency on every append (expected version check)
- [ ] Projections rebuildable from scratch (tested: drop + replay)
- [ ] Snapshots configured for aggregates with >100 events
- [ ] Event versioning strategy documented and upcasters implemented
- [ ] Replay does not trigger side effects (idempotency guards or replay flag)
- [ ] Correlation/causation IDs on all events for tracing
- [ ] Projection lag monitored and alerted
