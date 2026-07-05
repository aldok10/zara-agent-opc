---
type: subskill
title: "Partitioning"
---

# Partitioning

## Core Concepts

- Partitioning divides a table into smaller physical segments based on a partition key
- Query engines skip irrelevant partitions (partition pruning)  -  reading 1 day instead of 5 years
- Common strategies: range (date), hash (ID distribution), list (category/region)
- Partition key choice determines query performance: pick the most common filter column
- Too many small partitions create overhead; too few large ones reduce pruning benefit

## Key Practices

- Partition by the most common WHERE clause column  -  usually a date or timestamp
- Size partitions to balance between pruning effectiveness and file management overhead
- Ensure queries always include the partition key in filters for pruning to activate
- Combine partitioning with clustering/sort keys for further I/O reduction within partitions
- Monitor partition sizes: skewed partitions indicate a poor key choice

## Common Mistakes

- Partitioning by high-cardinality columns (user_id): creates millions of tiny partitions
- Queries that don't filter on partition key: full table scans despite partitioning
- Never pruning old partitions: storage grows unbounded for retention-limited data

## When to Apply

- Table exceeds hundreds of millions of rows and queries filter by a known dimension
- Full table scans are too expensive but most queries only need recent data
- Need to efficiently drop/archive old data (drop partition vs DELETE WHERE)
- Data lake files need to be organized for efficient query engine access
