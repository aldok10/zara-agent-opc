---
type: subskill
title: "Distributed Computing Fundamentals"
---

# Distributed Computing Fundamentals

MapReduce concepts, data locality, fault tolerance, and distributed system patterns for data processing.

## When to Load

- Designing data-intensive distributed applications
- Understanding why Spark/Flink behave the way they do
- Debugging performance issues rooted in distribution
- Making architecture decisions about data placement and processing

## Key Concepts

**Data Distribution Principles**
- Move computation to data, not data to computation (data locality)
- Partition data so independent chunks can be processed in parallel
- Minimize data movement between nodes (shuffles are expensive)
- Replicate for fault tolerance (at storage or computation level)

**MapReduce Model**
- Map: apply function to each record independently (embarrassingly parallel)
- Shuffle: redistribute data by key across nodes (network-intensive)
- Reduce: aggregate records with same key (parallel per key)
- Modern systems (Spark, Flink) generalize this into DAGs of operators

**Fault Tolerance Approaches**
- Lineage-based (Spark): recompute lost partitions from parent data + transformations
- Checkpoint-based (Flink): periodic snapshots of operator state to durable storage
- Replication-based (HDFS/Kafka): multiple copies across nodes
- Trade-off: lineage = less storage overhead, longer recovery; checkpoints = faster recovery

**Data Partitioning Strategies**
- Hash partitioning: deterministic placement by key (good for joins, aggregations)
- Range partitioning: ordered ranges per partition (good for sorted scans)
- Round-robin: even distribution but no data locality guarantees
- Custom: application-specific logic (geo-based, tenant-based)

## Patterns

```
Shuffle Operation (conceptual):

Node 1 [A1, B1, A2]  --map-->  [A1', B1', A2']
Node 2 [B2, A3, B3]  --map-->  [B2', A3', B3']

                    --shuffle by key-->

Node 1 [A1', A2', A3']  --reduce-->  [A_result]
Node 2 [B1', B2', B3']  --reduce-->  [B_result]
```

**Data Skew Mitigation**
- Salting: append random suffix to hot keys, aggregate in two passes
- Isolated processing: handle hot keys separately from normal keys
- Adaptive partitioning: runtime detection and splitting of large partitions
- Pre-aggregation: map-side combine reduces shuffle volume

```python
# Salting pattern for skewed joins
from pyspark.sql import functions as F

SALT_BUCKETS = 10

# Salt the large (skewed) table
large_df = large_df.withColumn(
    "salt", (F.rand() * SALT_BUCKETS).cast("int")
)

# Explode the small table to match all salt values
small_df = small_df.crossJoin(
    spark.range(SALT_BUCKETS).withColumnRenamed("id", "salt")
)

# Join on original key + salt
result = large_df.join(small_df, ["join_key", "salt"])
result = result.drop("salt")
```

**CAP Theorem in Practice**
- Consistency + Availability: sacrifice Partition tolerance (single node, not distributed)
- Consistency + Partition tolerance: sacrifice Availability (reject writes during partition)
- Availability + Partition tolerance: sacrifice Consistency (eventual consistency)
- Most data systems choose CP or AP depending on use case

## Gotchas

- Network is the bottleneck -- 10Gbps network is ~1GB/s shared across all tasks
- Stragglers: one slow task holds up entire stage -- speculative execution helps
- Garbage collection pauses affect distributed systems unpredictably
- Clock skew between nodes complicates event ordering -- use logical clocks or vector clocks
- Data locality degrades under high cluster utilization (all slots busy)
- "Just add more nodes" hits coordination overhead limits (Amdahl's Law)

## Verification

- Shuffle data volume is minimized (check stage metrics)
- No persistent data skew visible in task duration distribution
- Recovery time after node failure is within SLA
- Data locality metrics show majority of tasks are node-local or rack-local
- End-to-end latency scales sub-linearly with data volume increase
