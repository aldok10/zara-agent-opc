# BigQuery Patterns

Cost-aware design patterns for Google BigQuery: partitioning, clustering, slot management, and cost control.

## Partitioning

### Time-based Partitioning

```sql
CREATE TABLE analytics.events (
    event_id STRING NOT NULL,
    user_id STRING,
    event_name STRING,
    properties JSON,
    event_timestamp TIMESTAMP NOT NULL
)
PARTITION BY DATE(event_timestamp)
CLUSTER BY user_id, event_name
OPTIONS (
    partition_expiration_days = 365,
    require_partition_filter = true
);
```

**Key rules**:
- Always partition fact tables by timestamp column
- `require_partition_filter = true` prevents accidental full scans
- Max 4,000 partitions per table (daily = ~11 years, hourly = ~166 days)
- Ingestion-time partitioning (`_PARTITIONTIME`) when source lacks reliable timestamp

### Integer Range Partitioning

```sql
CREATE TABLE warehouse.customers (
    customer_id INT64,
    name STRING,
    segment STRING
)
PARTITION BY RANGE_BUCKET(customer_id, GENERATE_ARRAY(0, 10000000, 100000));
```

Use for: tables without natural timestamp but with numeric distribution key.

## Clustering

Clustering sorts data within partitions by up to 4 columns. Free to define, automatically maintained.

```sql
CREATE TABLE analytics.page_views (
    view_timestamp TIMESTAMP,
    tenant_id STRING,
    page_path STRING,
    user_id STRING,
    duration_ms INT64
)
PARTITION BY DATE(view_timestamp)
CLUSTER BY tenant_id, page_path, user_id;
```

**Column order matters**: most filtered column first. Clustering provides benefit for:
- Filter predicates (WHERE)
- Aggregate GROUP BY columns
- JOIN keys

**Re-clustering**: BigQuery auto-reclusters. For bulk loads, clustering may degrade temporarily.

## Slot Management

### On-Demand vs Editions

| Model | Pricing | Best For |
|-------|---------|----------|
| On-demand | $6.25/TB scanned | Unpredictable, low-volume |
| Standard | $0.04/slot-hour (100 slot min) | Predictable workloads |
| Enterprise | $0.06/slot-hour | Autoscaling, multi-region |
| Enterprise Plus | $0.10/slot-hour | Baseline guarantees, priority |

### Reservation Architecture

```
Organization
  └── Reservation (capacity commitment)
       └── Assignment (project/folder/org -> reservation)
            └── Jobs compete for slots within reservation
```

- Separate reservations for ETL vs BI to prevent resource contention
- Use autoscaling with `max_slots` cap for burst workloads
- Monitor `INFORMATION_SCHEMA.JOBS` for slot utilization

## Cost Control

### Query Cost Estimation

```sql
-- Dry run to estimate bytes scanned (no cost)
-- Use bq CLI: bq query --dry_run "SELECT ..."
-- Or BigQuery API with dryRun=true

-- Check bytes billed after execution
SELECT
    job_id,
    total_bytes_billed,
    total_slot_ms,
    ROUND(total_bytes_billed / POW(2, 40) * 6.25, 4) AS estimated_cost_usd
FROM `region-us`.INFORMATION_SCHEMA.JOBS
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
ORDER BY total_bytes_billed DESC
LIMIT 20;
```

### Cost Reduction Tactics

1. **Partition pruning**: always filter on partition column
2. **Column selection**: never SELECT * -- columnar storage charges per column scanned
3. **Materialized views**: auto-refresh, query rewrite, reduces repeated scans
4. **BI Engine**: in-memory acceleration for dashboards (up to 250GB/project)
5. **Clustering**: reduces bytes scanned for filtered queries by 30-80%
6. **Query result caching**: free for 24h (same query, same user, deterministic results)
7. **Custom cost controls**: per-user quotas, per-project bytes limits

### Budget Alerts

```sql
-- Set maximum bytes billed per query
-- In SQL: not directly supported; use API/CLI
-- bq query --maximum_bytes_billed=10000000000 "SELECT ..."
```

## Materialized Views

```sql
CREATE MATERIALIZED VIEW analytics.daily_user_metrics
PARTITION BY date
CLUSTER BY user_id
AS
SELECT
    DATE(event_timestamp) AS date,
    user_id,
    COUNT(*) AS event_count,
    COUNTIF(event_name = 'purchase') AS purchase_count,
    SUM(CAST(JSON_VALUE(properties, '$.amount') AS NUMERIC)) AS total_amount
FROM analytics.events
GROUP BY 1, 2;
```

**Constraints**: single table source, no JOINs, limited functions, no HAVING.
**Refresh**: automatic (incremental) or manual. Max staleness configurable.
**Query rewrite**: optimizer automatically routes compatible queries to MV.

## INFORMATION_SCHEMA Queries

```sql
-- Table storage and partitioning info
SELECT table_name, total_rows, total_logical_bytes, total_physical_bytes
FROM `project.dataset`.INFORMATION_SCHEMA.TABLE_STORAGE
ORDER BY total_physical_bytes DESC;

-- Partition details
SELECT table_name, partition_id, total_rows, total_logical_bytes
FROM `project.dataset`.INFORMATION_SCHEMA.PARTITIONS
WHERE table_name = 'events'
ORDER BY partition_id DESC
LIMIT 30;

-- Slot utilization over time
SELECT
    TIMESTAMP_TRUNC(period_start, HOUR) AS hour,
    SUM(period_slot_ms) / 3600000 AS avg_slots_used
FROM `region-us`.INFORMATION_SCHEMA.JOBS_TIMELINE
WHERE period_start > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY 1 ORDER BY 1;
```

## Anti-Patterns

- Streaming inserts for batch-friendly workloads (10x cost vs batch load)
- Daily full-table scans without partition filter
- Storing normalized OLTP schemas (join-heavy queries are expensive)
- Using BigQuery as a transaction database (no row-level locking)
- Ignoring physical bytes vs logical bytes (compression ratio affects storage cost)
