# Query Optimization

EXPLAIN ANALYZE interpretation, index strategies, statistics management, and query rewriting techniques.

## When to Use

- Slow query diagnosis and resolution
- Index design and selection
- Understanding and fixing query planner decisions
- Rewriting queries for better performance (CTEs, window functions, subquery elimination)
- Statistics and cardinality estimation issues
- Partitioning for query performance

## Rules

1. Always use `EXPLAIN (ANALYZE, BUFFERS)` not just `EXPLAIN`; estimated vs actual rows divergence reveals statistics problems.
2. Sequential scan is not always bad; for small tables (<10k rows) or queries returning >10% of rows, seq scan wins.
3. Index-only scan requires the visibility map to be up-to-date (recent VACUUM); check `Heap Fetches` in EXPLAIN.
4. Multi-column index order matters: equality predicates first, then range/sort, then included columns (ESR rule).
5. `OR` conditions often prevent index usage; rewrite as `UNION ALL` of individual indexed queries when possible.
6. CTEs in PostgreSQL <12 are optimization fences; in PG 12+ they're inlined unless `MATERIALIZED` is specified.
7. Correlated subqueries execute per-row; convert to JOINs or lateral joins for set-based execution.
8. `DISTINCT` is often a symptom of a bad join; fix the join before adding DISTINCT.
9. Window functions with `PARTITION BY` benefit from matching composite indexes.
10. Covering indexes (`INCLUDE` clause in PG 11+) eliminate heap fetches for index-only scans.

## Reading EXPLAIN ANALYZE

```
Key metrics to check:
1. Actual Rows vs Planning Rows - mismatch = bad statistics
2. Loops - nested loop with high loop count = potential N+1
3. Buffers: shared hit vs read - read = cache miss = I/O
4. Sort Method: external merge = insufficient work_mem
5. Hash Batch > 1 = hash join spilling to disk
```

### Good Plan Indicators
- Index Scan / Index Only Scan on filter columns
- Actual rows close to planned rows
- Buffers: mostly shared hit (cached)
- No Sort with external merge disk

### Bad Plan Indicators
- Seq Scan on large table with selective WHERE
- Nested Loop with inner Seq Scan (missing index)
- Rows Removed by Filter >> Actual Rows (scanning too much)
- Sort Method: external merge Disk (increase work_mem or add index for ordered access)

## Patterns

### Composite Index Design (ESR Rule)
```sql
-- Query: WHERE status = 'active' AND created_at > '2026-01-01' ORDER BY priority DESC
-- Index: equality(status) -> sort(priority) -> range(created_at)
CREATE INDEX idx_tasks_lookup ON tasks (status, priority DESC, created_at);

-- Query: WHERE tenant_id = $1 AND type = $2 AND amount > $3
-- Index: equality fields in selectivity order
CREATE INDEX idx_payments ON payments (tenant_id, type, amount);
```

### Keyset Pagination (vs OFFSET)
```sql
-- BAD: OFFSET scans and discards rows
SELECT * FROM events ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- GOOD: keyset uses index directly
SELECT * FROM events
WHERE created_at < $last_seen_timestamp
ORDER BY created_at DESC
LIMIT 20;
```

### Eliminating N+1 with Lateral Join
```sql
-- Instead of: for each user, query latest 3 orders (N+1)
SELECT u.id, u.name, latest.*
FROM users u
CROSS JOIN LATERAL (
  SELECT o.id, o.total, o.created_at
  FROM orders o
  WHERE o.user_id = u.id
  ORDER BY o.created_at DESC
  LIMIT 3
) latest
WHERE u.active = true;
-- Requires index on orders(user_id, created_at DESC)
```

### Partial Index for Filtered Queries
```sql
-- Only 5% of orders are 'pending', but queried constantly
CREATE INDEX idx_orders_pending ON orders (created_at DESC)
WHERE status = 'pending';

-- Planner uses this ONLY when query includes WHERE status = 'pending'
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50;
```

### Fixing Statistics Misestimate
```sql
-- When planner estimates 1 row but actual is 50000:
-- Option 1: Increase statistics target
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
ANALYZE orders;

-- Option 2: Create extended statistics for correlated columns
CREATE STATISTICS orders_status_type (dependencies) ON status, order_type FROM orders;
ANALYZE orders;
```

## Window Function Optimization

```sql
-- Running total with proper index support
-- Index: (account_id, transaction_date)
SELECT
  account_id,
  transaction_date,
  amount,
  SUM(amount) OVER (PARTITION BY account_id ORDER BY transaction_date) as balance
FROM transactions
WHERE account_id = $1;
```

## Anti-Patterns

- Adding an index for every slow query without checking if existing indexes cover it
- `SELECT COUNT(*)` on large InnoDB tables without cache (full index scan); use estimates from `pg_class.reltuples`
- `LIKE '%search%'` (full scan); use trigram index (`pg_trgm`) or full-text search
- Implicit type casts in WHERE: `WHERE varchar_col = 123` prevents index usage
- `IN (SELECT ...)` with large subquery result; prefer `EXISTS` or `JOIN`
- Functions on indexed columns: `WHERE YEAR(created_at) = 2026` defeats index; use range

## Verification

- Compare `EXPLAIN ANALYZE` before and after index/query change
- Check `pg_stat_user_indexes` for scan counts on new indexes after 24h
- Verify `shared_buffers` hit ratio in BUFFERS output
- Test with production-like data volume; 100 rows performs differently than 100M
- Monitor `pg_stat_statements` for regression after deploying query changes
