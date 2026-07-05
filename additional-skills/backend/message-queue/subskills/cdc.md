---
type: subskill
title: "Change Data Capture (CDC)"
---

# Change Data Capture (CDC)

Capture database changes as events. Stream row-level inserts, updates, deletes from database transaction log to message broker. Enables event-driven architecture without modifying application code.

## Debezium

### Architecture
```
[Database WAL] -> [Debezium Connector] -> [Kafka Topic] -> [Consumers]
     (source)        (Kafka Connect)       (per-table)      (sinks)
```

- Reads database transaction log (WAL/binlog/redo log) -- no polling, no triggers
- Captures: INSERT, UPDATE (before + after), DELETE (before image)
- Exactly-once within Kafka via Kafka Connect offset management
- Supported databases: PostgreSQL, MySQL, MongoDB, SQL Server, Oracle, Cassandra

### Connector Configuration (PostgreSQL)
```json
{
  "name": "pg-orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "db.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${secrets:pg-password}",
    "database.dbname": "orders",
    "topic.prefix": "cdc.orders",
    "table.include.list": "public.orders,public.order_items",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_orders",
    "publication.name": "dbz_publication",
    "snapshot.mode": "initial",
    "tombstones.on.delete": true,
    "decimal.handling.mode": "string",
    "schema.history.internal.kafka.topic": "schema-history.orders",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:9092"
  }
}
```

### Snapshot Modes
| Mode | Behavior | Use Case |
|------|----------|----------|
| initial | Full snapshot on first start, then streaming | New connector setup |
| initial_only | Snapshot only, no streaming | One-time migration |
| no_data | Schema only, stream from current position | Existing consumers caught up |
| when_needed | Snapshot if offsets lost | Recovery after failure |
| incremental | Chunk-based, non-locking snapshots | Large tables without downtime |

## Outbox Pattern with CDC

### Why Outbox
- Problem: dual-write (DB + broker) = inconsistency on partial failure
- Solution: write event to outbox table in same DB transaction as business data
- CDC reads outbox table changes, publishes to broker
- Guarantees: if business data committed, event will be published (eventually)

### Outbox Table Schema
```sql
CREATE TABLE outbox_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(255) NOT NULL,
    aggregate_id    VARCHAR(255) NOT NULL,
    event_type      VARCHAR(255) NOT NULL,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at) WHERE published_at IS NULL;
```

### Debezium Outbox Event Router
```json
{
  "transforms": "outbox",
  "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
  "transforms.outbox.table.field.event.id": "id",
  "transforms.outbox.table.field.event.key": "aggregate_id",
  "transforms.outbox.table.field.event.type": "event_type",
  "transforms.outbox.table.field.event.payload": "payload",
  "transforms.outbox.route.by.field": "aggregate_type",
  "transforms.outbox.route.topic.replacement": "events.${routedByValue}"
}
```

## Schema History

- Debezium tracks DDL changes in schema history topic
- Required for: parsing WAL entries after schema changes
- Never delete schema history topic (connector won't restart without it)
- Compaction: enabled on schema history topic (retains latest per key)
- Schema Registry integration: publish Avro/Protobuf schemas for CDC events

## Single Message Transforms (SMTs)

| Transform | Purpose |
|-----------|---------|
| `ExtractNewRecordState` | Flatten envelope to just after-state |
| `EventRouter` | Route outbox events to per-aggregate topics |
| `Filter` | Drop events by condition (SQL-like predicate) |
| `MaskField` | Redact sensitive fields (PII masking) |
| `TimestampRouter` | Route to time-partitioned topics |
| `RenameField` | Rename fields for downstream compatibility |

## Operational Concerns

### Replication Slot Management (PostgreSQL)
- Slot retains WAL until consumer confirms -- disk can fill if connector is down
- Monitor: `pg_replication_slots` view for `active` status and `confirmed_flush_lsn`
- Alert if slot lag > threshold (WAL accumulation)
- Drop orphaned slots if connector permanently removed

### Connector Failure Recovery
1. Connector stores offsets in Kafka Connect internal topic
2. On restart: resume from last committed offset (no duplicate, no gap)
3. If offsets lost: `snapshot.mode=when_needed` triggers re-snapshot
4. Incremental snapshot (Debezium 2.0+): chunk-based, no table locks, signaling table

### Performance Tuning
- `max.batch.size`: events per poll cycle (default 2048)
- `poll.interval.ms`: time between WAL polls (default 500ms)
- `max.queue.size`: internal buffer before Kafka write (default 8192)
- Parallel consumers on CDC topics for high-throughput processing

## CDC Alternatives

| Tool | Approach | Notes |
|------|----------|-------|
| Debezium | Log-based (WAL) | Most mature, Kafka-native |
| AWS DMS | Managed CDC | AWS-to-AWS, less flexible transforms |
| Fivetran/Airbyte | SaaS CDC | Analytics focus, not real-time events |
| pg_logical | Native PG | Raw WAL decoding, no transform layer |
| Maxwell | MySQL binlog | Lightweight, JSON output |

## Verification Checklist

- [ ] Replication slot monitored -- alert on lag > N bytes or inactive
- [ ] Schema history topic exists with compaction enabled
- [ ] Outbox table has index on unpublished rows (if polling fallback)
- [ ] Connector offset topic has replication factor >= 3
- [ ] Incremental snapshot configured for large tables
- [ ] PII fields masked via SMT before publishing to topic
- [ ] Dead letter topic configured on connector for malformed rows
- [ ] Tested: connector restart recovers without data loss or duplication
