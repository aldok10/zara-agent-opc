---
type: subskill
title: "Query Optimization"
---

# Query Optimization

## Core Concepts

- Query performance depends on: data volume, join strategy, index usage, and I/O patterns
- The query planner chooses execution strategy based on statistics — stale stats cause bad plans
- Seek vs scan: index seeks are O(log n), full scans are O(n) — know which your query does
- Join order and join type (hash, merge, nested loop) dramatically affect performance
- The fastest query is one that reads the least data — filter early, project only needed columns

## Key Practices

- Read the execution plan (EXPLAIN ANALYZE) before optimizing — measure, don't guess
- Add indexes on columns used in WHERE, JOIN ON, and ORDER BY — composite indexes for multi-column filters
- Avoid SELECT * — project only needed columns to reduce I/O
- Push predicates down: filter before joining when possible
- Rewrite correlated subqueries as JOINs when the optimizer doesn't flatten them

## Common Mistakes

- Adding indexes without checking if the optimizer actually uses them
- Optimizing based on small development datasets that don't match production cardinality
- Wrapping indexed columns in functions: WHERE YEAR(created_at) = 2024 defeats the index

## When to Apply

- Query takes longer than acceptable for its use case (SLA breach)
- Execution plan shows full table scans on large tables
- Dashboard or report queries have degraded as data volume grew
- Database CPU or I/O is spiking during specific query patterns
