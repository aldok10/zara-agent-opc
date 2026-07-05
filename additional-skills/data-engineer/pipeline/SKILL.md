---
name: pipeline
description: "Data pipeline design: ELT over ETL, idempotent loads, backfill-safe, incremental processing, partitioning"
---

# Data Pipeline Expert

Pipeline architecture and implementation. ELT-first, idempotent, backfill-safe, incremental by default.

## Scope

- Pipeline patterns: ELT (preferred), ETL (legacy/edge cases), reverse ETL
- Idempotent load strategies: MERGE, INSERT OVERWRITE, upsert
- Incremental processing: watermarks, change tracking, partition-based
- Backfill design: partition replay, full refresh fallback
- Data ingestion: CDC, API extraction, file-based, database replication
- Partitioning strategies for storage and processing efficiency
- Pipeline observability: row counts, latency, data lineage

## First Action

1. Identify source systems and their change detection capabilities (timestamps, CDC, full dump only)
2. Check existing pipeline patterns in the codebase (batch scripts, orchestrator DAGs, streaming jobs)
3. Determine data volumes and latency requirements per source
4. Map the end-to-end flow: source -> ingestion -> raw -> transform -> serve

## Constraints

1. ELT over ETL: load raw data first, transform in the warehouse; transformations are easier to debug and replay.
2. Every pipeline must be idempotent; re-running for the same time window produces identical results.
3. Use INSERT OVERWRITE or MERGE for idempotent writes; never append-only unless deduplication exists downstream.
4. Incremental pipelines must have a reliable watermark column (event_timestamp, updated_at, CDC sequence).
5. Backfill must work by specifying a date range; no special code paths for historical vs current processing.
6. Partition raw data by ingestion date; partition transformed data by the most common query filter.
7. Raw/landing layer is append-only and immutable; never modify landed data, transform it forward.
8. Pipeline metadata (row counts, timestamps, durations) logged for every run; drift detection depends on it.
9. Extraction must handle API pagination, rate limits, and partial failures with checkpointing.
10. File-based ingestion must handle: late files, duplicate files, empty files, schema changes.
11. Use staging tables for atomic loads; never write directly to serving tables during transformation.
12. Pipeline dependencies must be explicit (orchestrator dependencies, not implicit timing assumptions).
13. Separate extraction, loading, and transformation into distinct pipeline stages with clear interfaces.
14. Incremental must be provably equivalent to full refresh; test by comparing outputs on historical data.

## DO NOT

- Transform data before loading into raw/landing zone; you lose the original for debugging and replay
- Use timestamps from application servers as watermarks without accounting for clock skew
- Build pipelines that cannot be backfilled without code changes
- Assume sources provide data in order; handle late, duplicate, and out-of-order records
- Use DELETE + INSERT instead of MERGE/UPSERT; it creates windows of missing data
- Build one monolithic pipeline that extracts, transforms, and loads in a single step
- Skip dead-letter handling for records that fail transformation; track and alert on them
- Hard-code source credentials in pipeline code; use secret managers
- Rely on pipeline scheduling as a coordination mechanism between producers and consumers

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| SQL transformations | `../sql` |
| dbt models and layers | `../modeling` |
| Pipeline scheduling, retries | `../orchestration` |
| Data validation in pipeline | `../quality` |
| Real-time/CDC ingestion | `../streaming` |
| Python data processing | `../python-data` |
| Warehouse loading patterns | `../warehouse` |

## Verification

- Idempotency: run pipeline twice for same partition, output row count and checksums match
- Backfill: process historical range, compare output to forward-fill results
- Late data handling: inject late records, verify they are captured in next run
- Failure recovery: kill pipeline mid-run, restart produces correct output
- Performance: pipeline completes within defined SLA at 2x current data volume
- Metadata: row counts, durations, and status logged for every pipeline run

## Knowledge

- `knowledge/elt-patterns.md` -- staging, raw layers, transformation strategies, reverse ETL
- `knowledge/incremental.md` -- watermarks, change tracking, merge patterns, SCD handling
- `knowledge/ingestion.md` -- API extraction, CDC setup, file processing, database replication
- `knowledge/partitioning.md` -- time-based, hash, range; storage vs query optimization tradeoffs

## AI-Era Context (2026)

- ELT is the default; raw data in object storage (S3/GCS) + warehouse transformation is standard architecture
- Open table formats (Iceberg, Delta Lake) enable time-travel and schema evolution on raw data lakes
- Fivetran/Airbyte handle commodity source extraction; build custom only for proprietary APIs
- AI-assisted pipeline generation requires validation of idempotency; generated code often misses edge cases
- Incremental processing with Iceberg merge-on-read reduces write amplification for high-volume sources
- Data products (self-contained pipeline + quality + docs + SLA) are the unit of delivery for data teams

## Related Skills

- `data-engineer/orchestration` -- scheduling and coordination
- `data-engineer/modeling` -- transformation layer design
- `data-engineer/quality` -- validation and contracts
- `data-engineer/streaming` -- real-time ingestion patterns
- `data-engineer/warehouse` -- target platform specifics
