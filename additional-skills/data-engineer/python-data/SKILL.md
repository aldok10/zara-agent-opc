---
name: python-data
description: "Python for data: Polars, DuckDB, Arrow, type-safe pipelines, local analytics"
---

# Python Data Expert

Python for data processing. Polars-first, DuckDB for local analytics, Arrow for interchange, type-safe pipelines.

## Scope

- DataFrame processing: Polars (preferred), pandas (legacy maintenance)
- Local analytical queries: DuckDB
- Data interchange: Apache Arrow, Parquet, IPC
- Type-safe pipeline code: dataclasses, Pydantic, TypedDict
- Memory-efficient processing: streaming, chunked reads, lazy evaluation
- File format selection: Parquet, Avro, JSON Lines, CSV
- Integration with warehouses and object stores (S3, GCS)

## First Action

1. Check existing dependencies (`pyproject.toml`, `requirements.txt`) for current DataFrame library
2. Identify data volumes and whether processing fits in memory
3. Determine if pipeline is batch or streaming
4. Check Python version (3.11+ required for modern typing)

## Constraints

1. Use Polars over pandas for new projects; it is faster, has cleaner API, and better memory management.
2. Use DuckDB for local analytics, ad-hoc queries, and Parquet file exploration; it outperforms pandas for SQL-style operations.
3. Use Apache Arrow as the interchange format between systems; avoid CSV for internal data movement.
4. All pipeline functions must have type annotations; use `pl.DataFrame`, `pl.LazyFrame`, or Pydantic models.
5. Prefer Polars lazy mode (`scan_parquet`, `lazy()`) for operations on large datasets; collect only at boundaries.
6. Use Parquet with snappy compression as default file format; CSV only for human-readable exports.
7. Validate input data at pipeline entry points with schema checks (Polars schema, Pydantic, Pandera).
8. Never load entire datasets into memory when streaming/chunked processing is possible.
9. Use expression-based API in Polars (`pl.col()`, `pl.when()`) over map/apply for performance.
10. Pin all data library versions exactly; minor version bumps can change behavior (especially pandas).
11. Prefer `uv` for dependency management; it resolves faster and handles data science deps correctly.
12. Use structured logging (structlog) in pipeline code; never print() for production observability.
13. DuckDB queries on Parquet files push down predicates automatically; filter in SQL, not after loading.
14. Test data transformations with small fixture DataFrames; assert on schema AND values.

## DO NOT

- Use pandas for new projects when Polars or DuckDB can handle the workload
- Use `df.apply()` with Python functions; use vectorized expressions or Arrow UDFs
- Load CSV files larger than 100MB without chunking or streaming
- Use pickle for data serialization; use Parquet or Arrow IPC
- Ignore memory profiling for pipelines processing >1GB
- Mix pandas and Polars in the same pipeline without explicit Arrow conversion
- Use `infer_schema` in production; always specify dtypes explicitly
- Write pipelines without input/output schema validation
- Use global state or mutable shared DataFrames across pipeline stages

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| SQL optimization, database queries | `../sql` |
| Pipeline orchestration, scheduling | `../orchestration` |
| Data validation, quality checks | `../quality` |
| Streaming data processing | `../streaming` |
| Warehouse loading/unloading | `../warehouse` |

## Verification

- Pipeline processes test fixtures with correct output schema and values
- Memory usage stays within 2x input data size for in-memory operations
- Lazy evaluation confirmed (no premature `.collect()` calls)
- Type checker passes (mypy/pyright) on all pipeline code
- Parquet output has expected row counts, column types, and compression
- DuckDB queries use predicate pushdown (check EXPLAIN)

## Knowledge

- `knowledge/polars.md` -- expressions, lazy frames, window functions, custom dtypes
- `knowledge/duckdb.md` -- SQL on files, Arrow integration, extensions
- `knowledge/arrow.md` -- IPC, Flight, zero-copy, schema evolution
- `knowledge/parquet.md` -- row groups, predicate pushdown, statistics, partitioning

## AI-Era Context (2026)

- Polars 1.x stable API; migration from pandas is well-documented with `polars.from_pandas()`
- DuckDB extensions (spatial, iceberg, delta) turn it into a local lakehouse query engine
- Arrow Flight SQL replaces JDBC/ODBC for high-throughput data transfer between services
- Type-safe pipelines with Pydantic v2 + Polars schema validation catch errors at compile time
- LLM-generated pandas code is often inefficient; convert to Polars expressions for production
- Narwhals library provides DataFrame-agnostic code across Polars/pandas/cuDF backends

## Related Skills

- `python-expert` -- general Python engineering patterns
- `data-engineer/pipeline` -- pipeline architecture and patterns
- `data-engineer/quality` -- data validation frameworks
