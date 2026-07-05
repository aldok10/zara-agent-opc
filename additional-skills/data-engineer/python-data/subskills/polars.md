# Polars

Lazy frames, expressions, performance advantages over pandas, and idiomatic patterns.

## When to Load

- Processing medium-to-large datasets that don't fit pandas performance needs
- Migrating from pandas to a faster alternative
- Building data pipelines that need predictable memory usage
- Writing expressive data transformations with lazy evaluation

## Key Concepts

**Why Polars**
- Rust-based, multi-threaded by default (no GIL limitation)
- Lazy evaluation with query optimization (predicate pushdown, projection)
- Apache Arrow memory format (zero-copy interop with other tools)
- Strict typing (no silent type coercion like pandas)
- 5-50x faster than pandas for most operations

**Lazy vs Eager**
- Eager (`DataFrame`): executes immediately, like pandas
- Lazy (`LazyFrame`): builds query plan, optimizes, then executes on `.collect()`
- Always prefer lazy for multi-step transformations (optimization opportunity)
- Use `.explain()` to inspect query plan before collecting

**Expression System**
- Expressions are the building blocks (like SQL SELECT clauses)
- `pl.col("name")`: reference a column
- `pl.lit(value)`: literal value
- Chainable: `pl.col("price").cast(pl.Float64).round(2)`
- Context-dependent: same expression used in select, filter, group_by

## Patterns

```python
import polars as pl

# Lazy pipeline with optimization
result = (
    pl.scan_parquet("data/orders/*.parquet")
    .filter(pl.col("order_date") >= pl.lit("2024-01-01"))
    .join(
        pl.scan_parquet("data/customers.parquet").select("customer_id", "segment"),
        on="customer_id",
        how="left",
    )
    .group_by("segment", pl.col("order_date").dt.truncate("1mo").alias("month"))
    .agg(
        pl.col("amount").sum().alias("total_revenue"),
        pl.col("order_id").n_unique().alias("order_count"),
        pl.col("amount").mean().alias("avg_order_value"),
    )
    .sort("month", "total_revenue", descending=[False, True])
    .collect()
)
```

```python
# Window functions
df = df.with_columns(
    pl.col("amount")
      .sum()
      .over("customer_id")
      .alias("customer_total"),
    pl.col("amount")
      .rank()
      .over("segment")
      .alias("rank_in_segment"),
)

# Conditional expressions
df = df.with_columns(
    pl.when(pl.col("amount") > 1000)
      .then(pl.lit("high"))
      .when(pl.col("amount") > 100)
      .then(pl.lit("medium"))
      .otherwise(pl.lit("low"))
      .alias("tier")
)

# String operations
df = df.with_columns(
    pl.col("email").str.to_lowercase().alias("email_normalized"),
    pl.col("name").str.split(" ").list.first().alias("first_name"),
)
```

**Streaming for Large Files**
```python
# Process larger-than-memory data
result = (
    pl.scan_csv("huge_file.csv")
    .filter(pl.col("status") == "active")
    .group_by("category")
    .agg(pl.col("revenue").sum())
    .collect(streaming=True)
)
```

## Gotchas

- No index concept (unlike pandas) -- use filter/join instead
- Column names are case-sensitive and must be unique
- Lazy operations don't execute until `.collect()` -- errors appear late
- `.apply()` is slow (Python callback) -- use native expressions instead
- Null handling differs from pandas: null != NaN, strict three-valued logic
- Arrow strings are UTF-8 only -- binary data needs `pl.Binary` type

## Verification

- `.explain()` shows optimized plan (predicates pushed down, unused columns pruned)
- Result matches expected output for known test inputs
- Memory usage stays bounded (no unexpected materialization in lazy chains)
- Performance benchmark beats equivalent pandas code by 3x+ minimum
- Type assertions: `df.schema` matches expected column types
