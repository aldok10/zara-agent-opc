---
type: fact
title: "Polars Patterns"
---

# Polars Patterns

## Core Design

Polars is a DataFrame library written in Rust with Python bindings. Built for performance: columnar memory layout (Apache Arrow), multi-threaded execution, and query optimization through lazy evaluation.

## Lazy vs Eager Evaluation

### Eager Mode
- Operations execute immediately, return results
- Good for: exploration, small data, quick checks
- `pl.read_csv()` returns a DataFrame (eager)

### Lazy Mode
- Operations build a logical plan, execute only on `.collect()`
- Query optimizer: predicate pushdown, projection pushdown, join rewriting
- Good for: production pipelines, large data, performance
- `pl.scan_csv()` returns a LazyFrame

```python
import polars as pl

# Lazy: optimizer pushes filter before join, reads only needed columns
result = (
    pl.scan_parquet("orders/*.parquet")
    .filter(pl.col("status") == "completed")
    .join(
        pl.scan_parquet("customers.parquet").select("id", "region"),
        left_on="customer_id",
        right_on="id",
    )
    .group_by("region")
    .agg(pl.col("amount").sum().alias("total_revenue"))
    .sort("total_revenue", descending=True)
    .collect()
)
```

### When to Use Lazy
- Always in production code
- When data exceeds memory (streaming mode)
- When joining multiple sources (optimizer shines)
- When reading from Parquet/IPC (predicate pushdown to file reader)

## Expression API

### Philosophy
- Expressions are the unit of computation (not row-level operations)
- Composable: chain methods to build complex transformations
- Vectorized: operates on entire columns, no Python loops

### Common Patterns

```python
# Multiple aggregations in one pass
df.group_by("category").agg(
    pl.col("price").mean().alias("avg_price"),
    pl.col("price").std().alias("std_price"),
    pl.col("quantity").sum().alias("total_qty"),
    pl.len().alias("order_count"),
)

# Window functions (over groups without collapsing)
df.with_columns(
    pl.col("amount")
    .sum()
    .over("customer_id")
    .alias("customer_total"),
    pl.col("amount")
    .rank()
    .over("category")
    .alias("rank_in_category"),
)

# Conditional expressions
df.with_columns(
    pl.when(pl.col("age") < 18)
    .then(pl.lit("minor"))
    .when(pl.col("age") < 65)
    .then(pl.lit("adult"))
    .otherwise(pl.lit("senior"))
    .alias("age_group")
)

# String operations
df.with_columns(
    pl.col("email").str.to_lowercase().alias("email_clean"),
    pl.col("name").str.split(" ").list.first().alias("first_name"),
)

# Struct and nested data
df.with_columns(
    pl.struct(["city", "state", "zip"]).alias("address"),
)
```

### Expression Reuse
```python
# Define reusable expressions
revenue = pl.col("price") * pl.col("quantity")
is_high_value = revenue > 1000

df.with_columns(
    revenue.alias("revenue"),
    is_high_value.alias("is_high_value"),
).filter(is_high_value)
```

## Streaming Mode

### When to Use
- Data exceeds available RAM
- Processing large Parquet datasets incrementally
- Batch processing where full materialization is unnecessary

### How It Works
```python
# Process in chunks, never load full dataset
result = (
    pl.scan_parquet("huge_dataset/**/*.parquet")
    .filter(pl.col("date") >= "2024-01-01")
    .group_by("category")
    .agg(pl.col("amount").sum())
    .collect(streaming=True)
)
```

### Limitations
- Not all operations support streaming (some need full data: sorts, some joins)
- Some aggregations require seeing all groups (handled via partial aggregation)
- Check `.explain(streaming=True)` to verify streaming plan

## Performance vs Pandas

### Why Polars Is Faster
- Rust core: no GIL, true parallelism across CPU cores
- Apache Arrow memory: cache-friendly columnar layout, zero-copy operations
- Query optimizer: eliminates unnecessary work before execution
- No index: avoids index alignment overhead on every operation
- Lazy evaluation: fuses operations, reduces intermediate allocations

### Migration Patterns

| Pandas | Polars |
|--------|--------|
| `df[df['x'] > 5]` | `df.filter(pl.col("x") > 5)` |
| `df.groupby('a').agg({'b': 'sum'})` | `df.group_by("a").agg(pl.col("b").sum())` |
| `df.apply(fn, axis=1)` | `df.with_columns(expression)` or `df.map_rows(fn)` |
| `pd.merge(df1, df2, on='id')` | `df1.join(df2, on="id")` |
| `df.fillna(0)` | `df.with_columns(pl.col("x").fill_null(0))` |
| `df.sort_values('x')` | `df.sort("x")` |

### When Pandas Still Makes Sense
- Ecosystem integration (scikit-learn, matplotlib expect pandas)
- Small data where performance doesn't matter
- Team familiarity and existing codebase
- Use `.to_pandas()` at boundaries when needed

## Production Patterns

### Schema Enforcement
```python
# Define expected schema
schema = {
    "order_id": pl.Utf8,
    "amount": pl.Float64,
    "created_at": pl.Datetime("us"),
    "status": pl.Categorical,
}

df = pl.read_parquet("data.parquet").cast(schema)
```

### Error Handling
```python
# Validate before processing
def validate_dataframe(df: pl.DataFrame) -> pl.DataFrame:
    assert df.height > 0, "Empty dataframe"
    null_pct = df.null_count() / df.height
    high_null_cols = [
        col for col, pct in zip(df.columns, null_pct.row(0))
        if pct > 0.5
    ]
    if high_null_cols:
        raise ValueError(f"High null rate in: {high_null_cols}")
    return df
```

### Memory Management
- Use `pl.scan_*` (lazy) to avoid loading full datasets
- `.collect(streaming=True)` for out-of-core processing
- `.sink_parquet()` writes lazy results directly to disk
- Prefer `pl.Categorical` for low-cardinality string columns (saves memory)
- `.rechunk()` after many filter/concat operations (consolidates memory)
