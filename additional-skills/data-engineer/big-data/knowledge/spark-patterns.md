---
type: fact
title: "Spark Patterns"
---

# Spark Patterns

## DataFrame API Best Practices

### Column Selection

```python
df.select("user_id", "event_type", "timestamp")
```

Never `SELECT *` on wide tables. Columnar formats skip unread columns -- help them help you.

### Filter Pushdown

Place filters as early as possible. Spark pushes predicates to source, but explicit is better:

```python
df = spark.read.parquet("s3://data/events")
df = df.filter(col("date") >= "2026-01-01")  # pushed to parquet reader
df = df.filter(col("status") == "active")
```

### Avoid UDFs When Possible

Spark SQL functions execute in JVM. Python UDFs serialize to Python and back:

| Approach | Performance | Use When |
|----------|-------------|----------|
| Built-in functions | Best | Always prefer |
| Pandas UDFs (vectorized) | Good | Complex logic, batch |
| Python UDFs | Worst | Last resort |

### Null Handling

- `isNull()` / `isNotNull()` for checks
- `coalesce()` for defaults
- `na.fill()` for bulk null replacement
- Be explicit -- nulls propagate silently through expressions

## Partitioning

### Partition Strategy

| Pattern | Use When | Example |
|---------|----------|---------|
| Date-based | Time-series, event data | `year/month/day` |
| Category + date | Multi-tenant | `region/date` |
| Hash-based | Even distribution | `user_id % 256` |
| Range-based | Sequential access | `id_range` |

### Rules

- Target 100MB - 1GB per partition file
- Max partitions per table: < 10,000 (metadata overhead)
- Partition columns should have low cardinality (< 1000 distinct values)
- Never partition by high-cardinality columns (user_id = disaster)
- Over-partitioning creates small file problem

### Repartition vs Coalesce

- `repartition(n)`: full shuffle, use when increasing partitions or rebalancing
- `coalesce(n)`: narrow dependency, use when decreasing partitions only
- `repartition(n, "col")`: hash partition by column, use before joins on that column

## Joins

### Join Strategies

| Strategy | Trigger | Best For |
|----------|---------|----------|
| Broadcast Hash | Small side < broadcast threshold | Dimension + fact |
| Sort-Merge | Both sides large | Large-large joins |
| Shuffle Hash | One side fits in memory per partition | Medium-large |
| Bucket Join | Both tables bucketed on join key | Repeated joins |

### Handling Skew

Data skew = one partition has 100x more rows than others. Symptoms: one task takes forever while others finish.

**Solutions**:
1. **Salt key**: append random suffix, join multiple times, union results
2. **Broadcast**: if skewed side is small enough, broadcast it
3. **AQE skew join**: enable adaptive query execution (Spark 3.x default)
4. **Isolate hot keys**: process separately with broadcast

### Broadcast Join

```python
from pyspark.sql.functions import broadcast
result = large_df.join(broadcast(small_df), "key")
```

Default threshold: 10MB (`spark.sql.autoBroadcastJoinThreshold`). Increase for larger dimension tables if executor memory allows.

## Caching

### When to Cache

- DataFrame reused > 2 times in the same job
- After expensive computation (complex joins, aggregations)
- Small lookup tables used repeatedly

### Storage Levels

| Level | Memory | Disk | Serialized | Use Case |
|-------|--------|------|------------|----------|
| MEMORY_ONLY | Yes | No | No | Small, reused often |
| MEMORY_AND_DISK | Yes | Spill | No | Medium, important |
| DISK_ONLY | No | Yes | Yes | Large, expensive to recompute |

### Rules

- Always `unpersist()` when done
- Cache after filter/select (reduce what's cached)
- Don't cache if only used once
- Monitor storage tab in Spark UI for memory pressure

## Shuffle Optimization

### What Causes Shuffles

- `groupBy` / aggregations
- `join` (non-broadcast)
- `repartition`
- `distinct`
- `sort` / `orderBy`
- Window functions with `partitionBy`

### Reducing Shuffle Impact

1. **Reduce data before shuffle**: filter, select only needed columns
2. **Pre-partition**: repartition on join key before multiple joins
3. **Bucketing**: pre-shuffle data at write time for repeated join patterns
4. **Partial aggregation**: `reduceByKey` over `groupByKey` (RDD API)

### AQE (Adaptive Query Execution)

Enabled by default in Spark 3.x:
- Coalesces small shuffle partitions
- Handles skew by splitting large partitions
- Switches join strategy at runtime based on actual data size
- `spark.sql.adaptive.enabled = true`

## Resource Configuration

### Key Settings

| Setting | Guidance |
|---------|----------|
| `spark.executor.memory` | 4-16GB typical, leave 10% for overhead |
| `spark.executor.cores` | 4-5 cores per executor (sweet spot) |
| `spark.sql.shuffle.partitions` | 200 default, set to 2-3x total cores |
| `spark.default.parallelism` | 2-3x total cores |
| `spark.memory.fraction` | 0.6 default, increase for cache-heavy |
| `spark.sql.autoBroadcastJoinThreshold` | 10MB default, increase if memory allows |

### Memory Layout per Executor

```
Total = spark.executor.memory + spark.executor.memoryOverhead
  |
  +-- Execution memory (shuffles, joins, sorts): 50% of usable
  +-- Storage memory (cache): 50% of usable
  +-- Reserved: 300MB
  +-- Overhead: max(384MB, 10% of total)
```

## Monitoring Checklist

- **Stages with high shuffle write**: candidate for pre-partitioning
- **Tasks with spill to disk**: increase executor memory or reduce partition size
- **Straggler tasks**: skew -- check key distribution
- **Driver OOM**: collect() or large broadcast, reduce driver-side operations
- **GC time > 10%**: reduce memory pressure, increase executors
