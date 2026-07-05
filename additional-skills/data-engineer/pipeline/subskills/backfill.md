---
type: subskill
title: "Backfill"
---

# Backfill

## Core Concepts

- Backfill reprocesses historical data through a pipeline, usually after a bug fix or schema change
- Must not interfere with ongoing incremental processing of current data
- Resource management is critical: backfilling months of data at once can overwhelm systems
- Idempotency is a prerequisite — without it, backfill risks duplicating historical data
- Backfill scope should be precisely bounded: start date, end date, affected partitions

## Key Practices

- Run backfills on isolated compute to avoid starving production pipeline resources
- Process in small batches (one day/partition at a time) with progress checkpointing
- Validate backfilled data against known-good snapshots or aggregate checksums
- Use the same pipeline code for backfill and incremental — avoid separate "backfill scripts"
- Communicate with downstream consumers: backfilled data may trigger reprocessing

## Common Mistakes

- Backfilling all history at once: OOM, timeouts, and corrupted partial state
- Using different logic for backfill vs. regular runs — introduces subtle inconsistencies
- Forgetting to notify downstream systems that historical data has changed

## When to Apply

- Bug fix changes output for previously processed dates
- New column or metric needs to be populated for historical data
- Pipeline was down for a period and missed data needs reprocessing
- Migrating to a new pipeline version that produces different output format
