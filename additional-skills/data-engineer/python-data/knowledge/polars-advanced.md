---
type: fact
title: "Polars Advanced Patterns"
---

# Polars Advanced Patterns

## Lazy Evaluation Deep Dive

### Query Plan Optimization
- Predicate pushdown: filters moved as close to data source as possible
- Projection pushdown: only read columns that are actually used
- Common subexpression elimination: compute shared expressions once
- Join reordering: smaller tables joined first when possible

### Inspecting Plans
```python
import polars as pl

lazy = (
    pl.scan_parquet("data/**/*.parquet")
    .filter(pl.col("year") == 2024)
    .select("id", "amount", "category")
    .group_by("category")
    .agg(pl.col("amount").sum())
)

# View optimized plan
print(lazy.explain(optimized=True))
```

### Streaming Execution
- Process data in batches without full materialization
- Enable with `.collect(streaming=True)` or `.sink_parquet()`
- Supports: filter, select, group_by (partial), join (streaming-compatible)
- Not supported: sort (needs full data), some window functions

```python
# Write results directly to disk without full DataFrame in memory
(
    pl.scan_csv("huge_file.csv")
    .filter(pl.col("status") == "active")
    .group_by("region")
    .agg(pl.col("revenue").sum())
    .sink_parquet("output/summary.parquet")
)
```

## Expression Composition

### Reusable Expression Functions
```python
def normalize(col_name: str) -> pl.Expr:
    col = pl.col(col_name)
    return (col - col.mean()) / col.std()

def flag_outliers(col_name: str, threshold: float = 3.0) -> pl.Expr:
    z = normalize(col_name)
    return z.abs().gt(threshold).alias(f"{col_name}_is_outlier")

df.with_columns(
    normalize("revenue").alias("revenue_normalized"),
    flag_outliers("revenue"),
)
```

### Dynamic Column Selection
```python
# Select all numeric columns
df.select(pl.col(pl.NUMERIC_DTYPES))

# Apply same transformation to multiple columns
df.with_columns(
    pl.col(pl.Float64).round(2),
    pl.col(pl.Utf8).str.strip_chars(),
)

# Regex-based column selection
df.select(pl.col("^amount_.*$"))
```

### Fold and Reduce
```python
# Sum across multiple columns horizontally
df.with_columns(
    pl.sum_horizontal("jan", "feb", "mar").alias("q1_total"),
    pl.mean_horizontal("jan", "feb", "mar").alias("q1_avg"),
)

# Conditional horizontal aggregation
df.with_columns(
    pl.any_horizontal(pl.col("^flag_.*$")).alias("any_flag_true"),
    pl.all_horizontal(pl.col("^check_.*$")).alias("all_checks_pass"),
)
```

## Performance Patterns

### Categorical for Low Cardinality
```python
# String columns with few unique values: massive memory + speed gains
df = df.with_columns(
    pl.col("country").cast(pl.Categorical),
    pl.col("status").cast(pl.Categorical),
)
```

### Avoid Anti-Patterns
```python
# BAD: row-by-row Python loop
for i in range(len(df)):
    df[i, "result"] = compute(df[i, "value"])

# GOOD: vectorized expression
df.with_columns(
    pl.col("value").map_batches(compute_vectorized).alias("result")
)

# BAD: repeated filter + collect in loop
for cat in categories:
    subset = df.filter(pl.col("category") == cat).collect()

# GOOD: single group_by
results = df.group_by("category").agg(...)
```

### Memory Tips
- `.rechunk()` after many filter/concat operations
- `.shrink_to_fit()` to release unused memory
- Use `pl.scan_*` (lazy) to avoid loading full datasets
- `.estimated_size()` to monitor DataFrame memory usage
- Prefer `UInt32` over `Int64` when values are small positive integers

## Struct and Nested Data

### Working with Structs
```python
# Create struct from columns
df.with_columns(
    pl.struct(["city", "state", "zip"]).alias("address")
)

# Unnest struct into columns
df.unnest("address")

# Access struct fields
df.select(pl.col("address").struct.field("city"))
```

### List Columns
```python
# Explode lists into rows
df.explode("tags")

# List aggregation
df.group_by("user_id").agg(
    pl.col("product_id").alias("purchased_products"),  # creates list
    pl.col("product_id").n_unique().alias("unique_products"),
)

# List operations
df.with_columns(
    pl.col("scores").list.mean().alias("avg_score"),
    pl.col("scores").list.len().alias("num_scores"),
    pl.col("tags").list.contains("premium").alias("is_premium"),
)
```

## Integration Patterns

### With DuckDB
```python
import duckdb

# Zero-copy exchange via Apache Arrow
duck = duckdb.connect()
result = duck.execute("SELECT * FROM df WHERE amount > 100").pl()
```

### With Delta Lake
```python
# Read Delta tables
df = pl.read_delta("s3://bucket/delta-table/")

# Lazy scan
lazy = pl.scan_delta("s3://bucket/delta-table/")

# Write as Delta
df.write_delta("output/delta-table/", mode="overwrite")
```

### With pandas (at boundaries)
```python
# Convert when library requires pandas
pandas_df = polars_df.to_pandas()

# Convert back
polars_df = pl.from_pandas(pandas_df)
```
