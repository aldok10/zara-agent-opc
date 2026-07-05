# Change Data Capture

Debezium connectors, schema evolution, ordering guarantees, and CDC pipeline patterns.

## When to Load

- Setting up real-time data replication from databases
- Implementing event sourcing from existing transactional databases
- Handling schema evolution in CDC pipelines
- Troubleshooting ordering and consistency issues in CDC streams

## Key Concepts

**CDC Methods**
- Log-based (recommended): read database transaction log (binlog, WAL, redo log)
- Query-based: periodic polling with timestamp/version columns (simpler, less reliable)
- Trigger-based: database triggers write to change table (high overhead)
- Log-based is preferred: no performance impact on source, captures deletes, maintains order

**Debezium Architecture**
```
[Database] -> [Transaction Log] -> [Debezium Connector] -> [Kafka Topic] -> [Consumers]
```
- Runs as Kafka Connect source connector
- One connector per database (can capture multiple tables)
- Produces change events with before/after states
- Supports: PostgreSQL, MySQL, MongoDB, SQL Server, Oracle, Cassandra

**Event Structure**
```json
{
  "before": {"id": 1, "name": "old_value", "updated_at": "..."},
  "after": {"id": 1, "name": "new_value", "updated_at": "..."},
  "source": {
    "connector": "postgresql",
    "db": "orders_db",
    "table": "orders",
    "lsn": 123456789,
    "ts_ms": 1705334400000
  },
  "op": "u",
  "ts_ms": 1705334400100
}
```
- `op`: c (create), u (update), d (delete), r (read/snapshot)
- `before`: previous state (null for inserts)
- `after`: new state (null for deletes)
- `source.lsn`: log sequence number for ordering

**Schema Evolution Handling**
- Schema Registry: stores schema versions, provides compatibility checks
- Forward compatible: new fields with defaults (consumers ignore unknown fields)
- Backward compatible: removed fields had defaults (old consumers still work)
- Full compatible: both forward and backward (safest, most restrictive)

## Patterns

```json
// Debezium PostgreSQL connector configuration
{
  "name": "orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${secrets:pg-password}",
    "database.dbname": "orders_db",
    "topic.prefix": "cdc",
    "table.include.list": "public.orders,public.order_items",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_orders",
    "publication.name": "debezium_publication",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "transforms": "route",
    "transforms.route.type": "io.debezium.transforms.ByLogicalTableRouter",
    "transforms.route.topic.regex": "(.*)orders(.*)",
    "transforms.route.topic.replacement": "events.orders"
  }
}
```

**Ordering Guarantees**
- Within a partition: strict ordering by LSN/binlog position
- Across partitions: no ordering guarantee
- Strategy: use primary key as Kafka message key -- same record always same partition
- Multi-table: no cross-table ordering unless you use single-topic routing

**Sink Patterns**
- Upsert to data warehouse: use primary key for merge/upsert
- Materialized view: apply CDC events to rebuild current state
- Event sourcing: store all events, derive state on read
- Replication: mirror source database structure in target

## Gotchas

- PostgreSQL replication slots grow unbounded if consumer is down -- monitor disk usage
- Initial snapshot can take hours for large tables -- plan maintenance window
- DELETE events have null `after` -- sinks must handle this explicitly
- Schema changes (DDL) may pause CDC or require connector restart
- Timezone handling: source DB timezone vs event timestamp vs consumer timezone
- Transaction boundaries: Debezium can group events by transaction (transaction metadata topic)

## Verification

- Row count in source matches row count in sink (eventual consistency)
- No replication slot lag growing unbounded (monitor pg_stat_replication)
- Schema changes propagate without pipeline failure
- Order of operations preserved: insert -> update -> delete applied correctly
- After connector restart: no duplicate or missing events (check offsets)
