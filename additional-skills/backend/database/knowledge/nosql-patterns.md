# NoSQL Patterns

Document embedding vs referencing, wide-column design, and key-value access patterns.

## Document Databases (MongoDB, Firestore, CouchDB)

### Embedding vs Referencing

| Criteria | Embed | Reference |
|----------|-------|-----------|
| Relationship | 1:1, 1:few | 1:many (unbounded), many:many |
| Read pattern | Always together | Independent access |
| Update pattern | Atomic with parent | Independent lifecycle |
| Growth | Bounded (<100 items) | Unbounded |
| Size | Combined <16MB | Large sub-documents |
| Consistency | Always consistent | Eventually consistent |

### Common Document Patterns

**Bucket Pattern** (time-series, IoT)
```json
{
  "sensorId": "temp-001",
  "date": "2026-01-15",
  "readings": [
    { "t": "08:00", "v": 22.1 },
    { "t": "08:05", "v": 22.3 }
  ],
  "count": 2,
  "sum": 44.4
}
```
- Pre-aggregated statistics in document
- Bounded array (e.g., 1 doc per hour/day)
- Reduces document count by 100-1000x

**Polymorphic Pattern** (different entity types in one collection)
```json
{ "type": "blog_post", "title": "...", "body": "...", "tags": [...] }
{ "type": "video", "title": "...", "url": "...", "duration": 120 }
{ "type": "podcast", "title": "...", "episodes": [...] }
```
- Single collection with type discriminator
- Shared indexes on common fields
- Type-specific validation with JSON Schema

**Computed Pattern** (avoid expensive queries)
```json
{
  "productId": "SKU-123",
  "reviews": { "count": 42, "avgRating": 4.3, "distribution": [2,3,5,12,20] }
}
```
- Update counters on write (fan-out-on-write)
- Trade write cost for read speed
- Accept slight inconsistency or use change streams to maintain

## Wide-Column (Cassandra, ScyllaDB, Bigtable)

### Data Model Principles
1. Query-first design: one table per query pattern
2. Partition key determines data locality; all data in one partition = one read
3. Clustering columns determine sort order within partition
4. Denormalization is expected; disk is cheap, joins don't exist

### Example: User Activity Feed
```cql
CREATE TABLE user_activity (
    user_id UUID,
    activity_time TIMESTAMP,
    activity_type TEXT,
    details TEXT,
    PRIMARY KEY (user_id, activity_time)
) WITH CLUSTERING ORDER BY (activity_time DESC);

-- Query: recent activity for a user (single partition read)
SELECT * FROM user_activity WHERE user_id = ? LIMIT 20;
```

### Partition Sizing
- Target: 10MB - 100MB per partition
- Too large: hot spots, slow reads, GC pressure
- Too small: many partitions, tombstone overhead
- Add time bucket for unbounded growth: `PRIMARY KEY ((user_id, month), activity_time)`

## Key-Value (Redis, DynamoDB, Memcached)

### Access Pattern Design
```
Pattern: Get user profile
  Key: user:{id}:profile
  Value: serialized object

Pattern: Rate limiting
  Key: rate:{endpoint}:{user_id}:{minute}
  Value: counter (INCR, EXPIRE)

Pattern: Session
  Key: session:{token}
  Value: serialized session data
  TTL: 24h

Pattern: Cache with tags (invalidation)
  Key: cache:{entity}:{id}:{version}
  Value: computed result
  Invalidate: bump version counter
```

### Key Design Rules
1. Hierarchical naming: `{service}:{entity}:{id}:{attribute}`
2. Include version/shard for cache busting: `user:123:profile:v3`
3. Avoid sequential IDs in keys for distributed KV (hot partition)
4. Keep keys short but readable; every byte multiplied by millions of keys

## Graph Patterns (Neo4j, Neptune, ArangoDB)

### When to Use Graph
- Relationship traversal >2 hops (friends-of-friends, recommendations)
- Variable-depth paths (org hierarchies, dependency trees)
- Pattern matching in connected data (fraud detection, social networks)

### When NOT to Use Graph
- Simple CRUD with 1-hop relationships (use relational)
- High-volume writes with simple reads (use document/KV)
- Analytics/aggregation (use columnar/OLAP)

## Choosing the Right NoSQL Type

| Need | Type | Example |
|------|------|---------|
| Flexible schema, nested data | Document | MongoDB, Firestore |
| Time-series, append-heavy, known queries | Wide-column | Cassandra, ScyllaDB |
| Sub-millisecond lookup by key | Key-value | Redis, DynamoDB |
| Deep relationship traversal | Graph | Neo4j, Neptune |
| Full-text search + analytics | Search engine | Elasticsearch, Meilisearch |
| Embedding similarity | Vector | pgvector, Pinecone, Qdrant |
