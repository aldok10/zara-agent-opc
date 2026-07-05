---
type: subskill
title: "Lakehouse Architecture"
---

# Lakehouse Architecture

Apache Iceberg, Delta Lake, Apache Hudi -- table formats for reliable data lakes.

## When to Load

- Choosing between Iceberg, Delta Lake, and Hudi
- Implementing ACID transactions on object storage
- Setting up table compaction and maintenance
- Using time travel for debugging or rollback

## Key Concepts

**Table Format Comparison**
| Feature | Iceberg | Delta Lake | Hudi |
|---------|---------|------------|------|
| ACID Transactions | Yes | Yes | Yes |
| Time Travel | Yes | Yes | Yes |
| Schema Evolution | Full | Additive | Full |
| Partition Evolution | Yes (hidden) | No (rewrite) | No |
| Engine Support | Spark, Flink, Trino, Presto | Spark (best), some others | Spark, Flink |
| Catalog | Multi (REST, Hive, Glue) | Unity Catalog | Hive |
| Community | Apache, vendor-neutral | Databricks-led | Apache |

**When to Choose What**
- Iceberg: multi-engine environment, partition evolution needed, vendor-neutral
- Delta Lake: Databricks shop, tight Spark integration, Unity Catalog
- Hudi: incremental ingestion from CDC, record-level updates frequent

**Key Operations**
- Compaction: merge small files into optimal-size files (128-256MB)
- Snapshot expiration: remove old snapshots to reclaim storage
- Orphan file cleanup: remove files not referenced by any snapshot
- Sort order optimization: Z-order or Hilbert curve for multi-dimensional queries
- Partition evolution: change partitioning without rewriting data (Iceberg)

## Patterns

```sql
-- Iceberg: create table with hidden partitioning
CREATE TABLE prod.events (
    event_id BIGINT,
    event_time TIMESTAMP,
    user_id BIGINT,
    event_type STRING,
    payload STRING
)
USING iceberg
PARTITIONED BY (days(event_time), bucket(16, user_id));

-- Time travel query
SELECT * FROM prod.events VERSION AS OF 12345678;
SELECT * FROM prod.events TIMESTAMP AS OF '2024-01-15 10:00:00';

-- Schema evolution
ALTER TABLE prod.events ADD COLUMN source STRING AFTER event_type;
ALTER TABLE prod.events RENAME COLUMN payload TO event_data;

-- Partition evolution (no data rewrite!)
ALTER TABLE prod.events SET PARTITION SPEC (hours(event_time), bucket(16, user_id));
```

```python
# Iceberg maintenance in Spark
spark.sql("""
    CALL system.rewrite_data_files(
        table => 'prod.events',
        strategy => 'sort',
        sort_order => 'event_time ASC NULLS LAST, user_id ASC'
    )
""")

spark.sql("""
    CALL system.expire_snapshots(
        table => 'prod.events',
        older_than => TIMESTAMP '2024-01-01 00:00:00',
        retain_last => 5
    )
""")

spark.sql("CALL system.remove_orphan_files(table => 'prod.events')")
```

**Compaction Strategy**
- Schedule compaction during low-usage windows
- Target file size: 128-256MB (balance read performance vs write amplification)
- Partial compaction: only compact partitions with many small files
- Monitor: track average file size per partition, alert on degradation

## Gotchas

- Small files problem: streaming writes without compaction create thousands of tiny files
- Snapshot accumulation: each write creates a snapshot -- expire old ones regularly
- Concurrent writes: conflict resolution varies by table format
- Catalog locking: concurrent DDL can cause deadlocks -- serialize schema changes
- Object storage consistency: S3 is eventually consistent for overwrites (rare issue now)
- Delta Lake on non-Databricks Spark requires `delta-spark` package and compatible versions

## Verification

- Table scan query plans show partition pruning (not full table scan)
- File sizes are within target range after compaction
- Time travel queries return expected historical state
- Schema evolution doesn't break existing readers
- Snapshot count stays bounded (expiration running successfully)
