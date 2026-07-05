# PostgreSQL

Advanced PostgreSQL: extensions, JSONB, partitioning, replication, monitoring, vacuum, and WAL management.

## When to Use

- PostgreSQL-specific features (JSONB, arrays, custom types, extensions)
- Partitioning strategy for large tables
- Replication setup or troubleshooting
- Vacuum/autovacuum tuning
- WAL management and archiving
- Extension selection (pgvector, PostGIS, pg_cron, etc.)

## Rules

1. Use `JSONB` not `JSON`; JSON stores text, JSONB stores parsed binary with index support.
2. GIN indexes on JSONB must target specific paths (`CREATE INDEX ON t USING gin ((data->'tags'))`) not entire columns unless full-text search needed.
3. Partitioning threshold: >50M rows OR >100GB OR time-series with retention policy. Below that, indexes suffice.
4. Use declarative partitioning (PG 12+) with `PARTITION BY RANGE` for time-series; `PARTITION BY LIST` for tenant isolation.
5. Always create indexes on partitioned tables AFTER partitioning; global indexes don't exist in PG.
6. `pg_stat_statements` must be enabled in every environment; it's the primary query performance tool.
7. Autovacuum settings per table for high-churn tables: lower `autovacuum_vacuum_scale_factor` to 0.01-0.05.
8. Logical replication for selective table sync; physical replication for full HA failover.
9. Use `pg_repack` for online table/index rebuilds without exclusive locks.
10. Connection limits: set `max_connections` conservatively (100-300), use PgBouncer for multiplexing.

## Patterns

### JSONB with Typed Access
```sql
-- Partial index on JSONB path
CREATE INDEX idx_orders_status ON orders ((metadata->>'status'))
WHERE metadata->>'status' IS NOT NULL;

-- GIN for containment queries
CREATE INDEX idx_tags ON articles USING gin (tags jsonb_path_ops);
SELECT * FROM articles WHERE tags @> '["postgresql"]';
```

### Declarative Partitioning
```sql
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL,
    payload JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_q1 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

### Monitoring Queries
```sql
-- Top slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;

-- Unused indexes
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- Table bloat estimate
SELECT relname, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables WHERE n_dead_tup > 10000;
```

## Anti-Patterns

- Using `NOTIFY/LISTEN` as a job queue (use pgmq or dedicated queue)
- `SELECT FOR UPDATE` without `NOWAIT` or `SKIP LOCKED` in high-concurrency
- Storing large blobs in BYTEA instead of external storage with reference
- Running `VACUUM FULL` during business hours (takes ACCESS EXCLUSIVE lock)
- Using `SERIAL` instead of `GENERATED ALWAYS AS IDENTITY` (PG 10+)

## Extensions Worth Knowing

| Extension | Use Case |
|-----------|----------|
| pgvector | Vector similarity search for embeddings |
| PostGIS | Geospatial queries |
| pg_cron | Scheduled jobs inside the database |
| pg_stat_statements | Query performance monitoring |
| pgmq | Lightweight message queue |
| pg_repack | Online table reorganization |
| timescaledb | Time-series optimization |

## Verification

- `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` on every new query
- Check `pg_stat_user_indexes` for index scan counts after deployment
- Monitor `pg_stat_activity` for long-running queries and lock waits
- Verify autovacuum is keeping up: `n_dead_tup` should not grow unbounded
- Test partition pruning with `EXPLAIN` showing excluded partitions
