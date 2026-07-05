---
type: example
title: "Reading EXPLAIN ANALYZE Output"
---

# Reading EXPLAIN ANALYZE Output

## Basic Syntax

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

- `ANALYZE`: actually executes the query (use with care on writes)
- `BUFFERS`: shows I/O statistics (shared hit vs read)
- `FORMAT TEXT`: human-readable (or JSON/YAML for tooling)

## Example Output (Good Query)

```
Index Scan using idx_orders_user_date on orders  (cost=0.43..8.45 rows=5 width=64) (actual time=0.021..0.035 rows=4 loops=1)
  Index Cond: (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
  Filter: (created_at > '2026-01-01'::timestamptz)
  Rows Removed by Filter: 1
  Buffers: shared hit=4
Planning Time: 0.085 ms
Execution Time: 0.052 ms
```

### Reading This:
- **Index Scan**: using an index (good)
- **rows=5 vs actual rows=4**: estimate close to reality (good statistics)
- **Buffers: shared hit=4**: all from cache, no disk reads
- **Rows Removed by Filter: 1**: only 1 extra row scanned (acceptable)
- **Total time: 0.052 ms**: fast

## Example Output (Problematic Query)

```
Sort  (cost=45232.12..45432.12 rows=80000 width=96) (actual time=1823.456..1845.123 rows=78543 loops=1)
  Sort Key: created_at DESC
  Sort Method: external merge  Disk: 12840kB
  Buffers: shared hit=234 read=12456, temp read=1605 written=1605
  ->  Seq Scan on orders  (cost=0.00..35000.00 rows=80000 width=96) (actual time=0.012..956.234 rows=78543 loops=1)
        Filter: (status = 'pending'::text)
        Rows Removed by Filter: 4921457
        Buffers: shared hit=234 read=12456
Planning Time: 0.234 ms
Execution Time: 1867.890 ms
```

### Problems Identified:

1. **Seq Scan on orders**: scanning entire table (5M rows) to find 78k
   - Fix: `CREATE INDEX idx_orders_pending ON orders (created_at DESC) WHERE status = 'pending'`

2. **Rows Removed by Filter: 4,921,457**: read 5M rows, kept 78k (1.6% selectivity)
   - This confirms an index would help dramatically

3. **Sort Method: external merge Disk**: insufficient memory for sort
   - Fix: `SET work_mem = '64MB'` for this query, or add index with matching sort order

4. **Buffers: read=12456**: 12k pages read from disk (not cached)
   - Table too large for shared_buffers, or first access

## Key Metrics to Check

| Metric | Good | Bad | Fix |
|--------|------|-----|-----|
| Scan type | Index Scan, Index Only Scan | Seq Scan on large table | Add index |
| Actual vs Estimated rows | Within 10x | Off by 100x+ | ANALYZE table, extended stats |
| Rows Removed by Filter | Low relative to returned | Orders of magnitude more | Move filter to index condition |
| Buffers: read vs hit | Mostly hit | Mostly read | Increase shared_buffers, or accept cold cache |
| Sort Method | quicksort Memory | external merge Disk | Increase work_mem or index sort |
| Loops | 1 | Thousands | Nested loop with missing index |

## Nested Loop Problem

```
Nested Loop  (cost=... rows=100) (actual time=0.1..4523.4 rows=100 loops=1)
  ->  Index Scan on users  (cost=... rows=100) (actual time=0.05..2.3 rows=100 loops=1)
  ->  Seq Scan on orders  (cost=... rows=1) (actual time=45.1..45.2 rows=1 loops=100)
        Filter: (user_id = users.id)
        Rows Removed by Filter: 49999
```

**Problem**: `Seq Scan on orders` happening 100 times (loops=100).
**Fix**: `CREATE INDEX idx_orders_user_id ON orders (user_id)`

## After Creating an Index

```sql
-- Verify the index is used
EXPLAIN (ANALYZE, BUFFERS) <original query>;

-- Check: should now show Index Scan, much lower buffers/time
-- If still Seq Scan: check if planner thinks seq scan is cheaper
--   - Table too small
--   - Statistics stale (run ANALYZE)
--   - Query returns too many rows (>10% of table)
```

## Tips

- Run `EXPLAIN ANALYZE` in a transaction with ROLLBACK for write queries
- Compare before/after when adding indexes
- `rows=1 loops=N` with high N often means missing index on join column
- `Hash Batches > 1` means hash join spilling to disk (increase work_mem)
- `Bitmap Heap Scan` is normal for moderate selectivity (between index scan and seq scan)
