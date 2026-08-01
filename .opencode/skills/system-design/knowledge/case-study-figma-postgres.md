---
type: reference
title: Figma 100X Postgres Scaling
---

# Figma 100X Postgres Scaling -- Evolutionary Case Study

## Context

- 3M monthly active users (2018)
- 200% user growth since 2018
- 100X database growth over ~4 years
- Started: single Amazon RDS Postgres instance

## Phase 1: Vertical Scaling + Read Replicas (2018-2019)

**Problem**: Single RDS instance hitting CPU, memory, and connection limits

**Actions**:
- Upgraded instance: r5.12xlarge → r5.24xlarge (largest available at the time)
- Added multiple read replicas for read traffic offload
- Deployed PgBouncer as connection pooler
  - Before: direct connections = growing connection count = memory pressure
  - After: application → PgBouncer (few hundred connections) → Postgres

**Result**: Bought ~1 year of headroom. Cost increased but simpler than sharding.

**Key insight**: Always exhaust vertical scaling + read replicas + connection pooling before considering sharding. PgBouncer is often the highest-ROI intervention.

---

## Phase 2: Vertical Partitioning (2020)

**Problem**: Specific tables ("Figma Files", "Organizations") were hot -- disproportionate load, different access patterns

**Actions**:
- Migrated high-traffic tables to separate dedicated RDS instances
- "Figma Files" → dedicated DB (heavy write, large blobs)
- "Organizations" → dedicated DB (metadata, lower write)
- Each DB got its own PgBouncer instance
- Application routes queries to correct DB based on table

**Result**: Isolated blast radius. Hot table contention no longer affects others. Independent scaling per table group.

**Key insight**: Vertical partitioning (by table/function) is easier than horizontal (by shard key) -- no cross-shard queries, simpler routing.

---

## Phase 3: Horizontal Partitioning / Sharding (2021-2022)

**Problem**: 
- Some tables crossed several terabytes
- Billions of rows in single tables
- Postgres VACUUM became bottleneck (can't keep up with dead tuples)
- Max IOPS exceeded Amazon RDS limits at the time

**Actions**:
- Implemented horizontal partitioning: split large tables across multiple physical databases
- Built custom **DBProxy** service:
  - Routes queries based on shard key
  - Handles cross-shard queries (scatter-gather)
  - Manages connection pooling per shard
  - Provides unified interface to application

**Shard key strategy**: 
- File-centric: shard by `file_id` (natural tenant boundary)
- User-centric: shard by `user_id` for user-scoped data
- Composite keys for join-heavy access patterns

**Result**: Linear scaling by adding shards. VACUUM runs per-shard (manageable). IOPS distributed.

---

## Key Lessons (Transferable)

1. **Order matters**: Vertical → Vertical Partition → Horizontal. Each step buys time and reduces blast radius of next step.

2. **Connection pooling first**: PgBouncer before read replicas before sharding. Highest ROI, lowest risk.

3. **VACUUM at scale is real**: Autovacuum can't keep up with high-write tables at TB scale. Sharding isolates VACUUM scope.

4. **Custom proxy enables transparent sharding**: DBProxy abstracts routing. Application doesn't need shard awareness for simple queries.

5. **Read replicas ≠ write scaling**: Read replicas help read throughput. Write scaling requires partitioning.

6. **Monitor the right metrics**: Connections, IOPS, VACUUM lag, replication lag -- not just CPU/memory.

## Related Patterns

- Vertical partitioning (separate DBs by table group)
- Connection pooling (PgBouncer, ProxySQL)
- Horizontal sharding (custom proxy, Vitess, Citus)
- VACUUM management at scale
- Amazon RDS limitations and workarounds

## ByteByteGo Source

"How Figma Scaled Its Postgres Database by 100X" -- ByteByteGo case study, referencing Figma engineering blog posts.