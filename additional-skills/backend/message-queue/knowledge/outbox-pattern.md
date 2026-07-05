---
type: fact
title: "Outbox Pattern"
---

# Outbox Pattern

Transactional outbox ensures atomicity between database write and event publication. Business data + event stored in same transaction; a separate process delivers events to the broker.

## The Dual-Write Problem

```
// BROKEN: dual-write
db.save(order)      // succeeds
broker.publish(event)  // fails -> DB has data, no event published
                       // OR: broker succeeds, DB transaction rolls back -> event without data
```

No combination of ordering solves this without distributed transactions (2PC) which most systems avoid for availability reasons.

## Solution: Transactional Outbox

```
BEGIN TRANSACTION
  INSERT INTO orders (id, status, ...) VALUES (...);
  INSERT INTO outbox_events (aggregate_id, event_type, payload) VALUES (...);
COMMIT
-- Separate process reads outbox_events, publishes to broker, marks delivered
```

Guarantee: if business data committed, event row exists. Event delivery is now an independent reliability problem (solved by the relay).

## Outbox Table Design

```sql
CREATE TABLE outbox_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(255) NOT NULL,   -- "Order", "Payment"
    aggregate_id    VARCHAR(255) NOT NULL,   -- entity ID (partition key for Kafka)
    event_type      VARCHAR(255) NOT NULL,   -- "OrderCreated", "PaymentCharged"
    payload         JSONB NOT NULL,          -- event data
    metadata        JSONB DEFAULT '{}',      -- correlation_id, trace_id, schema_version
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ             -- NULL = unpublished
);

-- For polling relay
CREATE INDEX idx_outbox_unpublished 
    ON outbox_events (created_at) 
    WHERE published_at IS NULL;

-- For CDC relay (Debezium reads WAL, no index needed for delivery)
-- But index still useful for monitoring unpublished count
```

## Delivery Methods

### Method 1: Polling Publisher (Simple)

```
Loop every 100ms:
  1. SELECT * FROM outbox_events WHERE published_at IS NULL ORDER BY created_at LIMIT 100
  2. For each event: publish to broker
  3. UPDATE outbox_events SET published_at = NOW() WHERE id IN (published_ids)
```

**Pros**: Simple, no external dependencies beyond DB + broker
**Cons**: Polling interval = latency floor, DB load from polling, requires leader election for single publisher

### Method 2: CDC-Based (Debezium)

```
Database WAL -> Debezium Connector -> Kafka Topic
```

**Pros**: Near-real-time (<1s), no polling load, leverages existing CDC infrastructure
**Cons**: Requires Kafka Connect + Debezium operational knowledge, more infrastructure

### Method 3: Listen/Notify (PostgreSQL)

```sql
-- Trigger on outbox insert
CREATE OR REPLACE FUNCTION notify_outbox() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('outbox_channel', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outbox_notify AFTER INSERT ON outbox_events
  FOR EACH ROW EXECUTE FUNCTION notify_outbox();
```

**Pros**: Real-time notification, no polling
**Cons**: Notification can be lost (at-most-once), needs polling fallback

### Recommended: CDC + Polling Fallback
- Primary: CDC delivers events in near-real-time
- Fallback: polling job catches any CDC misses (belt + suspenders)
- Monitor: unpublished events older than 30s = alert

## Exactly-Once Delivery

The outbox guarantees at-least-once publication (relay retries until published). Consumer idempotency handles the "at least once" -> "effectively once" conversion.

### Relay Idempotency
- Relay crash after publish, before marking published_at = re-publish on restart
- Consumer receives duplicate -> dedup via message ID (outbox event ID)
- Outbox event ID as Kafka message key or header = natural dedup

## Cleanup Strategies

```sql
-- Option 1: Delete after publication + retention window
DELETE FROM outbox_events 
WHERE published_at IS NOT NULL 
AND published_at < NOW() - INTERVAL '7 days';

-- Option 2: Partition by month, drop old partitions
CREATE TABLE outbox_events (
    ...
) PARTITION BY RANGE (created_at);

-- Option 3: CDC + immediate delete (Debezium captures before delete)
-- Debezium reads INSERT from WAL, then row can be deleted immediately
DELETE FROM outbox_events WHERE published_at IS NOT NULL;
```

## Multi-Aggregate Transactions

When a single transaction affects multiple aggregates:
```sql
BEGIN;
  UPDATE orders SET status = 'paid' WHERE id = $1;
  UPDATE inventory SET reserved = reserved - $2 WHERE sku = $3;
  -- One outbox event per aggregate
  INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
  VALUES ('Order', $1, 'OrderPaid', ...),
         ('Inventory', $3, 'StockReleased', ...);
COMMIT;
```

Each event routes to its own topic (via aggregate_type), maintaining per-entity ordering.

## Monitoring

- Unpublished count: `SELECT COUNT(*) FROM outbox_events WHERE published_at IS NULL`
- Max unpublished age: `SELECT MAX(NOW() - created_at) FROM outbox_events WHERE published_at IS NULL`
- Throughput: events published per second
- Alert: unpublished events > 0 for > 30 seconds (relay stuck or dead)

## Verification Checklist

- [ ] Outbox insert in same transaction as business write (verified by reading code)
- [ ] Relay delivers all events within SLA (e.g., <5s from commit to broker)
- [ ] Relay crash recovery tested: restart picks up unpublished events
- [ ] Consumer idempotency handles relay re-delivery
- [ ] Cleanup job prevents unbounded table growth
- [ ] Monitoring: alert on unpublished age > threshold
- [ ] Event ordering preserved per aggregate_id
