---
type: reference
title: B-Tree vs LSM-Tree Deep Dive
---

# B-Tree vs LSM-Tree Deep Dive

## B-Tree (Balanced Tree)

Used by: PostgreSQL, MySQL (InnoDB), SQL Server, Oracle, SQLite

### Structure
- Pages (usually 4KB-16KB) as nodes
- Internal nodes: keys + pointers to child pages
- Leaf nodes: actual data or row pointers
- Tree height: O(log N) -- typically 3-4 levels for billions of rows

### Write Path
1. Find leaf page (read from disk if not in buffer pool)
2. Modify page in memory
3. Write WAL (Write-Ahead Log) for durability
4. Flush modified page to disk (eventually, via checkpoint)

### Read Path
- Point lookup: traverse root → leaf (3-4 I/Os)
- Range scan: leaf pages are linked (sequential I/O)

### Pros
- Fast reads (point + range)
- Mature, well-understood
- In-place updates (no write amplification for overwrites)
- Good for read-heavy workloads

### Cons
- Random I/O on writes (page splits, tree rebalancing)
- Write amplification: modify 1 row → write full page + WAL
- Fragmentation over time (page splits create sparse pages)

---

## LSM-Tree (Log-Structured Merge Tree)

Used by: Cassandra, RocksDB, LevelDB, ScyllaDB, DynamoDB, Bigtable, HBase

### Structure
- **MemTable**: in-memory sorted structure (skiplist, red-black tree)
- **Immutable MemTable**: sealed, being flushed
- **SSTables (Sorted String Tables)**: on-disk immutable files
  - Level 0: recently flushed, may overlap
  - Level 1+: non-overlapping key ranges, exponentially larger

### Write Path
1. Append to WAL (durability)
2. Insert into MemTable (O(1) or O(log N) in memory)
3. When MemTable full: flush to SSTable (sequential write)
4. Background compaction merges SSTables

### Read Path
1. Check MemTable (in memory)
2. Check Immutable MemTable
3. Check L0 SSTables (may be multiple)
4. Check L1+ SSTables (one per level, bloom filter first)
5. Merge results (newest wins)

### Compaction Strategies
| Strategy | Write Amp | Read Amp | Space Amp | Best For |
|----------|-----------|----------|-----------|----------|
| Leveled (LevelDB, RocksDB default) | Medium | Low | Low | Mixed read/write |
| Tiered (Cassandra) | Low | High | High | Write-heavy |
| Universal (RocksDB) | Medium | Medium | Medium | General |

### Pros
- Sequential writes (no random I/O)
- High write throughput
- Compression friendly (immutable files compress well)
- Good for write-heavy workloads

### Cons
- Read amplification (may check multiple SSTables)
- Space amplification (multiple versions until compaction)
- Write amplification (compaction rewrites data)
- Range scans less efficient (not naturally ordered on disk)

---

## Write Amplification Comparison

| Operation | B-Tree | LSM (Leveled) |
|-----------|--------|---------------|
| Insert 1 row | 1 page (4-16KB) + WAL | ~10-20 bytes in MemTable |
| Update 1 row | Read page + write page + WAL | New entry in MemTable (old stale) |
| Delete 1 row | Write page + WAL | Tombstone in MemTable |

LSM typically 10-100x lower write amplification on write-heavy workloads.

## Read Amplification Comparison

| Operation | B-Tree | LSM (Leveled) |
|-----------|--------|---------------|
| Point lookup (exists) | 3-4 I/Os | 1 (MemTable) to N (bloom filter + multiple levels) |
| Point lookup (not exists) | 3-4 I/Os | Check all levels (bloom filters help) |
| Range scan | Sequential leaf pages | Must merge from multiple SSTables |

B-Tree wins on reads; LSM wins on writes.

## When to Choose What

### Choose B-Tree when:
- Read-heavy workload (OLTP, analytics with range scans)
- Need strong consistency, ACID transactions
- Point lookups + range scans both important
- Write rate < 10k writes/sec (or can provision IOPS)
- Team familiar with RDBMS tuning

### Choose LSM when:
- Write-heavy workload (time series, logging, metrics, event sourcing)
- High throughput ingestion (100k-1M+ writes/sec)
- Can tolerate eventual consistency for reads
- Need compression (immutable files compress better)
- Using Cassandra, ScyllaDB, RocksDB, Bigtable

## Hybrid Approaches

- **PostgreSQL**: B-Tree for indexes, but WAL is append-only log
- **MySQL + RocksDB**: RocksDB as storage engine (MyRocks)
- **TiKV**: Raft + RocksDB (LSM) with MVCC
- **ScyllaDB**: Seastar + LSM (C++ implementation, no GC pauses)

## Related Topics

- SSTable format and bloom filters
- Compaction strategies and tradeoffs
- Write-ahead log vs commit log
- Database isolation levels (affects both equally)
- Consistent hashing (data distribution, not storage engine)