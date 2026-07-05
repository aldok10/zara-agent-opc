---
type: fact
title: "Query Plans"
---

# Query Plans

Reading PostgreSQL EXPLAIN output, understanding join strategies, and interpreting cost models.

## Running EXPLAIN

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

| Option | Purpose |
|--------|---------|
| ANALYZE | Actually execute (shows real times) |
| BUFFERS | Show buffer hit/read counts |
| COSTS | Show planner cost estimates (default on) |
| TIMING | Show per-node timing (default on with ANALYZE) |
| FORMAT | TEXT (readable), JSON (programmatic), YAML |
| SETTINGS | Show non-default planner settings |
| WAL | Show WAL usage (write queries) |

**Warning**: ANALYZE executes the query. Wrap mutating queries in a transaction and ROLLBACK.

## Reading the Plan Tree

Plans are trees read bottom-up, left-to-right (deepest nodes execute first).

```
Nested Loop  (cost=0.43..124.56 rows=10 width=48) (actual time=0.03..0.12 rows=8 loops=1)
  ->  Index Scan using idx_user on users u  (cost=0.29..8.31 rows=1 width=16) (actual...)
        Filter: (active = true)
        Rows Removed by Filter: 0
  ->  Index Scan using idx_orders_user on orders o  (cost=0.14..11.52 rows=10 width=32) (actual...)
        Index Cond: (user_id = u.id)
```

### Key Fields

| Field | Meaning |
|-------|---------|
| cost=X..Y | Startup cost..total cost (arbitrary units, relative) |
| rows=N | Estimated rows output |
| actual time=X..Y | Startup..total time in ms |
| rows=N | Actual rows output |
| loops=N | Number of times node executed |
| width=N | Average row size in bytes |

**Actual time per row**: multiply `actual time` by `loops` for true total time.

## Scan Types

| Scan | Meaning | Good/Bad |
|------|---------|----------|
| Seq Scan | Full table scan | Bad on large tables with selective filter |
| Index Scan | Traverse index, fetch from heap | Good for selective queries |
| Index Only Scan | Serve from index alone (no heap) | Best -- requires visibility map current |
| Bitmap Index Scan + Bitmap Heap Scan | Batch index lookups, sort by page | Good for medium selectivity (1-20%) |
| TID Scan | Direct tuple ID lookup | Internal/rare |

### When Seq Scan is Acceptable

- Table is small (<10k rows or fits in shared_buffers)
- Query selects >20% of rows (index adds overhead)
- No usable index exists and query is infrequent
- Statistics are stale (`ANALYZE table_name` to fix)

## Join Strategies

| Join | How It Works | When Chosen |
|------|-------------|-------------|
| Nested Loop | For each outer row, scan inner | Small outer set, indexed inner |
| Hash Join | Build hash table on inner, probe with outer | Large sets, equality joins, no index |
| Merge Join | Sort both sides, merge | Pre-sorted input or useful for ORDER BY |

### Nested Loop

Best when outer is small and inner has an index on the join key. Cost: O(outer * log(inner)).

### Hash Join

Build phase creates in-memory hash of smaller relation. Probe phase scans larger relation. Cost: O(inner + outer). Spills to disk if `work_mem` exceeded.

### Merge Join

Requires sorted inputs (from index or explicit sort). Efficient for large sorted datasets. Cost: O(N log N + M log M) for sort + O(N + M) for merge.

## Buffer Statistics

```
Buffers: shared hit=120 read=15 dirtied=2 written=0
```

| Stat | Meaning |
|------|---------|
| shared hit | Pages found in shared_buffers (cache hit) |
| shared read | Pages read from OS/disk |
| dirtied | Pages modified |
| written | Pages written out during query |

**Cache hit ratio**: hit / (hit + read). Target >95% for hot queries.

## Cost Model Basics

PostgreSQL cost is based on:
- `seq_page_cost` = 1.0 (baseline)
- `random_page_cost` = 4.0 (random I/O, reduce to 1.1-1.5 for SSD)
- `cpu_tuple_cost` = 0.01
- `cpu_index_tuple_cost` = 0.005
- `cpu_operator_cost` = 0.0025

For SSD-backed databases, set `random_page_cost` = 1.1 to bias planner toward index scans.

## Statistics and Estimates

Bad row estimates (estimated vs actual differ by >10x) cause wrong plan selection.

```sql
-- Check table statistics freshness
SELECT relname, last_analyze, last_autoanalyze, n_live_tup
FROM pg_stat_user_tables WHERE relname = 'orders';

-- Fix statistics
ANALYZE orders;

-- Increase statistics target for skewed columns
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
ANALYZE orders;
```

## Common Plan Problems

### Problem: Seq Scan on Large Table with Index

Causes: stale statistics, implicit type cast, function wrapping indexed column, low `random_page_cost`.

### Problem: Nested Loop on Large Join

Causes: bad row estimate on outer side, missing index on inner side, `enable_hashjoin=off`.

### Problem: Sort + Limit Without Index

```
Sort  (cost=50000..50001 rows=1000000 width=40)
  Sort Key: created_at DESC
  Sort Method: top-N heapsort  Memory: 25kB
```

Fix: create index on sort columns; planner uses index to avoid sort.

### Problem: Bitmap Heap Scan with Recheck

```
Bitmap Heap Scan (Recheck Cond: ...)
  Rows Removed by Index Recheck: 5000
```

Cause: `work_mem` too low for bitmap; lossy pages require heap recheck. Increase `work_mem`.

## Useful Diagnostic Queries

```sql
-- Top queries by total time
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;

-- Index usage ratio
SELECT relname, seq_scan, idx_scan,
       CASE WHEN seq_scan + idx_scan > 0
            THEN round(100.0 * idx_scan / (seq_scan + idx_scan), 1)
            ELSE 0 END AS idx_pct
FROM pg_stat_user_tables ORDER BY seq_scan DESC;
```
