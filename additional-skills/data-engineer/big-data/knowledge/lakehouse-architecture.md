---
type: fact
title: "Lakehouse Architecture"
---

# Lakehouse Architecture

## Core Concept

Combines data lake flexibility (open formats, cheap storage, schema-on-read) with data warehouse reliability (ACID transactions, schema enforcement, time travel). Single storage layer serves both analytics and ML workloads.

## Open Table Formats

### Delta Lake
- Created by Databricks, donated to Linux Foundation
- Transaction log (`_delta_log/`) stores JSON + Parquet checkpoint files
- ACID transactions via optimistic concurrency control
- Schema enforcement and evolution (add/rename columns)
- Time travel: query any historical version by version number or timestamp
- Z-ordering for data skipping on multi-dimensional queries
- Liquid clustering (Delta 3.0): adaptive data layout without manual OPTIMIZE
- Change Data Feed (CDF): track row-level changes for downstream consumers

### Apache Iceberg
- Created at Netflix, Apache top-level project
- Manifest-based metadata: catalog → metadata files → manifest lists → manifests → data files
- Hidden partitioning: partition by day(timestamp) without user needing to filter by partition column
- Partition evolution: change partitioning scheme without rewriting data
- Schema evolution: safe column add/rename/drop/reorder
- Row-level deletes: equality and position delete files
- Branch and tag: git-like references for experimentation
- Broad engine support: Spark, Trino, Flink, Dremio, Snowflake, BigQuery

### Apache Hudi
- Created at Uber for incremental data processing
- Two table types:
  - Copy-on-Write (CoW): rewrites files on update, faster reads
  - Merge-on-Read (MoR): log-based updates, faster writes, compaction needed
- Timeline-based metadata architecture
- Built-in incremental query: read only changed records since timestamp
- Record-level index for fast upserts (HBase, Bloom, bucket)
- Best for: streaming ingestion with upserts, CDC pipelines

## Comparison

| Feature | Delta Lake | Iceberg | Hudi |
|---------|-----------|---------|------|
| Governance | Linux Foundation | Apache | Apache |
| Partition evolution | Limited | Full | Limited |
| Hidden partitioning | No | Yes | No |
| Streaming upserts | Good | Good | Excellent |
| Engine lock-in | Spark-first | Engine-agnostic | Spark-first |
| Time travel | Version/timestamp | Snapshot-based | Timeline-based |
| Community momentum | Databricks ecosystem | Broadest adoption | Uber ecosystem |

## Metadata Layer

### Catalogs
- Purpose: track which tables exist, current metadata location, access control
- Hive Metastore: legacy standard, limited to namespace/table/partition
- AWS Glue Data Catalog: managed HMS-compatible, integrated with Athena/Redshift
- Nessie: git-like catalog with branching and commits (works with Iceberg)
- Unity Catalog (Databricks): unified governance across Delta, ML models, dashboards
- Polaris (Snowflake/Iceberg): open catalog for Iceberg tables

### Why Catalogs Matter
- Without catalog: query engine doesn't know where to find table metadata
- Multi-engine access requires shared catalog
- Catalog handles: table creation, schema, location, access control, versioning

## Architecture Patterns

### Medallion Architecture (Bronze/Silver/Gold)
- Bronze: raw ingestion, append-only, schema-on-read
- Silver: cleaned, deduplicated, conformed types, validated
- Gold: business-level aggregations, feature tables, reporting models

### Lakehouse vs Traditional

| Aspect | Data Warehouse | Data Lake | Lakehouse |
|--------|---------------|-----------|-----------|
| Storage | Proprietary | Open (Parquet/ORC) | Open (Parquet) |
| Transactions | Yes | No | Yes |
| Schema | Enforce on write | On read | Both |
| Cost | High (compute+storage) | Low storage | Low storage |
| ML workloads | Poor | Good | Good |
| BI workloads | Excellent | Poor | Good |

### When to Choose Lakehouse
- Mixed workloads: SQL analytics + ML training on same data
- Cost-sensitive: decouple storage from compute
- Multi-engine: Spark for ETL, Trino for ad-hoc, Python for ML
- Avoiding vendor lock-in: open formats portable across engines

## Operational Concerns

### Compaction
- Small files degrade read performance
- OPTIMIZE / bin-packing merges small files into target size (128MB-1GB)
- Schedule: hourly for high-write tables, daily for batch tables
- Monitor: average file size, file count per partition

### Vacuuming / Expiring Snapshots
- Old data files accumulate after updates/compaction
- Delta: `VACUUM` removes files older than retention period
- Iceberg: `expire_snapshots` + `remove_orphan_files`
- Balance: short retention = less storage cost, long retention = more time travel

### Data Skipping
- Column min/max statistics in metadata enable skipping irrelevant files
- Ordering data by commonly filtered columns maximizes skip effectiveness
- Z-order/Hilbert curves for multi-column access patterns
- Iceberg partition pruning eliminates entire directories

## Streaming Integration
- Delta: Structured Streaming source/sink with exactly-once
- Iceberg: Flink integration for streaming writes with commits
- Hudi: native streaming ingestion with DeltaStreamer
- Pattern: streaming writes to Bronze, batch refinement to Silver/Gold
