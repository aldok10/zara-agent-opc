---
type: subskill
title: "DuckDB"
---

# DuckDB

Local OLAP queries, SQL on files, Python integration, and embedded analytical database patterns.

## When to Load

- Running analytical queries on local files (Parquet, CSV, JSON)
- Prototyping data pipelines without spinning up a warehouse
- Embedding analytical queries in Python applications
- Replacing pandas for SQL-heavy data exploration

## Key Concepts

**What DuckDB Excels At**
- Single-node OLAP: columnar engine optimized for analytical queries
- Zero-copy integration with pandas, Polars, Arrow
- Direct queries on files (Parquet, CSV, JSON, S3) without loading
- In-process: no server to manage, embeds in your application
- Full SQL support including window functions, CTEs, lateral joins

**When to Use DuckDB vs Alternatives**
- DuckDB: local analysis, single-machine data < ~100GB, prototyping
- Polars: Python-native DataFrame operations, streaming large files
- Spark: distributed processing, multi-TB datasets, cluster available
- BigQuery/Snowflake: production warehouse, multi-user, governance

**Connection Modes**
- In-memory: `duckdb.connect()` -- fastest, lost on close
- Persistent: `duckdb.connect("my.db")` -- stored on disk, reusable
- Read-only: `duckdb.connect("my.db", read_only=True)` -- concurrent reads

## Patterns

```python
import duckdb

con = duckdb.connect()

# Query Parquet files directly (local or S3)
result = con.sql("""
    SELECT
        date_trunc('month', order_date) AS month,
        customer_segment,
        SUM(amount) AS total_revenue,
        COUNT(DISTINCT customer_id) AS unique_customers
    FROM read_parquet('data/orders/**/*.parquet', hive_partitioning=true)
    WHERE order_date >= '2024-01-01'
    GROUP BY ALL
    ORDER BY month, total_revenue DESC
""").fetchdf()

# Query S3 directly
con.sql("""
    SELECT * FROM read_parquet('s3://bucket/path/*.parquet')
    LIMIT 1000
""")

# Interop with pandas/polars
import polars as pl

df = pl.read_parquet("customers.parquet")
result = con.sql("""
    SELECT segment, COUNT(*) as cnt
    FROM df
    GROUP BY segment
""").pl()  # returns Polars DataFrame
```

```python
# Persistent database for pipeline results
con = duckdb.connect("analytics.db")

con.sql("""
    CREATE OR REPLACE TABLE monthly_metrics AS
    SELECT
        date_trunc('month', event_time) AS month,
        event_type,
        COUNT(*) AS event_count
    FROM read_parquet('events/*.parquet')
    GROUP BY ALL
""")

# Later: query the materialized results
con.sql("SELECT * FROM monthly_metrics WHERE month = '2024-06-01'")
```

**Advanced Features**
```python
# Window functions
con.sql("""
    SELECT
        customer_id,
        order_date,
        amount,
        SUM(amount) OVER (
            PARTITION BY customer_id
            ORDER BY order_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_total,
        amount - LAG(amount) OVER (
            PARTITION BY customer_id ORDER BY order_date
        ) AS amount_change
    FROM orders
""")

# Pivot tables
con.sql("""
    PIVOT orders
    ON status
    USING SUM(amount)
    GROUP BY customer_segment
""")
```

## Gotchas

- Single-writer: only one process can write to a persistent database at a time
- Memory: large queries may OOM -- use `SET memory_limit='4GB'` to control
- S3 access needs credentials configured (env vars or `SET s3_access_key_id=...`)
- File globs: `**/*.parquet` is recursive; `*.parquet` is current directory only
- Hive partitioning must be explicitly enabled for partitioned directories
- Concurrent reads work, but not concurrent reads + writes

## Verification

- Query results match expected output for known test data
- File queries work without pre-loading (scan Parquet/CSV directly)
- Memory stays within limits for large file queries
- Persistent database survives restart and returns same results
- Integration: DataFrame round-trip (pandas -> DuckDB -> pandas) preserves data
