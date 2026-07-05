---
type: example
title: "Apache Iceberg Table with Schema Evolution"
---

# Apache Iceberg Table with Schema Evolution

## Context
When building a data lakehouse that needs ACID transactions, schema evolution without rewriting data, time travel queries, and partition evolution. Iceberg tables solve the "small files problem" and enable safe concurrent writes.

## Code/Template

### Create Iceberg Table (Spark SQL)

```sql
CREATE TABLE catalog.analytics.orders (
    order_id        STRING      NOT NULL,
    customer_id     STRING      NOT NULL,
    order_status    STRING      NOT NULL,
    total_amount    DECIMAL(12, 2),
    currency        STRING,
    items           ARRAY<STRUCT<
        sku: STRING,
        quantity: INT,
        unit_price: DECIMAL(10, 2)
    >>,
    shipping_address STRUCT<
        street: STRING,
        city: STRING,
        state: STRING,
        zip: STRING,
        country: STRING
    >,
    created_at      TIMESTAMP   NOT NULL,
    updated_at      TIMESTAMP
)
USING iceberg
PARTITIONED BY (days(created_at), order_status)
TBLPROPERTIES (
    'write.format.default' = 'parquet',
    'write.target-file-size-bytes' = '536870912',
    'write.metadata.compression-codec' = 'gzip',
    'read.split.target-size' = '134217728',
    'history.expire.max-snapshot-age-ms' = '604800000',
    'write.metadata.delete-after-commit.enabled' = 'true'
);
```

### Schema Evolution (no rewrite needed)

```sql
-- Add a new column (backward-compatible)
ALTER TABLE catalog.analytics.orders
ADD COLUMNS (
    discount_code STRING,
    discount_amount DECIMAL(10, 2)
);

-- Rename a column (metadata-only operation)
ALTER TABLE catalog.analytics.orders
RENAME COLUMN shipping_address TO delivery_address;

-- Widen a type (INT -> BIGINT)
ALTER TABLE catalog.analytics.orders
ALTER COLUMN items.quantity TYPE BIGINT;

-- Make a required field optional
ALTER TABLE catalog.analytics.orders
ALTER COLUMN currency DROP NOT NULL;
```

### Partition Evolution

```sql
-- Start: partitioned by day
-- Business grows, daily partitions too large
-- Evolve to hourly WITHOUT rewriting existing data
ALTER TABLE catalog.analytics.orders
ADD PARTITION FIELD hours(created_at);

-- Old data: still read via days(created_at) partitions
-- New data: written with hours(created_at) partitions
-- Iceberg handles both transparently in queries
```

### Time Travel Queries

```sql
-- Query data as of a specific timestamp
SELECT order_id, total_amount, order_status
FROM catalog.analytics.orders
TIMESTAMP AS OF '2026-07-01 00:00:00'
WHERE customer_id = 'cust_abc123';

-- Query a specific snapshot
SELECT COUNT(*), SUM(total_amount)
FROM catalog.analytics.orders
VERSION AS OF 3821550104612621;

-- View snapshot history
SELECT *
FROM catalog.analytics.orders.snapshots
ORDER BY committed_at DESC
LIMIT 10;

-- Rollback to a previous snapshot (undo bad write)
CALL catalog.system.rollback_to_snapshot('analytics.orders', 3821550104612621);
```

### Maintenance Operations

```sql
-- Expire old snapshots (keep 7 days for time travel)
CALL catalog.system.expire_snapshots(
    table => 'analytics.orders',
    older_than => TIMESTAMP '2026-06-28 00:00:00',
    retain_last => 10
);

-- Compact small files (solve small files problem)
CALL catalog.system.rewrite_data_files(
    table => 'analytics.orders',
    strategy => 'binpack',
    options => map(
        'target-file-size-bytes', '536870912',
        'min-file-size-bytes', '67108864',
        'max-file-size-bytes', '805306368'
    )
);

-- Rewrite manifests for faster planning
CALL catalog.system.rewrite_manifests('analytics.orders');

-- Remove orphan files (cleanup after failed writes)
CALL catalog.system.remove_orphan_files(
    table => 'analytics.orders',
    older_than => TIMESTAMP '2026-06-30 00:00:00'
);
```

### PySpark Write (Upsert / Merge)

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .config("spark.sql.catalog.catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.catalog.type", "glue") \
    .getOrCreate()

# Read incoming CDC data
incoming_df = spark.read.parquet("s3://raw/orders/2026-07-05/")

# Merge (upsert) into Iceberg table
incoming_df.createOrReplaceTempView("incoming_orders")

spark.sql("""
    MERGE INTO catalog.analytics.orders target
    USING incoming_orders source
    ON target.order_id = source.order_id
    WHEN MATCHED THEN UPDATE SET *
    WHEN NOT MATCHED THEN INSERT *
""")
```

## Key Points
- Schema evolution is metadata-only: adding columns, widening types, and renaming never rewrites data files. Old Parquet files remain untouched.
- Partition evolution lets you change partitioning strategy without migrating historical data. Iceberg's planning phase resolves which partition layout to use per file.
- Run compaction (`rewrite_data_files`) on a schedule (daily or after large batch loads) to maintain query performance. Without it, streaming ingestion creates thousands of small files.
