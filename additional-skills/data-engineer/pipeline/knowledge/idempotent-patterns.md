---
type: fact
title: "Idempotent Patterns"
---

# Idempotent Patterns

Exactly-once semantics, deduplication strategies, and merge patterns for reliable data pipelines.

## Why Idempotency Matters

An idempotent pipeline produces the same result whether run once or multiple times with the same input. Critical for:
- Retry on failure (no duplicates)
- Backfill (reprocess without corruption)
- Orchestrator re-runs (scheduler triggers twice)
- Exactly-once guarantees without distributed transactions

## Core Patterns

### 1. DELETE + INSERT (Partition Overwrite)

Replace an entire partition atomically. Simplest idempotent pattern.

```sql
-- Atomic in BigQuery
CREATE OR REPLACE TABLE target PARTITION (date = '2026-01-15') AS
SELECT * FROM source WHERE date = '2026-01-15';

-- PostgreSQL equivalent
BEGIN;
DELETE FROM target WHERE partition_date = '2026-01-15';
INSERT INTO target SELECT * FROM source WHERE date = '2026-01-15';
COMMIT;
```

**When**: daily/hourly batch loads, small-medium partitions
**Trade-off**: rewrites entire partition even if only 1 row changed

### 2. MERGE (Upsert)

Insert new rows, update existing ones. Preserves untouched data.

```sql
MERGE INTO target t
USING source s
ON t.id = s.id
WHEN MATCHED THEN UPDATE SET
    t.amount = s.amount,
    t.status = s.status,
    t.updated_at = s.updated_at
WHEN NOT MATCHED THEN INSERT (id, amount, status, created_at, updated_at)
VALUES (s.id, s.amount, s.status, s.created_at, s.updated_at);
```

**When**: incremental loads where source provides full current state
**Requires**: reliable unique key

### 3. INSERT with Deduplication Key

Insert only if not already present.

```sql
INSERT INTO target (id, amount, status, processed_at)
SELECT id, amount, status, NOW()
FROM source
WHERE NOT EXISTS (
    SELECT 1 FROM target WHERE target.id = source.id
);
```

Or with `ON CONFLICT`:

```sql
INSERT INTO target (id, amount, status)
VALUES ($1, $2, $3)
ON CONFLICT (id) DO NOTHING;
```

**When**: append-only sinks where you want dedup without update

### 4. Staging + Swap

Load into staging table, validate, then swap names atomically.

```sql
CREATE TABLE target_staging AS SELECT * FROM transform_query;
-- Validate: row count, schema, business rules
ALTER TABLE target RENAME TO target_old;
ALTER TABLE target_staging RENAME TO target;
DROP TABLE target_old;
```

**When**: full-refresh tables where you need zero-downtime swap
**Risk**: not truly atomic on all warehouses (brief moment with no table)

### 5. Deduplication at Read Time

Write with potential duplicates, dedup on query.

```sql
-- Write layer: always INSERT (fast, simple)
INSERT INTO events_raw (event_id, data, received_at) VALUES (...);

-- Read layer: dedup with ROW_NUMBER
CREATE VIEW events AS
SELECT * EXCEPT(rn) FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at DESC) AS rn
    FROM events_raw
) WHERE rn = 1;
```

**When**: high-throughput ingestion where write-time dedup is too expensive
**Trade-off**: storage overhead, query-time cost

## Deduplication Strategies

### Source-Level Dedup

```python
def deduplicate_batch(records: list[dict], key_field: str) -> list[dict]:
    seen = set()
    deduped = []
    for record in records:
        key = record[key_field]
        if key not in seen:
            seen.add(key)
            deduped.append(record)
    return deduped
```

### Database-Level Dedup

```sql
-- Periodic cleanup job
DELETE FROM events
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at DESC) AS rn
        FROM events
    ) dupes
    WHERE rn > 1
);
```

### Bloom Filter for Approximate Dedup

For high-volume streams where exact dedup is expensive:
- Maintain bloom filter of processed IDs
- Check before processing
- False positives (skip some new records) acceptable for the scale trade-off
- Periodically rebuild from sink state

## Exactly-Once Delivery Patterns

### Transactional Outbox

```sql
BEGIN;
INSERT INTO orders (id, ...) VALUES (...);
INSERT INTO outbox (event_id, topic, payload) VALUES (...);
COMMIT;
-- Background worker: read outbox -> publish to Kafka -> mark as sent
```

### Idempotency Keys

```python
def process_payment(idempotency_key: str, amount: Decimal) -> Result:
    existing = db.query(
        "SELECT result FROM processed_payments WHERE idempotency_key = %s",
        (idempotency_key,)
    )
    if existing:
        return existing.result

    result = payment_gateway.charge(amount)

    db.execute(
        "INSERT INTO processed_payments (idempotency_key, result) VALUES (%s, %s)",
        (idempotency_key, result)
    )
    return result
```

## Choosing a Pattern

| Scenario | Pattern |
|----------|---------|
| Daily batch, full partition available | DELETE + INSERT |
| Incremental with updates | MERGE |
| Append-only, must dedup | INSERT ON CONFLICT DO NOTHING |
| Full refresh, zero downtime | Staging + Swap |
| High throughput, dedup expensive | Dedup at read time |
| Stream processing | Idempotency key + upsert sink |

## Anti-Patterns

- INSERT without dedup strategy (duplicates accumulate silently)
- MERGE without proper unique key (creates duplicates on key collision)
- DELETE + INSERT without transaction (readers see empty table briefly)
- Relying on processing order for dedup (distributed systems have no global order)
- Using timestamp as sole dedup key (clock skew causes issues)
