---
type: fact
title: "DuckDB Analytics"
---

# DuckDB Analytics

In-process OLAP database for analytical queries. SQL on local files without a server.

## Core Concepts

DuckDB is an embedded columnar database (like SQLite for analytics). Runs in-process, reads Parquet/CSV/JSON directly, supports full SQL.

## Python Integration

```python
import duckdb

con = duckdb.connect()

# Query Parquet files directly (no loading step)
result = con.sql("""
    SELECT
        customer_id,
        COUNT(*) AS order_count,
        SUM(amount) AS total_amount
    FROM 'orders/*.parquet'
    GROUP BY customer_id
    HAVING total_amount > 10000
    ORDER BY total_amount DESC
    LIMIT 100
""").fetchdf()

# Query CSV with auto-detection
con.sql("SELECT * FROM read_csv_auto('data.csv') LIMIT 10").show()

# Query JSON
con.sql("SELECT * FROM read_json_auto('events.jsonl') WHERE type = 'purchase'")
```

## File Format Support

```python
# Parquet (best performance)
con.sql("SELECT * FROM 'data/**/*.parquet'")
con.sql("SELECT * FROM parquet_scan('s3://bucket/path/*.parquet', hive_partitioning=true)")

# CSV with explicit options
con.sql("""
    SELECT * FROM read_csv('data.csv',
        delim=',',
        header=true,
        columns={'id': 'INTEGER', 'name': 'VARCHAR', 'amount': 'DECIMAL(12,2)'},
        dateformat='%Y-%m-%d'
    )
""")

# JSON Lines
con.sql("SELECT * FROM read_json_auto('events.jsonl', format='newline_delimited')")

# Excel
con.sql("INSTALL spatial; LOAD spatial;")
con.sql("SELECT * FROM st_read('data.xlsx')")
```

## Polars and Pandas Interop

```python
import polars as pl
import pandas as pd

# DuckDB queries Polars DataFrames directly
df_polars = pl.read_parquet("orders.parquet")
result = con.sql("SELECT customer_id, SUM(amount) FROM df_polars GROUP BY 1").pl()

# DuckDB queries Pandas DataFrames directly
df_pandas = pd.read_csv("data.csv")
result = con.sql("SELECT * FROM df_pandas WHERE amount > 100").df()

# Output formats
con.sql("SELECT ...").fetchdf()     # pandas DataFrame
con.sql("SELECT ...").pl()          # polars DataFrame
con.sql("SELECT ...").fetchall()    # list of tuples
con.sql("SELECT ...").arrow()       # pyarrow Table
```

## Analytical SQL Features

```sql
-- Window functions
SELECT
    date,
    revenue,
    SUM(revenue) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) AS cumulative,
    LAG(revenue) OVER (ORDER BY date) AS prev_day,
    revenue - LAG(revenue) OVER (ORDER BY date) AS day_over_day
FROM daily_metrics;

-- QUALIFY (filter on window functions)
SELECT customer_id, order_date, amount
FROM orders
QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) = 1;

-- PIVOT
PIVOT sales ON month USING SUM(amount) GROUP BY product;

-- UNPIVOT
UNPIVOT monthly_metrics ON jan, feb, mar INTO NAME month VALUE amount;

-- List aggregation
SELECT customer_id, LIST(product_name ORDER BY purchase_date) AS purchase_history
FROM purchases
GROUP BY customer_id;

-- Struct access
SELECT data.user.name, data.user.email
FROM read_json_auto('events.jsonl');
```

## Performance

```python
# Persistent database (for reuse across sessions)
con = duckdb.connect("analytics.duckdb")

# Parallel execution (automatic, uses all cores)
con.sql("SET threads TO 8")

# Memory limit
con.sql("SET memory_limit = '4GB'")

# Export query results to Parquet
con.sql("COPY (SELECT ... FROM ...) TO 'output.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)")
```

## Common Patterns

### Data Profiling

```python
con.sql("""
    SELECT
        column_name,
        column_type,
        COUNT(*) AS total,
        COUNT(column_name) AS non_null,
        approx_count_distinct(column_name) AS unique_approx
    FROM (DESCRIBE SELECT * FROM 'data.parquet')
""")

# Quick stats
con.sql("SUMMARIZE SELECT * FROM 'data.parquet'").show()
```

### Incremental Aggregation

```python
con.sql("""
    CREATE OR REPLACE TABLE daily_summary AS
    SELECT
        DATE_TRUNC('day', event_time) AS day,
        event_type,
        COUNT(*) AS count,
        SUM(amount) AS total
    FROM 'events/*.parquet'
    WHERE event_time >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY ALL
""")
```

### S3 Access

```python
con.sql("""
    INSTALL httpfs; LOAD httpfs;
    SET s3_region = 'us-east-1';
    SET s3_access_key_id = 'xxx';
    SET s3_secret_access_key = 'xxx';
""")
con.sql("SELECT * FROM 's3://bucket/path/*.parquet' LIMIT 10")
```

## When to Use DuckDB

- Local analytics on Parquet/CSV files up to ~100GB
- Exploratory data analysis (faster than pandas for large files)
- Unit testing SQL transformations (embed in pytest)
- Data validation scripts
- Prototyping warehouse queries locally

## When NOT to Use

- Multi-user concurrent access (single-writer)
- Transactional workloads (no MVCC for concurrent writes)
- Data >RAM without careful memory management
- Production serving layer (use Postgres/warehouse instead)
