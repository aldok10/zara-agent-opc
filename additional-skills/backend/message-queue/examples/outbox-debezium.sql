-- Transactional Outbox Pattern: Schema + Debezium Connector Configuration
-- Ensures atomic event publication alongside business data changes.

-- ============================================================
-- 1. OUTBOX TABLE SCHEMA (PostgreSQL)
-- ============================================================

CREATE TABLE IF NOT EXISTS outbox_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(255) NOT NULL,   -- e.g., "Order", "Payment", "User"
    aggregate_id    VARCHAR(255) NOT NULL,   -- Business entity ID (becomes Kafka key)
    event_type      VARCHAR(255) NOT NULL,   -- e.g., "OrderCreated", "PaymentCharged"
    payload         JSONB NOT NULL,          -- Event data (serialized event body)
    metadata        JSONB NOT NULL DEFAULT '{}', -- correlation_id, trace_id, schema_version
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for polling-based relay (fallback if CDC is down)
CREATE INDEX idx_outbox_created ON outbox_events (created_at);

-- Comment: Debezium reads WAL, so no "published_at" column needed for CDC approach.
-- The row exists momentarily; Debezium captures INSERT, then we delete.

-- ============================================================
-- 2. PROCESSED MESSAGES TABLE (Consumer Dedup)
-- ============================================================

CREATE TABLE IF NOT EXISTS processed_messages (
    message_id      VARCHAR(255) NOT NULL,
    consumer_group  VARCHAR(255) NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, consumer_group)
);

-- Cleanup: remove entries older than retention window
CREATE INDEX idx_processed_cleanup ON processed_messages (processed_at);

-- ============================================================
-- 3. EXAMPLE: Business write + outbox in same transaction
-- ============================================================

-- Application code executes this as a single transaction:
BEGIN;

INSERT INTO orders (id, user_id, status, total_amount, currency)
VALUES ('ord-123', 'usr-456', 'created', 99.99, 'USD');

INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload, metadata)
VALUES (
    'Order',
    'ord-123',
    'OrderCreated',
    '{"order_id": "ord-123", "user_id": "usr-456", "amount": 99.99, "currency": "USD", "items": [{"sku": "ITEM-1", "qty": 2}]}'::jsonb,
    '{"correlation_id": "req-abc-789", "schema_version": "1.0", "source": "order-service"}'::jsonb
);

COMMIT;

-- After Debezium captures the INSERT, cleanup:
-- DELETE FROM outbox_events WHERE id = '<captured-event-id>';

-- ============================================================
-- 4. DEBEZIUM CONNECTOR CONFIGURATION
-- ============================================================

-- Deploy via Kafka Connect REST API:
-- POST http://connect:8083/connectors

/*
{
  "name": "outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "db.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${file:/secrets/db-password.txt:password}",
    "database.dbname": "orders_db",
    "topic.prefix": "cdc",
    "table.include.list": "public.outbox_events",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_outbox",
    "publication.name": "dbz_outbox_pub",

    "snapshot.mode": "no_data",

    "tombstones.on.delete": false,
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter.schemas.enable": false,

    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.table.fields.additional.placement": "metadata:header,event_type:header",
    "transforms.outbox.route.by.field": "aggregate_type",
    "transforms.outbox.route.topic.replacement": "events.${routedByValue}",

    "schema.history.internal.kafka.topic": "schema-history.outbox",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",

    "errors.tolerance": "all",
    "errors.deadletterqueue.topic.name": "dlq.outbox-connector",
    "errors.deadletterqueue.context.headers.enable": true
  }
}
*/

-- ============================================================
-- 5. RESULTING KAFKA TOPICS
-- ============================================================

-- Given aggregate_type = "Order", events route to: events.Order
-- Given aggregate_type = "Payment", events route to: events.Payment
-- Message key = aggregate_id (ensures ordering per entity)
-- Message headers include: id (event UUID), event_type, metadata fields

-- ============================================================
-- 6. POSTGRESQL PUBLICATION (required for pgoutput plugin)
-- ============================================================

CREATE PUBLICATION dbz_outbox_pub FOR TABLE public.outbox_events;

-- Grant replication permissions to debezium user
-- ALTER ROLE debezium WITH REPLICATION;
-- GRANT SELECT ON public.outbox_events TO debezium;

-- ============================================================
-- 7. MONITORING QUERIES
-- ============================================================

-- Unpublished events (should be ~0 if Debezium is healthy)
-- If using polling fallback with published_at column:
-- SELECT COUNT(*) FROM outbox_events WHERE published_at IS NULL;

-- Replication slot health
SELECT slot_name, active, restart_lsn, confirmed_flush_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_bytes
FROM pg_replication_slots
WHERE slot_name = 'debezium_outbox';
