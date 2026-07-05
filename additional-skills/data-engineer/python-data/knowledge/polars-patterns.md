# Polars Patterns

Modern DataFrame library for Python/Rust. Lazy evaluation, multi-threaded, and memory-efficient.

## Core Concepts

### Lazy vs Eager

```python
import polars as pl

# Eager: executes immediately
df = pl.read_csv("data.csv")
result = df.filter(pl.col("amount") > 100).select("id", "amount")

# Lazy: builds query plan, optimizes, then executes
result = (
    pl.scan_csv("data.csv")
    .filter(pl.col("amount") > 100)
    .select("id", "amount")
    .collect()
)
```

**Always prefer lazy** (`scan_*` + `.collect()`). Benefits:
- Predicate pushdown (filter before reading all columns)
- Projection pushdown (read only needed columns)
- Common subexpression elimination
- Parallel execution across cores

### Expressions

Expressions are the building blocks. They describe computations without executing them.

```python
df.select(
    pl.col("revenue").sum().alias("total_revenue"),
    pl.col("revenue").mean().alias("avg_revenue"),
    (pl.col("revenue") / pl.col("cost")).alias("margin"),
    pl.col("date").dt.year().alias("year"),
    pl.when(pl.col("amount") > 1000)
      .then(pl.lit("high"))
      .otherwise(pl.lit("low"))
      .alias("tier"),
)
```

### Column Selection

```python
import polars.selectors as cs

df.select(cs.numeric())
df.select(cs.by_dtype(pl.Utf8))
df.select(cs.starts_with("metric_"))
df.select(cs.all() - cs.by_name("internal_id"))
```

## Common Operations

### Groupby + Aggregation

```python
result = df.group_by("category", "region").agg(
    pl.col("revenue").sum().alias("total_revenue"),
    pl.col("revenue").mean().alias("avg_revenue"),
    pl.col("order_id").n_unique().alias("unique_orders"),
    pl.col("amount").quantile(0.95).alias("p95_amount"),
    pl.col("is_returned").mean().alias("return_rate"),
)
```

### Window Functions

```python
df.with_columns(
    pl.col("revenue")
      .sum()
      .over("category")
      .alias("category_total"),
    pl.col("revenue")
      .rank(method="dense", descending=True)
      .over("category")
      .alias("rank_in_category"),
    pl.col("amount")
      .rolling_mean(window_size=7)
      .over("user_id")
      .alias("rolling_7d_avg"),
)
```

### Joins

```python
result = orders.join(
    customers,
    on="customer_id",
    how="left",
    suffix="_customer",
)

# Asof join for time-series alignment
result = trades.join_asof(
    quotes,
    on="timestamp",
    by="ticker",
    strategy="backward",
    tolerance="5s",
)
```

### String Operations

```python
df.with_columns(
    pl.col("email").str.to_lowercase().alias("email_lower"),
    pl.col("name").str.split(" ").list.first().alias("first_name"),
    pl.col("url").str.extract(r"https?://([^/]+)", 1).alias("domain"),
)
```

### Temporal Operations

```python
df.with_columns(
    pl.col("timestamp").dt.date().alias("date"),
    pl.col("timestamp").dt.hour().alias("hour"),
    pl.col("timestamp").dt.truncate("1h").alias("hour_bucket"),
    (pl.col("end_time") - pl.col("start_time")).dt.total_seconds().alias("duration_s"),
)

# Group by dynamic time windows
df.group_by_dynamic("timestamp", every="1h", period="2h").agg(
    pl.col("value").mean().alias("avg_value"),
)
```

## I/O Patterns

```python
# Parquet (best for analytics)
df = pl.scan_parquet("data/*.parquet")
df.collect().write_parquet("output.parquet", compression="zstd")

# CSV with schema override
df = pl.scan_csv("data.csv", dtypes={"id": pl.UInt32, "amount": pl.Float64})

# Delta Lake
df = pl.scan_delta("s3://bucket/table/")

# Multiple files with hive partitioning
df = pl.scan_parquet("data/**/*.parquet", hive_partitioning=True)
```

## Performance Tips

1. **Use lazy mode**: always `scan_*` -> transform -> `.collect()`
2. **Avoid Python UDFs**: use expressions instead; they run in Rust/parallel
3. **Predicate pushdown**: filter early to reduce data volume
4. **Streaming mode**: `.collect(streaming=True)` for data larger than RAM
5. **Rechunk after joins**: `.rechunk()` consolidates fragmented memory
6. **Use categoricals**: `pl.Categorical` for low-cardinality string columns
7. **Sink to Parquet**: `.sink_parquet()` for out-of-core processing in lazy mode

## vs Pandas

| Operation | Pandas | Polars |
|-----------|--------|--------|
| Read CSV | `pd.read_csv()` | `pl.scan_csv().collect()` |
| Filter | `df[df["x"] > 5]` | `df.filter(pl.col("x") > 5)` |
| Groupby | `df.groupby("x").agg(...)` | `df.group_by("x").agg(...)` |
| Apply | `df["x"].apply(fn)` | `df.with_columns(pl.col("x").map_elements(fn))` |
| Memory | Single-threaded, copies | Multi-threaded, zero-copy |
| Nulls | NaN/None confusion | First-class null handling |
| Strings | Object dtype (slow) | Apache Arrow UTF-8 (fast) |

## Anti-Patterns

- Using `.apply()` or `.map_elements()` when an expression exists
- Collecting lazy frames too early (breaks optimization)
- Iterating rows with `for row in df.iter_rows()` -- vectorize instead
- Using pandas interop (`.to_pandas()`) in hot paths
- Not specifying dtypes on CSV reads (inference is expensive)
