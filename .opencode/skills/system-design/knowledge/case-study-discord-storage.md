---
type: reference
title: Discord Storage Evolution: MongoDB → Cassandra → ScyllaDB
---

# Discord Storage Evolution -- MongoDB → Cassandra → ScyllaDB

## Phase 1: MongoDB (2015 -- ~100M messages)

**Architecture**: Single MongoDB replica set

**Why MongoDB**:
- Flexible schema (messages had varying fields)
- Easy horizontal scaling (sharding) -- or so they thought
- JSON-like documents matched message structure

**Problems at scale**:
- 100M messages → RAM couldn't hold working set + indexes
- Latency became unpredictable (cache misses → disk seeks)
- Sharding didn't help: single shard held most active data (recent messages)
- Replica set election storms under load

**Lesson**: MongoDB works until working set exceeds RAM. Sharding by time doesn't help when 95% of traffic hits recent data.

---

## Phase 2: Cassandra (2017 -- billions of messages)

**Architecture**: 12-node Cassandra cluster → eventually 177 nodes

**Why Cassandra**:
- LSM-tree write path = fast writes
- Tunable consistency
- Linear horizontal scaling
- No single hot shard (token-based partitioning)

**Problems at 177 nodes / trillions of messages**:
- **Read amplification**: LSM-tree reads check multiple SSTables. p99 read latency 40-125ms
- **Compaction storms**: SSTable compaction consumed CPU/IOPS, spiked latency
- **GC pauses**: JVM garbage collection on 177 nodes → 1-2s pauses, unpredictable
- **Operational complexity**: Repair, bootstrap, decommission at 177 nodes = constant toil

**Lesson**: Cassandra scales writes beautifully. Reads and operations at 177-node scale become the bottleneck.

---

## Phase 3: ScyllaDB (2022 -- present)

**Architecture**: 
- Monolithic API service (Rust)
- Data service (Rust) 
- ScyllaDB cluster (C++, no JVM)

**Why ScyllaDB**:
- Cassandra-compatible (same data model, CQL)
- Written in C++ with Seastar framework -- no GC, thread-per-core
- Same LSM-tree but optimized compaction, better caching
- 10x fewer nodes for same throughput

**Results**:
| Metric | Cassandra (177 nodes) | ScyllaDB |
|--------|----------------------|----------|
| p99 read latency | 40-125ms | **15ms** |
| p99 write latency | 5-70ms | **5ms** |
| Node count | 177 | ~17 |
| Operational overhead | High | Low |

**Architecture redesign with ScyllaDB**:
- Monolithic API (not microservices) → reduced RPC overhead
- Data service in Rust → direct ScyllaDB driver, no intermediate layer
- Partition strategy: channel_id + bucket (time-based) → even distribution
- Message ID = snowflake (time-ordered) → natural clustering key

---

## Key Technical Decisions

### Partitioning Strategy
```
Partition key: (channel_id, bucket)
Clustering key: message_id (snowflake, time-ordered)
Bucket = time window (e.g., 2 weeks)
```
- Messages in same channel + time window = same partition
- Recent messages in same partition = efficient range scans
- Natural TTL via bucket expiration

### Why Not SQL / Postgres?
- Discord's access pattern: append-only, time-ordered, per-channel
- No complex joins, no transactions across messages
- LSM-tree (Cassandra/Scylla) beats B-Tree for this write pattern
- Trillion-row scale in single table -- not Postgres sweet spot

### Migration Strategy
- Dual-write phase: write to both Cassandra and ScyllaDB
- Backfill historical data
- Shadow read validation
- Cutover with feature flag

---

## Transferable Lessons

1. **Storage engine must match access pattern**: Append-only + time-ordered + per-entity = LSM-tree wins

2. **GC pauses kill tail latency at scale**: JVM-based systems (Cassandra, Kafka, Elasticsearch) hit GC walls. Rewrite in Rust/C++ (ScyllaDB, Redpanda, Tigris) eliminates this.

3. **Node count ≠ capacity**: 177 Cassandra nodes → 17 ScyllaDB nodes. Better software > more hardware.

3. **Monolithic service can beat microservices**: Discord moved FROM microservices TO monolith for the hot path. Reduced RPC, serialization, network hops.

4. **Compaction strategy matters**: Leveled compaction (ScyllaDB default) = predictable read amplification. Tiered (Cassandra default) = write-optimized but read-heavy.

5. **Partition by access pattern, not just cardinality**: Channel + time bucket = hot partition for active channels but isolated from others. Global snowflake ID = sortable globally.

---

## ByteByteGo Source

"How Discord Stores Trillions of Messages" -- ByteByteGo case study, referencing Discord engineering blog posts (2017, 2022).