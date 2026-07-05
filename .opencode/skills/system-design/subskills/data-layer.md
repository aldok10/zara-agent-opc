---
type: subskill
title: "Data Layer: Database Design & Data Modeling"
---

# Data Layer: Database Design & Data Modeling

Deep-dive reference for choosing and modeling your persistence layer.

## SQL vs NoSQL Decision Framework

- **SQL** (Postgres, MySQL): structured data, relationships, ACID transactions, complex queries/joins, reporting. Default choice unless you have a reason not to.
- **Document NoSQL** (MongoDB, Firestore): flexible/evolving schema, denormalized aggregates, horizontal scale, no cross-document transactions needed.
- **Key-value** (DynamoDB, Redis): known access patterns, massive scale, single-key lookups, low latency.
- **Time-series** (TimescaleDB, InfluxDB): metrics, events, append-heavy with time-range queries.
- **Graph** (Neo4j): relationship-heavy traversals (social, recommendations, fraud rings).

Rule of thumb: **structured + ACID = SQL. Flexible schema + scale = NoSQL. Time-series = specialized.**

## Indexing Strategy

- **B-tree** (default): range queries, sorting, equality. `WHERE age > 30 ORDER BY created_at`.
- **Hash**: equality only, faster than B-tree for exact match. Rarely worth it vs B-tree.
- **GIN**: full-text search, JSONB containment, array membership. `WHERE tags @> '{urgent}'`.
- **Partial index**: index a subset. `CREATE INDEX ... WHERE status = 'active'`  --  smaller, faster.
- **Covering index** (INCLUDE): satisfy a query entirely from the index, no table lookup.
- **Composite index**: order matters  --  `(a, b)` serves `WHERE a=?` and `WHERE a=? AND b=?`, NOT `WHERE b=?`.

## Sharding

- **Hash sharding**: `shard = hash(key) % N`. Even distribution, but range queries hit all shards. Resharding is painful (use consistent hashing to reduce reshuffling).
- **Range sharding**: shard by key range. Good locality for range scans, but risks hotspots (e.g., all recent writes on one shard).
- **Cross-shard queries**: scatter-gather (query all, merge) is slow. Design to keep related data co-located via shard key.
- Resharding: use consistent hashing or logical shards (many logical → few physical) to migrate incrementally.

## Replication

- **Sync replication**: primary waits for replica ack. Strong consistency, higher write latency, safer failover.
- **Async replication**: primary doesn't wait. Fast writes, risk of data loss on failover, replication lag.
- **Read replicas**: offload reads. Watch for **replication lag**  --  read-after-write may see stale data. Route critical reads to primary or use "read your writes" tokens.
- **Failover**: automatic promotion (Patroni, RDS Multi-AZ). Test it; split-brain is the danger.

## Data Modeling

- **Normalize for writes**: no duplication, updates touch one place, enforces integrity. Cost: joins.
- **Denormalize for reads**: duplicate data to avoid joins, faster reads. Cost: update complexity, consistency risk.
- **Materialized views**: middle ground  --  precomputed joins/aggregates, refreshed periodically. Great for dashboards/reporting.

## Engine Decision Matrix

| Need | Pick |
|------|------|
| General relational, rich features, JSONB | **PostgreSQL** |
| Simple relational, huge read scale, ubiquity | **MySQL** |
| Flexible documents, rapid iteration | **MongoDB** |
| Serverless KV, predictable scale, AWS-native | **DynamoDB** |
| Distributed SQL, global, horizontal writes | **CockroachDB** |

## Common Mistakes

- **N+1 queries**: loading a list then querying per item. Use joins or batch/`IN` loads.
- **Missing indexes on foreign keys**: joins and cascading deletes go slow.
- **Over-sharding**: sharding before you need it adds huge complexity. Vertical scale + replicas first.
- **NoSQL for relational data**: recreating joins in app code is worse than a SQL join.

## Numbers to Know

- Single Postgres: **10K–50K QPS** depending on query complexity.
- SSD random read: **~100μs**. HDD random read: **~10ms** (100x slower).
- Memory access: ~100ns. Network round trip (same DC): ~0.5ms.
- Index lookup on millions of rows: microseconds. Full table scan: linear in table size.
