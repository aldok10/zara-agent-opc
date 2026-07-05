---
type: subskill
title: "Materialized Views"
---

# Materialized Views

## Core Concepts

- Materialized views store pre-computed query results physically — reads are fast, writes pay the cost
- Unlike regular views, they don't re-execute the query on every read
- Refresh strategies: full refresh (replace all), incremental (update changed rows), on-demand vs scheduled
- They trade storage and freshness for query performance
- Best for expensive aggregations, joins, or transformations that change infrequently

## Key Practices

- Choose refresh frequency based on data freshness SLA — not everything needs real-time
- Incremental refresh when possible: only process rows that changed since last refresh
- Add indexes on materialized views for further query speedup on filtered access
- Monitor refresh duration and storage growth — catch degradation before it affects SLAs
- Use materialized views as the serving layer between raw tables and BI tools

## Common Mistakes

- Refreshing too frequently: the refresh cost exceeds the query savings
- Building materialized views without monitoring staleness — consumers assume data is current
- Creating too many overlapping materialized views — storage bloat and maintenance burden

## When to Apply

- Dashboard queries are too slow against raw tables
- Same expensive aggregation is computed repeatedly by multiple consumers
- Data warehouse SLAs require sub-second response on pre-defined query patterns
- Building a semantic/serving layer above raw ingestion tables
