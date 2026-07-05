---
type: subskill
title: "Apache Spark"
---

# Apache Spark

DataFrame API, Catalyst optimizer, partitioning strategies, caching, and shuffle optimization.

## When to Load

- Building batch or micro-batch data pipelines with Spark
- Optimizing Spark job performance (shuffles, partitioning, memory)
- Debugging slow queries via execution plans
- Migrating RDD-based code to DataFrame/Dataset API

## Key Concepts

**DataFrame API Best Practices**
- Always prefer DataFrame/Dataset API over RDDs (Catalyst optimization)
- Use built-in functions (`pyspark.sql.functions`) over UDFs where possible
- UDFs disable Catalyst optimization and add serialization overhead
- Pandas UDFs (vectorized) are 10-100x faster than row-at-a-time UDFs

**Catalyst Optimizer Stages**
1. Analysis: resolve references, check types
2. Logical Optimization: predicate pushdown, column pruning, constant folding
3. Physical Planning: choose join strategies, scan methods
4. Code Generation: Whole-Stage CodeGen for CPU-efficient execution

**Partitioning Strategies**
- `repartition(n)`: full shuffle, even distribution (use before writes)
- `coalesce(n)`: reduce partitions without full shuffle (narrow dependency)
- Partition on high-cardinality columns used in filters (date, region)
- Target partition size: 128MB-256MB for optimal parallelism
- `spark.sql.shuffle.partitions`: default 200, tune to cluster size

**Join Strategies**
- Broadcast join: small table (<10MB default) broadcast to all executors
- Sort-merge join: both sides sorted on join key, then merged
- Shuffle hash join: hash partition both sides on join key
- Skew join: AQE splits skewed partitions automatically (Spark 3.0+)

## Patterns

```python
from pyspark.sql import SparkSession, functions as F, Window

spark = SparkSession.builder \
    .config("spark.sql.adaptive.enabled", "true") \
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
    .config("spark.sql.shuffle.partitions", "auto") \
    .getOrCreate()

orders = spark.read.parquet("s3://data/orders/")
customers = spark.read.parquet("s3://data/customers/")

result = (
    orders
    .filter(F.col("order_date") >= "2024-01-01")
    .join(F.broadcast(customers), "customer_id")
    .groupBy("region", F.date_trunc("month", "order_date").alias("month"))
    .agg(
        F.sum("amount").alias("total_revenue"),
        F.countDistinct("customer_id").alias("unique_customers"),
    )
    .withColumn("rank", F.row_number().over(
        Window.partitionBy("month").orderBy(F.desc("total_revenue"))
    ))
)

result.write \
    .partitionBy("month") \
    .mode("overwrite") \
    .parquet("s3://data/output/monthly_revenue/")
```

**Performance Debugging**
```python
# Check execution plan
result.explain(mode="formatted")

# Key things to look for:
# - Exchange (shuffle) -- expensive, minimize these
# - BroadcastHashJoin vs SortMergeJoin -- broadcast is cheaper for small tables
# - FileScan with PushedFilters -- predicates pushed to storage layer
# - WholeStageCodegen -- good, means Catalyst is generating optimized code
```

## Gotchas

- `collect()` pulls all data to driver -- OOM risk for large datasets
- Python UDFs serialize data to Python process and back -- use Pandas UDFs instead
- `cache()` is lazy -- data isn't cached until an action triggers computation
- Broadcast threshold: increase `spark.sql.autoBroadcastJoinThreshold` for larger dimension tables
- Skewed joins: one partition with 10x more data causes stragglers -- use AQE or salt key
- `coalesce(1)` creates a single file but also a single-threaded bottleneck

## Verification

- Execution plan shows expected join strategies (no unexpected shuffles)
- No stages with significantly skewed task duration (check Spark UI)
- Output partition sizes are in 128-256MB range
- Job completes within expected SLA
- Data count assertions: input rows match expected output rows (with tolerance)
