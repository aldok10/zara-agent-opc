# Lakehouse Table Formats

## Why Table Formats

Raw Parquet/ORC files lack: ACID transactions, schema enforcement, time travel, efficient upserts, and small file management. Table formats add these on top of object storage.

## Apache Iceberg

The industry-converging standard (2026). Adopted by AWS, Snowflake, Databricks (Universal Format), Google BigQuery.

### Key Features

- **Hidden partitioning**: partition transforms (year, month, day, hour, bucket, truncate) without exposing partition columns in queries
- **Schema evolution**: add, drop, rename, reorder columns without rewrite
- **Partition evolution**: change partition scheme without rewriting data
- **Time travel**: query historical snapshots by timestamp or snapshot ID
- **Row-level deletes**: copy-on-write (COW) or merge-on-read (MOR)
- **Branching & tagging**: git-like semantics for data

### Architecture

```
Catalog (metadata pointer)
  -> Metadata file (JSON)
    -> Manifest list (Avro)
      -> Manifest files (Avro, per partition)
        -> Data files (Parquet)
```

### Compaction

Small files accumulate from streaming writes or frequent updates:

- **Bin-packing**: combine small files into target size (128-512MB)
- **Sort compaction**: rewrite with sort order for better query performance
- **Expire snapshots**: remove old metadata (keep 5-7 days for time travel)
- **Remove orphan files**: clean unreferenced data files

### Best Practices

- Set `write.target-file-size-bytes` = 512MB for analytics
- Enable `write.metadata.delete-after-commit.enabled` for metadata cleanup
- Partition by date for time-series (hidden partition transforms)
- Use sort order matching common query filters
- Run compaction on schedule (hourly for high-ingest, daily for batch)

## Delta Lake

Created by Databricks. Strong in Databricks ecosystem, open-source version available.

### Key Features

- **ACID transactions**: optimistic concurrency via JSON log
- **Schema enforcement**: reject writes that don't match schema
- **Schema evolution**: merge schema on write (opt-in)
- **Time travel**: query by version number or timestamp
- **Change Data Feed (CDF)**: capture row-level changes as stream
- **Liquid clustering**: replaces static partitioning with adaptive clustering
- **UniForm**: auto-generates Iceberg metadata for interoperability

### Architecture

```
_delta_log/ (transaction log directory)
  -> 000000.json, 000001.json, ... (commit entries)
  -> 000010.checkpoint.parquet (periodic checkpoint)
Data files: Parquet in table directory
```

### When to Use

- Databricks-first environment
- Need CDF for downstream CDC consumers
- Existing Delta investment
- Liquid clustering for evolving query patterns

## Apache Hudi

Strong in streaming upserts, originally from Uber.

### Key Features

- **Upsert-optimized**: designed for record-level mutations
- **Table types**: Copy-on-Write (CoW) and Merge-on-Read (MoR)
- **Incremental queries**: read only changed data since last checkpoint
- **Clustering**: reorganize data layout without blocking writers
- **Record-level index**: fast point lookups

### When to Use

- High-frequency upsert workloads (CDC from OLTP)
- Record-level access patterns
- Strong need for incremental processing

## Format Comparison (2026)

| Feature | Iceberg | Delta Lake | Hudi |
|---------|---------|-----------|------|
| Governance | Apache Foundation | Linux Foundation + Databricks | Apache Foundation |
| Hidden partitioning | Yes | Via Liquid Clustering | No |
| Partition evolution | Yes | Via Liquid Clustering | Limited |
| Row-level deletes | COW + MOR | Deletion vectors | COW + MOR |
| Time travel | Snapshots | Version log | Timeline |
| Streaming | Good | Native (Databricks) | Strong |
| Upsert speed | Good | Good | Best |
| Interop (2026) | Widest adoption | UniForm generates Iceberg | Limited |
| Catalogs | REST, Hive, AWS Glue, Nessie | Unity Catalog, Hive | Hive |

## Choosing a Format

- **Default choice**: Iceberg (widest ecosystem, most portable)
- **Databricks shop**: Delta (native integration, best performance there)
- **Heavy CDC/upserts**: Hudi (optimized for that pattern)
- **Multi-engine**: Iceberg (Spark, Flink, Trino, Presto, Dremio, BigQuery all support)

## Schema Evolution

### Safe Changes (all formats)

- Add new columns (nullable)
- Add new partition fields (Iceberg only without rewrite)
- Widen numeric types (int -> long)

### Risky Changes

- Rename columns (breaks readers using old name)
- Drop columns (data loss, may break downstream)
- Change column types (may corrupt data)

### Strategy

1. Add new column with new name
2. Backfill data
3. Update consumers to use new column
4. Deprecate old column
5. Drop old column after migration period

## Time Travel Use Cases

- Audit: "what did the table look like last Tuesday?"
- Debugging: compare current vs previous snapshot
- Reproducibility: pin ML training to specific snapshot
- Recovery: rollback to known-good state after bad write
- CDC: diff between snapshots for downstream consumers

## Compaction Strategy

| Ingest Pattern | Compaction Frequency | Target File Size |
|----------------|---------------------|-----------------|
| Streaming (continuous) | Hourly | 256-512MB |
| Micro-batch (5-15 min) | Every 4-6 hours | 512MB |
| Daily batch | After load completes | 512MB-1GB |
| Mixed workload | Hourly minor, daily major | 512MB |
