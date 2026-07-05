---
name: database
description: "Database engineering: PostgreSQL, MongoDB, Redis, DynamoDB, schema design, query optimization"
---

# Database Expert

Senior DBA-level guidance for schema design, query optimization, migrations, replication, and storage engine selection across PostgreSQL, MySQL, MongoDB, Redis, and DynamoDB.

## Scope

- Schema design and normalization/denormalization decisions
- Query optimization via EXPLAIN plans, indexing strategies, statistics
- Zero-downtime migrations (expand-contract, online DDL)
- Replication topologies: sync/async, read replicas, multi-master
- Connection pooling configuration and sizing
- Storage engine selection and tuning
- Data modeling for relational and NoSQL systems
- Backup, recovery, and point-in-time restore strategies

## First Action

1. Identify the database engine(s) in use (check docker-compose, env vars, ORM config)
2. Read existing schema/migrations to understand current state
3. Check for existing indexes, constraints, and performance baselines
4. Route to appropriate subskill based on engine

## Constraints

1. Every DDL change must be reversible or use expand-contract pattern; never drop columns in the same release that removes code references.
2. Never add an index without checking table size, write frequency, and existing index overlap via `pg_stat_user_indexes` or equivalent.
3. Foreign keys require indexes on the referencing column; verify before adding FK constraints.
4. UUID primary keys must use UUIDv7 (time-sortable, RFC 9562) for B-tree friendliness; never UUIDv4 for clustered indexes.
5. Every query touching >10k rows must have an EXPLAIN ANALYZE review; no blind `SELECT *` in application code.
6. Connection pool size: legacy formula `(core_count * 2) + spindle_count` is a heuristic from HDD era; for SSD/NVMe start with `(2 * CPU cores)` and load test. Tune from there with metrics.
7. Migrations must be idempotent (`IF NOT EXISTS`, `IF EXISTS`) to survive re-runs in CI.
8. Never use `OFFSET` for deep pagination; use keyset/cursor pagination with indexed columns. Exceptions: jump-to-page UI with bounded results, non-unique sort columns needing composite cursor.
9. Partial indexes must specify the exact WHERE clause matching the application query to ensure planner usage.
10. All text search columns must specify collation explicitly; never rely on database-level defaults for sorted queries.
11. Transaction isolation level must be chosen per use-case; default READ COMMITTED, escalate to SERIALIZABLE only with retry logic.
12. Denormalize only with measured read/write ratio >10:1 AND proven query latency problem; never speculatively.
13. Every table must have `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`; soft-delete requires `deleted_at` index for filtered queries.
14. Replication lag monitoring must exist before routing reads to replicas; stale reads are data bugs.
15. Backup restore must be tested quarterly with documented runbook and measured RTO/RPO.

## DO NOT

- Add indexes to fix slow queries without checking if the query itself is the problem
- Use ORM-generated migrations in production without reviewing the raw SQL
- Store monetary values as floating point; use DECIMAL/NUMERIC or integer cents
- Use `TEXT` columns in composite indexes without length limits (MySQL) or expression indexes
- Create multi-column indexes without verifying column order matches query patterns (leftmost prefix rule)
- Recommend sharding before exhausting vertical scaling, read replicas, and query optimization
- Use database-level CASCADE DELETE on tables with >1M rows without queue-based cleanup
- Store JSON blobs as a substitute for proper relational modeling unless access patterns justify it

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| PostgreSQL-specific (extensions, JSONB, partitioning) | postgresql |
| MongoDB (document design, aggregation, sharding) | mongodb |
| Redis (caching, streams, data structures) | redis |
| MySQL/MariaDB (InnoDB, replication, ProxySQL) | mysql |
| DynamoDB (single-table, GSI, streams) | dynamodb |
| Schema changes, DDL, deploy safety | migrations |
| Slow queries, EXPLAIN, index design | query-optimization |

## Verification

- Run EXPLAIN ANALYZE on modified queries; compare cost before/after
- Check index usage via `pg_stat_user_indexes` or `SHOW INDEX` statistics
- Validate migrations in a transaction with ROLLBACK before applying
- Load test with realistic data volume (>10x current if early-stage)
- Verify connection pool metrics under concurrency (active, idle, waiting)
- Test failover/replica promotion in staging before production

## Knowledge

- `knowledge/index-strategies.md` - B-tree, GIN, GiST, BRIN, partial, covering
- `knowledge/replication-patterns.md` - Sync/async, read replicas, multi-master, CDC/logical replication (pg_logical, Debezium)
- `knowledge/schema-design.md` - Normalization, UUIDv7 (RFC 9562), soft deletes, audit
- `knowledge/connection-pooling.md` - PgBouncer, ProxySQL, HikariCP sizing
- `knowledge/nosql-patterns.md` - Document, wide-column, KV design patterns

## AI-Era Context (2026)

- Vector columns (pgvector, Atlas Vector Search) are standard for embedding storage; prefer database-native over external vector DBs for <10M vectors
- AI-generated queries must still pass EXPLAIN review; LLM-written SQL is often subtly wrong on joins and aggregations
- Embedding dimensions are shrinking (1536 -> 256-512); plan index strategies for HNSW with current dimension targets
- Time-series workloads increasingly handled by native extensions (TimescaleDB, InfluxDB) rather than vanilla RDBMS
- Schema-as-code tools (Atlas, Prisma Migrate, DBML) replacing hand-written migration files
- Serverless databases (Neon, PlanetScale, DynamoDB) change connection pooling assumptions; session affinity matters less
- PostgreSQL 17 (Sept 2024): incremental backup, SQL/JSON standard functions (JSON_TABLE, JSON_QUERY), identity column improvements

## Related Skills

- `system-design` - distributed data patterns, consistency models
- `security-engineering` - encryption at rest, row-level security, audit logging
- `golang-expert` / `typescript-expert` - ORM usage, query builder patterns
