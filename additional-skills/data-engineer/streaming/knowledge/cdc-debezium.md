---
type: fact
title: "CDC with Debezium"
---

# CDC with Debezium

Change Data Capture setup, outbox pattern, Single Message Transforms, and schema evolution.

## What is CDC

CDC captures row-level changes (INSERT, UPDATE, DELETE) from database transaction logs and streams them as events. No polling, no application changes, sub-second latency.

## Architecture

```
PostgreSQL (WAL) / MySQL (binlog) / MongoDB (oplog)
    -> Debezium Connector (Kafka Connect)
        -> Kafka Topics (one per table)
            -> Downstream consumers (warehouse, search, cache)
```

## Connector Setup

### PostgreSQL

```json
{
    "name": "postgres-orders-connector",
    "config": {
        "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
        "database.hostname": "pg-primary.internal",
        "database.port": "5432",
        "database.user": "debezium",
        "database.password": "${secrets:pg-password}",
        "database.dbname": "app",
        "topic.prefix": "cdc.app",
        "schema.include.list": "public",
        "table.include.list": "public.orders,public.customers",
        "plugin.name": "pgoutput",
        "slot.name": "debezium_orders",
        "publication.name": "debezium_pub",
        "snapshot.mode": "initial",
        "tombstones.on.delete": true,
        "decimal.handling.mode": "string",
        "time.precision.mode": "adaptive_time_microseconds",
        "heartbeat.interval.ms": 10000,
        "key.converter": "io.confluent.connect.avro.AvroConverter",
        "value.converter": "io.confluent.connect.avro.AvroConverter",
        "key.converter.schema.registry.url": "http://schema-registry:8081",
        "value.converter.schema.registry.url": "http://schema-registry:8081"
    }
}
```

### Snapshot Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `initial` | Full snapshot then streaming | First deployment |
| `initial_only` | Snapshot only, no streaming | One-time migration |
| `no_data` | Schema only, stream from now | Already in sync, start fresh |
| `when_needed` | Snapshot if no offset exists | Fault-tolerant restart |
| `never` | Error if no offset | Strict -- must have prior state |

## Outbox Pattern

Don't expose raw CDC events to consumers. Use an outbox table for domain events.

### Application Side

```sql
CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Application writes in same transaction
BEGIN;
INSERT INTO orders (id, customer_id, amount, status)
VALUES ('ord-123', 'cust-456', 99.99, 'created');

INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
VALUES ('Order', 'ord-123', 'OrderCreated', '{"customer_id": "cust-456", "amount": 99.99}');
COMMIT;
```

### Debezium Outbox Configuration

```json
{
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.route.topic.replacement": "events.${routedByValue}",
    "transforms.outbox.table.fields.additional.placement": "aggregate_type:header"
}
```

Result: outbox rows become events on topic `events.Order` with key `ord-123`.

## Single Message Transforms (SMTs)

### Common Transforms

```json
{
    "transforms": "route,unwrap,mask",
    "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.route.regex": "cdc\\.app\\.public\\.(.*)",
    "transforms.route.replacement": "warehouse.$1",

    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": false,
    "transforms.unwrap.delete.handling.mode": "rewrite",
    "transforms.unwrap.add.fields": "op,source.ts_ms",

    "transforms.mask.type": "org.apache.kafka.connect.transforms.MaskField$Value",
    "transforms.mask.fields": "ssn,credit_card"
}
```

### ExtractNewRecordState

Flattens Debezium envelope (`before`, `after`, `source`, `op`) to just the `after` state. Simplifies downstream consumption.

## Schema Evolution

### Safe Changes (Backward Compatible)

- Add nullable column -> new field with default in Avro
- Add column with default -> new field with default
- Widen column (INT -> BIGINT) -> schema registry allows promotion

### Dangerous Changes

- Drop column -> breaks existing consumers reading that field
- Rename column -> appears as drop + add (data loss in CDC)
- Change type incompatibly -> schema registry rejects

### Strategy

1. Schema Registry set to BACKWARD compatibility
2. Add new columns with defaults
3. Deprecate old columns (stop writing) before removing
4. Use subject naming: `{topic}-value` for schema registry subjects

## Monitoring

| Metric | Alert |
|--------|-------|
| Replication slot lag (bytes) | >100MB |
| Connector status | != RUNNING |
| Source database WAL size | Growing unbounded |
| Snapshot progress | Stuck at same percentage |
| Heartbeat topic freshness | No heartbeat >30s |

## Operational Concerns

### PostgreSQL Replication Slots

- Slots prevent WAL cleanup until consumer reads past them
- If connector is down, WAL grows unbounded -> disk full
- Monitor `pg_replication_slots` and set `max_slot_wal_keep_size`

### Performance Impact

- CDC reads from WAL (not table data) -- minimal query impact
- Snapshot phase reads entire table -- schedule during low traffic
- Logical decoding adds ~5-10% CPU overhead on write-heavy databases

## Anti-Patterns

- Exposing raw CDC events (with `before`/`after` envelope) to business consumers
- Not using the outbox pattern for domain events
- Forgetting heartbeats (replication slot holds WAL during quiet periods)
- Running CDC from replica without checking logical replication support
- Ignoring schema evolution (column renames break consumers silently)
- No DLQ for connector -- poisoned messages block all consumption
