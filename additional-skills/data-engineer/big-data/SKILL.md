---
name: big-data
description: "Big data engineering: Spark, distributed computing, data lakes, Iceberg/Delta/Hudi, Hadoop ecosystem"
---

# Big Data Engineering

## Scope

Distributed data processing at scale. Apache Spark (batch and streaming), data lakehouse formats (Iceberg, Delta Lake, Hudi), data lake architecture, partitioning strategies, and performance optimization for large-scale ETL/ELT pipelines.

## First Action

Determine data volume, velocity, and variety. Check existing infrastructure (Spark version, cluster type, storage layer). Identify whether the workload is batch, streaming, or hybrid. Read existing job configurations and partition schemes before proposing changes.

## Constraints

1. Partition strategy must be defined before writing data (cannot fix cheaply later)
2. Avoid small files -- compact to 128MB-1GB per file for analytics
3. Shuffles are the primary cost in Spark -- minimize with proper partitioning
4. Use columnar formats (Parquet/ORC) -- never store analytics data as JSON/CSV at scale
5. Table format required for production (Iceberg preferred, Delta acceptable)
6. Schema evolution must be backward-compatible (add columns, don't rename/delete without migration)
7. Data quality checks before and after transformation (Great Expectations or equivalent)
8. Idempotent writes -- jobs must be safe to retry without duplicates
9. Cost-based optimizer hints via ANALYZE TABLE for large tables
10. Broadcast joins only for small tables (< 100MB default, tune based on executor memory)
11. Never collect() large datasets to driver -- use distributed operations
12. Monitor shuffle spill to disk -- indicates memory pressure
13. Write audit logs for all data mutations (who changed what, when)

## DO NOT

1. Use `collect()` on unbounded or large datasets
2. Create thousands of small files (< 10MB each)
3. Skip partitioning for tables > 1TB
4. Use repartition(1) for output (creates bottleneck)
5. Ignore skew in join keys (leads to OOM on specific executors)
6. Store sensitive data unencrypted in the lake
7. Mix batch and streaming writes to the same table without proper isolation
8. Use `SELECT *` on wide tables in production pipelines
9. Run jobs without resource limits (runaway jobs kill clusters)

## Route to Subskill

| Signal | Target | Why |
|--------|--------|-----|
| Spark/DataFrame/RDD/SQL | knowledge/spark-patterns.md | Spark patterns |
| Iceberg/Delta/Hudi/lakehouse | knowledge/lakehouse.md | Table format guidance |
| ETL example/pipeline | examples/spark-etl.py | Reference code |
| Performance/optimization | tools/spark-optimization-prompt.md | Optimization review |

## Verification

- [ ] Partition strategy documented and appropriate for query patterns
- [ ] No small file problem (files > 100MB for analytics)
- [ ] Shuffles minimized (broadcast joins where appropriate)
- [ ] Schema evolution is backward-compatible
- [ ] Data quality checks in pipeline
- [ ] Idempotent writes (safe to retry)
- [ ] Resource allocation configured (executor memory, cores, instances)
- [ ] Monitoring in place (job duration, shuffle size, spill)

## Knowledge

- knowledge/spark-patterns.md -- DataFrame API, partitioning, caching, shuffles
- knowledge/lakehouse.md -- Iceberg/Delta/Hudi, time travel, schema evolution, compaction

## AI-Era Context (2026)

Spark Connect is the standard remote execution model. Photon (Databricks) and Velox (Meta) accelerate execution via native engines. Apache XTable enables interoperability between Iceberg/Delta/Hudi. Streaming has converged -- Spark Structured Streaming, Flink, and Kafka Streams cover most use cases. Data lakehouse is the dominant architecture, replacing separate warehouse + lake. Embedding generation at scale is a common Spark workload for RAG pipelines. Spark 4.x: ANSI mode default, Spark Connect GA, Hadoop shim removed, Scala 2.13 only.

## Related Skills

- python-expert (PySpark implementation)
- system-design (distributed architecture)
- ai/mlops (feature engineering at scale)
