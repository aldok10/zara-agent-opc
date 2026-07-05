# MySQL / MariaDB

InnoDB internals, replication topologies, ProxySQL, Percona Toolkit, and online DDL strategies.

## When to Use

- InnoDB tuning (buffer pool, redo log, adaptive hash index)
- Replication setup: source-replica, group replication, Galera
- ProxySQL for connection pooling and query routing
- Online schema changes with pt-online-schema-change or gh-ost
- MySQL 8.0+ features (CTEs, window functions, invisible indexes, histograms)
- MariaDB-specific features (sequences, system versioning)

## Rules

1. InnoDB buffer pool should be 70-80% of available RAM on dedicated servers; single most impactful setting.
2. `innodb_flush_log_at_trx_commit=1` for durability, `=2` only for replica or non-critical data.
3. Never use MyISAM in 2026; no transactions, no crash safety, no concurrent writes.
4. Primary keys must be auto-increment integers or UUIDv7 stored as `BINARY(16)`; random UUIDs cause page splits.
5. Online DDL with `ALGORITHM=INPLACE, LOCK=NONE` when possible; use gh-ost for large tables (>10M rows) to avoid metadata locks.
6. `SELECT ... FOR UPDATE` holds row locks until COMMIT; always use short transactions with explicit timeouts.
7. Query cache is removed in MySQL 8.0; don't look for it. Use application-level caching (Redis).
8. Use `EXPLAIN FORMAT=TREE` (MySQL 8.0+) for accurate cost estimates; legacy `EXPLAIN` format is misleading.
9. ProxySQL hostgroups: writer=10, reader=20. Configure query rules to route SELECTs to readers.
10. Replication: enable GTID (`gtid_mode=ON`), use semi-sync for critical data, monitor `Seconds_Behind_Master`.

## InnoDB Key Settings

```ini
[mysqld]
innodb_buffer_pool_size = 12G          # 70-80% of RAM
innodb_buffer_pool_instances = 8       # 1 per GB of buffer pool
innodb_redo_log_capacity = 4G          # Replaces innodb_log_file_size (deprecated 8.0.30, removed 8.4)
innodb_flush_log_at_trx_commit = 1     # ACID compliance
innodb_io_capacity = 2000              # Match SSD IOPS
innodb_io_capacity_max = 4000
innodb_read_io_threads = 8
innodb_write_io_threads = 8
```

## Patterns

### Online Schema Change (gh-ost)
```bash
gh-ost \
  --host=replica.db \
  --database=app \
  --table=orders \
  --alter="ADD COLUMN shipping_method VARCHAR(50) DEFAULT NULL" \
  --execute \
  --allow-on-master \
  --chunk-size=1000 \
  --max-load='Threads_running=50'
```

### ProxySQL Query Rules
```sql
-- Route reads to replica hostgroup
INSERT INTO mysql_query_rules (rule_id, match_pattern, destination_hostgroup, apply)
VALUES (1, '^SELECT .* FOR UPDATE', 10, 1),  -- writes stay on master
       (2, '^SELECT', 20, 1);                 -- reads to replicas

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

### Invisible Indexes (Test Before Drop)
```sql
-- Make index invisible to optimizer (still maintained)
ALTER TABLE orders ALTER INDEX idx_old_status INVISIBLE;
-- Monitor for 1 week, check slow query log
-- If no regression, safe to drop
ALTER TABLE orders DROP INDEX idx_old_status;
```

### Histograms for Better Estimates
```sql
ANALYZE TABLE orders UPDATE HISTOGRAM ON status, payment_type WITH 100 BUCKETS;
-- Helps optimizer with skewed distributions without adding indexes
```

## Anti-Patterns

- `utf8` charset (3 bytes, truncates emoji); use `utf8mb4` always
- `ENUM` types for values that change; use lookup tables instead
- Implicit type conversions in WHERE (string column compared to integer defeats index)
- `INSERT ... ON DUPLICATE KEY UPDATE` in loops; use bulk `INSERT ... VALUES (...), (...)`
- `GROUP BY` without explicit column list relying on `ONLY_FULL_GROUP_BY` being disabled
- Running `ALTER TABLE` directly on 100M+ row tables during peak hours

## Percona Toolkit Essentials

| Tool | Use |
|------|-----|
| pt-online-schema-change | DDL without downtime |
| pt-query-digest | Analyze slow query log |
| pt-table-checksum | Verify replication consistency |
| pt-archiver | Safely archive/purge old rows |
| pt-stalk | Capture diagnostics on threshold |

## Verification

- `EXPLAIN FORMAT=TREE` for query plans with actual costs
- `SHOW ENGINE INNODB STATUS` for deadlocks, buffer pool hit rate
- `performance_schema.events_statements_summary_by_digest` for top queries
- Monitor replication: `SHOW REPLICA STATUS\G` -> Seconds_Behind_Source
- Check buffer pool hit rate: should be >99% (`Innodb_buffer_pool_read_requests` vs `Innodb_buffer_pool_reads`)
