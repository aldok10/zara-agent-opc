---
type: fact
title: "Snowflake Patterns"
---

# Snowflake Patterns

Compute, caching, time travel, and cost optimization patterns for Snowflake.

## Virtual Warehouses

### Sizing

| Size | Nodes | Credits/Hour | Use Case |
|------|-------|--------------|----------|
| X-Small | 1 | 1 | Dev/test, light queries |
| Small | 2 | 2 | Single-user analytics |
| Medium | 4 | 4 | BI dashboards |
| Large | 8 | 8 | Complex transforms |
| X-Large+ | 16+ | 16+ | Heavy ETL, large scans |

**Scaling up**: bigger warehouse = faster single query (parallelism).
**Scaling out** (multi-cluster): more concurrent queries without queuing.

### Configuration

```sql
CREATE WAREHOUSE etl_wh
    WAREHOUSE_SIZE = 'MEDIUM'
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE
    MIN_CLUSTER_COUNT = 1
    MAX_CLUSTER_COUNT = 3
    SCALING_POLICY = 'ECONOMY'
    INITIALLY_SUSPENDED = TRUE;

CREATE WAREHOUSE bi_wh
    WAREHOUSE_SIZE = 'SMALL'
    AUTO_SUSPEND = 300
    AUTO_RESUME = TRUE
    STATEMENT_TIMEOUT_IN_SECONDS = 300;
```

**Key decisions**:
- Separate warehouses for ETL and BI (prevent contention)
- `AUTO_SUSPEND` = 60s for ETL (frequent, bursty); 300s for BI (interactive)
- `ECONOMY` scaling: add clusters only when queue builds; `STANDARD`: add immediately

## Caching Layers

### Result Cache

- Free, 24-hour TTL per identical query (same SQL text + same role + unchanged data)
- No warehouse needed to serve cached results
- Invalidated by underlying table changes

### Local Disk Cache (SSD)

- Warehouse-local; lost on suspend
- Caches micro-partitions from remote storage
- Why `AUTO_SUSPEND` = 300s for BI: keeps warm cache for repeated patterns

### Metadata Cache

- Column min/max, distinct count, NULL count per micro-partition
- Enables partition pruning without scanning data
- Always active, no configuration needed

## Time Travel

```sql
-- Query historical data (up to 90 days on Enterprise)
SELECT * FROM orders AT (TIMESTAMP => '2026-01-15 10:00:00'::TIMESTAMP_LTZ);
SELECT * FROM orders AT (OFFSET => -3600);
SELECT * FROM orders BEFORE (STATEMENT => '<query_id>');

-- Restore dropped table
UNDROP TABLE orders;

-- Clone at point in time (zero-copy)
CREATE TABLE orders_backup CLONE orders AT (TIMESTAMP => '2026-01-15 10:00:00'::TIMESTAMP_LTZ);
```

**Retention**: Standard = 1 day, Enterprise = up to 90 days. Storage cost applies.

## Zero-Copy Clones

```sql
CREATE DATABASE dev_db CLONE prod_db;
CREATE SCHEMA staging CLONE production;
CREATE TABLE test_orders CLONE orders;
```

- Instantaneous, no storage cost until divergence
- Use for: dev environments, testing, safe experimentation
- Clones share micro-partitions until data is modified

## Micro-Partition Pruning

Snowflake stores data in 50-500MB compressed micro-partitions with metadata (min/max per column).

```sql
-- Check pruning efficiency
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY())
WHERE query_id = '<id>';
-- Look at: partitions_scanned vs partitions_total
```

**Optimize pruning**:
- Cluster tables on filter columns
- Natural ordering (load data sorted by date) provides free clustering
- `ALTER TABLE t CLUSTER BY (date, tenant_id);`

## Streams and Tasks (CDC)

```sql
-- Stream captures changes on a table
CREATE STREAM orders_stream ON TABLE orders;

-- Task processes stream on schedule
CREATE TASK process_orders
    WAREHOUSE = etl_wh
    SCHEDULE = '1 MINUTE'
    WHEN SYSTEM$STREAM_HAS_DATA('orders_stream')
AS
    MERGE INTO orders_summary t
    USING (SELECT * FROM orders_stream) s
    ON t.order_id = s.order_id
    WHEN MATCHED AND s.METADATA$ACTION = 'INSERT' THEN UPDATE SET ...
    WHEN NOT MATCHED AND s.METADATA$ACTION = 'INSERT' THEN INSERT ...;

ALTER TASK process_orders RESUME;
```

## Cost Monitoring

```sql
-- Credit usage by warehouse
SELECT warehouse_name,
       SUM(credits_used) AS total_credits,
       SUM(credits_used) * 3.00 AS estimated_cost_usd
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE start_time > DATEADD(day, -30, CURRENT_TIMESTAMP())
GROUP BY 1 ORDER BY 2 DESC;

-- Most expensive queries
SELECT query_id, query_text, warehouse_name,
       total_elapsed_time / 1000 AS seconds,
       bytes_scanned / POW(1024, 3) AS gb_scanned
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time > DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY total_elapsed_time DESC
LIMIT 20;

-- Storage breakdown
SELECT TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME,
       ACTIVE_BYTES / POW(1024, 3) AS active_gb,
       TIME_TRAVEL_BYTES / POW(1024, 3) AS time_travel_gb,
       FAILSAFE_BYTES / POW(1024, 3) AS failsafe_gb
FROM SNOWFLAKE.ACCOUNT_USAGE.TABLE_STORAGE_METRICS
ORDER BY ACTIVE_BYTES DESC LIMIT 20;
```

## Dynamic Tables (2024+)

```sql
CREATE DYNAMIC TABLE daily_metrics
    TARGET_LAG = '1 hour'
    WAREHOUSE = etl_wh
AS
SELECT
    DATE_TRUNC('day', event_time) AS day,
    COUNT(*) AS events,
    COUNT(DISTINCT user_id) AS users
FROM raw_events
GROUP BY 1;
```

Declarative refresh -- Snowflake manages incremental pipeline. Replaces many Streams+Tasks patterns.
