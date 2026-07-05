# Event Sourcing

Store state as a sequence of events, not current state. Every state change is an immutable event appended to a log. Current state is derived by replaying events.

## Core Concepts

- **Event**: immutable fact that something happened. Past tense: `OrderPlaced`, `PaymentReceived`.
- **Event Store**: append-only log of events per aggregate. The source of truth.
- **Aggregate**: consistency boundary. Events belong to an aggregate instance.
- **Projection**: read model built by processing events. Disposable and rebuildable.
- **Snapshot**: cached aggregate state at point N to avoid replaying all events.

## Event Store Design

```
Events table:
  aggregate_id  UUID
  aggregate_type VARCHAR
  event_type    VARCHAR
  version       INT (optimistic concurrency)
  data          JSONB
  metadata      JSONB (correlation_id, causation_id, timestamp, user_id)
  created_at    TIMESTAMP

Index: (aggregate_id, version) UNIQUE
```

**Append-only**: never update or delete events in production.
**Optimistic locking**: version check on append prevents concurrent writes to same aggregate.

## Projections

Projections transform events into read-optimized views.

### Projection Types

- **Inline/synchronous**: updated in same transaction as event write. Simple but couples read/write.
- **Async/eventual**: separate process reads event stream, updates projections. Decoupled, eventually consistent.
- **Catch-up**: replays from beginning of stream to rebuild. Used for new projections or bug fixes.

### Projection Lifecycle

1. Create new projection code
2. Replay all historical events through it (backfill)
3. Switch to live processing
4. Old projection can be dropped once consumers migrate

## Snapshots

When aggregates have many events (>100-1000), replaying every time is slow.

```
Snapshot strategy:
- Store snapshot every N events (e.g., every 100)
- Load: get latest snapshot + events after snapshot version
- Snapshot = serialized aggregate state + version number
- Snapshots are optimization, not source of truth
- Can always rebuild from events if snapshot is corrupted
```

## Event Versioning

Events are immutable. Schema changes require versioning strategies:

1. **Weak schema**: store as JSON, handle missing fields with defaults.
2. **Upcasting**: transform old event format to new at read time.
3. **New event type**: deprecate old type, new events use new type. Projection handles both.
4. **Copy-transform**: create new stream with transformed events (last resort, breaks references).

### Upcaster Example

```
// v1: { "amount": 100 }
// v2: { "amount": 100, "currency": "USD" }
func upcastPaymentReceived(event Event) Event {
    if event.Version == 1 {
        event.Data["currency"] = "USD" // default
        event.Version = 2
    }
    return event
}
```

## Temporal Queries

Event sourcing enables time-travel queries:

- **Point-in-time**: replay events up to timestamp T to see state at T.
- **Audit trail**: complete history of every change with who/when/why.
- **Debugging**: replay to exact point of failure.
- **What-if**: apply hypothetical events to see projected state.

## When to Use

**Good fit**: audit-critical domains (finance, healthcare), complex domain logic, need temporal queries, event-driven architecture already in place.

**Bad fit**: simple CRUD, heavy reporting on current state only, team unfamiliar with eventual consistency, low event volume.

## Anti-Patterns

- **Storing commands as events**: events are facts (past tense), not intents.
- **Mutable events**: never update/delete events in production.
- **Giant aggregates**: too many events per aggregate = slow replay. Decompose.
- **Events as API**: events are internal to bounded context. Use integration events for cross-service.
- **No versioning strategy**: schema will evolve. Plan for it from day one.

## Verification

- Replay all events produces correct current state.
- Concurrent writes to same aggregate fail with version conflict.
- Projections can be rebuilt from scratch and match live state.
- Snapshots + remaining events produce same state as full replay.
- Upcasters correctly transform all historical event versions.
