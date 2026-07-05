# MongoDB

Schema design by access pattern, aggregation pipeline mastery, sharding strategy, and change streams.

## When to Use

- Document modeling decisions (embed vs reference)
- Aggregation pipeline design and optimization
- Sharding key selection and cluster management
- Change streams for event-driven architectures
- Index strategy for document databases
- Atlas-specific features (search, vector, serverless)

## Rules

1. Schema follows access patterns, not entity relationships. Design for queries, not normalization.
2. Embed when: data is read together, 1:few relationship, bounded growth. Reference when: unbounded growth, many:many, independent access.
3. Every query must be covered by an index; use `.explain("executionStats")` to verify `IXSCAN` not `COLLSCAN`.
4. Compound index field order: equality fields first, sort fields second, range fields last (ESR rule).
5. Shard key must have high cardinality, low monotonicity, and match query patterns. Never shard by `_id` (ObjectId is monotonic).
6. `$lookup` is a JOIN and kills performance at scale; denormalize or use materialized views instead.
7. Array fields in indexes create multikey indexes; never compound two array fields (Cartesian explosion).
8. Use `$merge` or `$out` for materialized aggregations; schedule via Atlas Triggers or cron.
9. Schema validation (`$jsonSchema`) must exist for critical collections to prevent garbage data.
10. Change streams require resume tokens stored externally; never assume stream continuity across restarts.

## Patterns

### Embed vs Reference Decision
```
Embed:                          Reference:
- Address in User              - Comments on popular Post
- Line items in Order          - Products in Category
- Bounded array (<100)         - Unbounded growth
- Always read together         - Independent lifecycle
```

### Aggregation Pipeline
```javascript
// Efficient: filter early, project only needed fields
db.orders.aggregate([
  { $match: { status: "completed", createdAt: { $gte: ISODate("2026-01-01") } } },
  { $project: { customerId: 1, total: 1, items: { $size: "$lineItems" } } },
  { $group: { _id: "$customerId", totalSpent: { $sum: "$total" }, orderCount: { $sum: 1 } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 100 }
]);
```

### Change Stream with Resume
```javascript
const pipeline = [{ $match: { operationType: { $in: ["insert", "update"] } } }];
const options = { resumeAfter: loadResumeToken(), fullDocument: "updateLookup" };
const stream = collection.watch(pipeline, options);

stream.on("change", async (event) => {
  await processEvent(event);
  await saveResumeToken(event._id);
});
```

### Shard Key Selection
```javascript
// Good: hashed compound for even distribution + query routing
sh.shardCollection("db.events", { tenantId: 1, _id: "hashed" });

// Bad: monotonic ObjectId (hot shard on latest chunk)
sh.shardCollection("db.events", { _id: 1 }); // DON'T
```

## Anti-Patterns

- Unbounded arrays that grow forever (comments, logs) -- use bucket pattern or reference
- `$unwind` on large arrays without prior `$match` filtering
- Reading entire documents when only 2 fields needed (no projection)
- Using `findAndModify` in loops instead of bulk operations
- Storing time-series in regular collections instead of time-series collections (MongoDB 5.0+)
- `$regex` queries without anchored prefix (`^`) cannot use indexes

## Verification

- `.explain("executionStats")` must show: `IXSCAN`, `nReturned` close to `totalDocsExamined`
- Check `db.currentOp()` for slow operations in production
- Monitor `wiredTiger` cache usage and eviction rates
- Verify shard balance with `sh.status()` and chunk distribution
- Test aggregation pipelines with `{ $planCacheStats: {} }` for plan stability
