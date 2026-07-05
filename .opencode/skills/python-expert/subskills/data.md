---
type: subskill
title: "Data Processing & ETL"
---

# Data Processing & ETL

2026 stack: Polars for transforms, DuckDB for SQL-on-files, Parquet for storage, Arrow for interchange. Pandas is legacy.

## Polars (default engine)

Rust-based, lazy, multi-threaded  --  10–100x faster than Pandas. Use `scan_*` for lazy, `read_*` for eager.

```python
df = (
    pl.scan_parquet("events/*.parquet")   # lazy: nothing loads yet
    .filter(pl.col("amount") > 0)         # predicate pushdown
    .group_by("user_id")
    .agg(pl.col("amount").sum())
    .collect()                            # execute optimized plan
)
```

Lazy scan enables column pruning + predicate pushdown  --  reads only what's needed.

## DuckDB (SQL on files)

In-process, zero-config, queries Parquet/CSV/JSON directly. Zero-copy with Polars via Arrow.

```python
import duckdb
duckdb.sql("SELECT user_id, sum(amount) FROM 'events/*.parquet' GROUP BY 1")
# hand a Polars frame straight to SQL:
duckdb.sql("SELECT * FROM df WHERE amount > 100").pl()
```

## Parquet

Default format: columnar, compressed, schema embedded. Partition by date/key for pushdown. CSV is for human interchange only.

## ETL Shape

- Extract: `httpx` (APIs), `pl.scan_parquet` / `read_database`
- Transform: Polars expressions or DuckDB SQL (pick per readability)
- Load: bulk insert (`copy`), write partitioned Parquet to S3

## Validation

Validate at boundaries  --  bad data caught early is cheap.

```python
import pandera.polars as pa
schema = pa.DataFrameSchema({"amount": pa.Column(float, pa.Check.ge(0))})
schema.validate(df)
```

- Pandera: DataFrame schema/checks · Great Expectations: pipeline-level + docs · Pydantic: per-row/API payload

## Orchestration

- Dagster: asset-based, lineage-aware (modern default)
- Prefect: pythonic, dynamic flows
- Airflow: legacy but still dominant in enterprises

## Performance & Testing

Lazy eval, column pruning, predicate pushdown, parallel I/O  --  keep data columnar end-to-end. Test with fixture datasets, output snapshots, and property-based schema validation (Hypothesis + Pandera).

## Anti-Patterns

- CSV for serious/large workloads (use Parquet)
- Pandas on large data (use Polars/DuckDB)
- No schema validation → silent corruption downstream
- Cron-scripted ETL with no retries/observability (use an orchestrator)
- Eager `read_*` when `scan_*` + lazy plan would prune work
- Row-by-row `iterrows`/`apply` instead of vectorized expressions