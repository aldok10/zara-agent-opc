---
type: fact
title: "Data Modeling - Relational, Document, Graph, Time-Series"
---

# Data Modeling

Choosing the right data model is an access-pattern decision, not a technology preference. Model for how you read, not how you store.

## Relational Modeling

### Normalization

Eliminate redundancy by decomposing tables into smaller relations linked by foreign keys.

| Normal Form | Rule | Practical impact |
|-------------|------|------------------|
| 1NF | Atomic values, no repeating groups | No arrays in columns |
| 2NF | No partial dependencies on composite key | Split lookup tables |
| 3NF | No transitive dependencies | Remove derived data |
| BCNF | Every determinant is a candidate key | Rare edge case cleanup |

**When to use**: OLTP workloads with frequent writes, evolving schemas, strong consistency requirements. Banking, inventory, user accounts.

### Denormalization

Intentionally duplicate data to reduce joins at read time.

**When to use**: read-heavy workloads (>90% reads), reporting tables, materialized views, latency-sensitive queries where join cost is unacceptable.

**Trade-offs**: faster reads, slower writes, update anomalies (must update all copies), storage increase. Mitigate with change-data-capture or triggers for sync.

**Real-world numbers**: a normalized schema needing 5-table joins at 50ms can become a single-table read at 2ms after denormalization. Worth it when that query runs 10K+ times/second.

### Indexing strategies

- B-tree: default for equality and range queries. O(log n) lookups.
- Hash: O(1) equality-only. PostgreSQL, DynamoDB.
- GIN/GiST: full-text search, JSONB, geographic data.
- Partial indexes: index only rows matching a condition. Reduce size by 80%+ for sparse queries.
- Covering indexes (INCLUDE): avoid heap lookups entirely.

## Document Model (MongoDB, DynamoDB, CouchDB)

### Core principle

Store data as it's accessed. Embed related data in a single document when read together.

### Embedding vs referencing

| Pattern | Use when | Avoid when |
|---------|----------|------------|
| Embed | 1:few relationship, read together, rarely changes | Unbounded growth, updated independently, shared across entities |
| Reference | many:many, large sub-objects, independent lifecycle | Always read together (forces extra query) |

### MongoDB patterns

- **Bucket pattern**: group time-series data into fixed-size documents (e.g., 200 readings per doc). Reduces document count by 100x.
- **Outlier pattern**: flag documents that exceed embed limits, store overflow in separate collection.
- **Computed pattern**: pre-compute aggregates on write. Store `totalOrders: 47` instead of counting on read.
- **Extended reference**: embed a subset of referenced data (name, avatar) to avoid joins for display.
- **Schema versioning**: add `schemaVersion` field, migrate on read or via background job.

### Document size limits

MongoDB: 16MB per document. DynamoDB: 400KB per item. Design with these ceilings in mind  --  if an array can grow unboundedly, it will hit the limit.

## Graph Databases (Neo4j, Neptune, JanusGraph)

### Property graph model

- Nodes: entities with labels and properties.
- Edges: directed relationships with type and properties.
- Both nodes and edges carry arbitrary key-value properties.

### When to use

- Relationship-heavy queries: "friends of friends who bought X within 2 hops."
- Variable-depth traversals: org charts, dependency trees, recommendation engines.
- Pattern matching: fraud detection (cycles in transaction graphs).

### When NOT to use

- Simple CRUD with known access patterns (relational is simpler and faster).
- High-volume writes with simple lookups (key-value is better).
- Aggregation-heavy analytics (columnar stores win).

### Performance characteristics

Neo4j: index-free adjacency means traversal cost is O(relationships traversed), not O(total graph size). A 3-hop query over 1B nodes takes the same time as over 1M nodes if the local neighborhood is the same size.

### Modeling tips

- Model verbs as edges, nouns as nodes.
- Avoid "god nodes" with millions of edges (partition by time or type).
- Use edge properties for weights, timestamps, metadata.

## Time-Series Databases (InfluxDB, TimescaleDB, QuestDB)

### Characteristics

- Append-heavy writes (millions of points/second).
- Queries are time-bounded (last hour, last 7 days).
- Downsampling: high-resolution recent data, aggregated historical.
- Automatic data expiration (retention policies).

### TimescaleDB

PostgreSQL extension. Hypertables partition by time automatically. Full SQL support.

- Chunk size: 1-7 days depending on ingest rate.
- Continuous aggregates: materialized views that auto-refresh.
- Compression: 90-95% storage reduction for older data.
- Scale: 1M+ rows/second ingest on single node.

### InfluxDB

Purpose-built. Line protocol for ingest. Flux query language (or InfluxQL).

- Tags: indexed metadata (host, region). Low cardinality only.
- Fields: actual measurements (cpu_usage, temperature). Not indexed.
- High cardinality trap: unique tag values >100K kills performance.

### When to use

Metrics, IoT sensor data, financial ticks, event logs where time is the primary query dimension. NOT for general-purpose data with complex relationships.

## Wide-Column Stores (Cassandra, ScyllaDB, HBase)

### Data model

- Partition key: determines which node stores the row. Must distribute evenly.
- Clustering columns: determine sort order within a partition.
- Each query MUST include the full partition key. No cross-partition queries without scatter-gather.

### Modeling rules

1. Model from queries backward (not from entities).
2. One table per query pattern. Denormalization is expected.
3. Keep partitions under 100MB (Cassandra) or 1GB (ScyllaDB).
4. Avoid tombstone accumulation  --  deletes create invisible markers that slow reads.

### When to use

Write-heavy workloads (100K+ writes/sec), multi-region replication, time-series at scale (IoT, logging), use cases tolerating eventual consistency.

### When NOT to use

Ad-hoc queries, complex joins, strong consistency requirements, small datasets (<100GB).

### ScyllaDB vs Cassandra

ScyllaDB: C++ rewrite, shard-per-core architecture. 3-10x throughput at same hardware. Wire-compatible with Cassandra. Predictable p99 latency (no JVM GC pauses).

## Key-Value Stores (Redis, Memcached, DynamoDB)

### Access pattern

Single key lookup. O(1) read/write. No queries beyond "get by key."

### Redis beyond caching

- Data structures: sorted sets (leaderboards), streams (event log), HyperLogLog (cardinality estimation), Bitmaps (feature flags).
- Lua scripting: atomic multi-step operations.
- Pub/Sub: simple event distribution (not durable  --  use Kafka for durability).
- Cluster mode: hash slots distributed across nodes. Max ~1000 nodes.

### DynamoDB

- Partition key + optional sort key. Single-table design popular but complex.
- On-demand: pay per request. Provisioned: reserve RCU/WCU for predictable costs.
- GSI: eventually consistent secondary access patterns. LSI: strongly consistent alternate sort.
- DAX: in-memory cache layer. Microsecond reads.
- Scale: effectively unlimited throughput if partition key distributes well.

## Polyglot Persistence

Use multiple databases, each optimized for its access pattern.

| Access pattern | Best fit | Example |
|----------------|----------|---------|
| User profiles + auth | Relational (PostgreSQL) | ACID transactions for account state |
| Product catalog | Document (MongoDB) | Flexible schema, nested attributes |
| Session store | Key-value (Redis) | Fast expiring lookups |
| Social graph | Graph (Neo4j) | Relationship traversals |
| Metrics | Time-series (TimescaleDB) | Time-bounded aggregations |
| Search | Inverted index (Elasticsearch) | Full-text, faceted search |
| Event log | Append log (Kafka) | Ordered, replayable stream |

### Operational cost

Each database is another system to monitor, backup, patch, and on-call for. Don't adopt polyglot just because you can. Start with PostgreSQL (handles 80% of use cases) and add specialized stores when PostgreSQL becomes the bottleneck for a specific pattern.

## Schema Evolution Strategies

### Relational

- Additive migrations (ADD COLUMN, ADD TABLE) are safe.
- Destructive migrations (DROP, RENAME, ALTER TYPE) need expand-contract:
  1. Add new column. Deploy code that writes to both.
  2. Backfill old data.
  3. Switch reads to new column.
  4. Remove old column.
- Tools: Flyway, Liquibase, golang-migrate, Alembic.

### Document stores

- Schema-on-read: documents can have different shapes simultaneously.
- Version field: `schemaVersion: 2`. Application handles all versions or migrates lazily.
- Background migrations: sweep old documents, transform to new shape.

### Event stores / Kafka

- Schema registry (Confluent): enforce backward/forward compatibility.
- Avro: schema evolution with field defaults. Add fields freely, remove with care.
- Protobuf: reserved field numbers prevent reuse. Never reuse a field number.

### Anti-patterns

- Big-bang migrations with downtime (unacceptable at scale).
- Optional fields without defaults (breaks deserialization).
- Removing fields without a deprecation period.
- Coupling schema changes to application deploys (decouple with feature flags).

## Modeling for Access Patterns

### The process

1. List all queries the application will make.
2. For each query: identify keys, filters, sort order, expected cardinality.
3. Choose a data model that serves the most critical queries with single lookups.
4. Accept trade-offs for secondary queries (materialized views, denormalization, caching).

### Common mistakes

- Modeling entities before understanding queries (leads to expensive joins or scatter-gather).
- Over-normalizing in a NoSQL database (forces application-level joins).
- Under-estimating cardinality growth (partition key choice matters at year-3 scale, not day-1).
- Ignoring write amplification from maintaining multiple views of the same data.
