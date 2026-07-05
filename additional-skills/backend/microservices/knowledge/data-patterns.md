# Data Patterns

How services manage and share data without coupling.

## Database Per Service

Each service owns its database. No shared access.

```
Rules:
- Service A cannot query Service B's database directly
- No cross-service foreign keys
- No cross-service JOINs
- Each service chooses its own storage technology (polyglot persistence)
- Schema changes are internal to service (no cross-team coordination)
```

**How to share data**:
- API calls (sync: query another service's endpoint)
- Events (async: subscribe to state changes)
- Data replication (maintain local copy via events)

**Polyglot persistence**: orders in PostgreSQL, search in Elasticsearch, sessions in Redis, analytics in ClickHouse. Each service picks optimal storage.

## Saga Pattern (as Data Pattern)

Coordinating data changes across multiple services without distributed transactions.

```
Saga types:
- Choreography: each service reacts to events, publishes next event
- Orchestration: central coordinator directs each step

Data consistency guarantee:
- NOT atomic (no all-or-nothing across services)
- Eventually consistent (compensations restore consistency)
- Each step is locally atomic (within one service's DB)
```

See `subskills/saga-patterns.md` for full treatment.

## Event Sourcing as Data Pattern

State stored as event log rather than current snapshot.

```
Traditional: UPDATE orders SET status='shipped' WHERE id=123
Event sourcing: APPEND events (order_id=123, type=OrderShipped, data={...})

Current state = fold(events) -- replay all events for aggregate
```

**Data characteristics**:
- Append-only (immutable history)
- No data loss (every change recorded)
- Temporal queries (state at any point in time)
- Audit trail built-in
- Storage grows over time (snapshots mitigate)

See `subskills/event-sourcing.md` for full treatment.

## CQRS as Data Pattern

Separate data stores for reads and writes.

```
Write store: normalized, optimized for consistency
  - PostgreSQL, event store

Read store: denormalized, optimized for queries
  - Elasticsearch, Redis, materialized views

Sync: events flow from write side to read side projections
```

See `subskills/cqrs.md` for full treatment.

## Shared Nothing

Services share no state at all. Each request is self-contained.

- No shared cache (each service has own cache)
- No shared session state (stateless services + external store)
- No shared file system (object storage per service)
- Enables horizontal scaling without coordination

## Data Replication via Events

Services maintain local copies of data they need from other services.

```
Pattern:
1. Service A publishes CustomerUpdated events
2. Service B subscribes, maintains local customer cache/table
3. Service B queries local copy (no network call to A)
4. Trade-off: eventual consistency vs. lower latency and coupling
```

**Caution**: replicated data can become stale. Acceptable for reads; dangerous for writes.

## Transactional Outbox

Guarantee event publication alongside local DB write.

```sql
BEGIN;
  INSERT INTO orders (id, status) VALUES ('123', 'created');
  INSERT INTO outbox (id, topic, payload) VALUES (uuid(), 'orders', '{"event":"OrderCreated"...}');
COMMIT;
-- Background worker publishes outbox entries to message broker
```

Alternatives: CDC (Debezium reads transaction log), listen/notify (PostgreSQL).

## Reporting Across Services

When you need to JOIN data from multiple services:

1. **API composition**: gateway queries multiple services, assembles response.
2. **Event-driven materialized view**: dedicated reporting service consumes events from all services.
3. **Data lake/warehouse**: ETL from service databases into analytics store.
4. **Change Data Capture**: stream DB changes into unified read store.

## Anti-Patterns

- **Shared database**: couples services at data layer. Changes cascade. Deploy together.
- **Distributed transactions (2PC)**: blocks resources, doesn't scale, most brokers don't support.
- **Direct DB access across services**: "just a quick JOIN" becomes permanent coupling.
- **No data ownership**: if two services write same data, who wins? Define ownership.
- **Ignoring eventual consistency**: users see stale data. Design UI for it (optimistic updates).
