---
type: subskill
title: "Invalidation Strategies"
---

# Invalidation Strategies

Cache invalidation patterns. Event-driven, tag-based, versioned keys, write-through, write-behind.

## Rules

1. Default to versioned keys over explicit deletion -- `user:v3:123` avoids race conditions entirely
2. Event-driven invalidation via message bus -- decouple writer from cache layer
3. Tag-based invalidation for related entities -- tag `product:456` to all cache entries that reference it
4. Write-through for read-after-write consistency -- cache is always fresh after mutation
5. Write-behind (write-back) only with durable queue -- async write to DB must not lose data
6. Never invalidate synchronously in the write path if latency matters -- publish event, invalidate async
7. Invalidation must be idempotent -- same event processed twice should not corrupt state
8. Batch invalidation with jittered TTLs -- avoid thundering herd when bulk-invalidating related keys
9. Track invalidation latency as SLI -- stale data window = time between write and cache update
10. Use compare-and-swap (CAS) when updating cache -- prevent older write overwriting newer value

## Patterns

### Versioned Keys (Safest)
```
-- App maintains version counter in Redis or DB
version = GET entity:version:user:123   -- returns "7"
cache_key = "user:v7:123"
-- On write: INCR entity:version:user:123 -> "8"
-- Old key "user:v7:123" naturally expires via TTL
-- No explicit delete needed, no race condition
```

### Event-Driven Invalidation
```
-- Writer publishes event (Kafka/SNS/Redis Streams)
Event: { type: "user.updated", id: 123, timestamp: ... }

-- Cache invalidation consumer:
1. Receive event
2. DEL user:*:123 (or increment version)
3. Optionally: pre-warm cache with fresh data
```

### Tag-Based Invalidation
```
-- When caching product page, tag with all entities:
SET page:product:456 <html> EX 3600
SADD tag:product:456 "page:product:456" "api:product:456" "feed:latest"
SADD tag:brand:acme "page:product:456" "page:brand:acme"

-- On product update:
members = SMEMBERS tag:product:456
DEL ...members
DEL tag:product:456
```

### Write-Through
```
func UpdateUser(ctx, user):
    tx = db.Begin()
    tx.Update(user)
    cache.Set("user:" + user.ID, user, TTL)  // cache updated IN transaction
    tx.Commit()
    // If tx fails, cache entry is wrong -- use cache.Delete on rollback
```

### Write-Behind (Async Persistence)
```
func UpdateUser(ctx, user):
    cache.Set("user:" + user.ID, user, TTL)  // fast: write to cache
    queue.Publish("db.write", user)           // durable queue -> DB writer
    // Risk: queue failure = data loss. Mitigate with WAL or dual-write.
```

## Decision Matrix

| Requirement | Strategy |
|-------------|----------|
| Zero stale reads after write | Write-through |
| Minimal write latency | Write-behind + queue |
| Multi-service invalidation | Event-driven (pub/sub or stream) |
| Related entity invalidation | Tag-based sets |
| Deploy without cache flush | Versioned keys |
| High write volume, eventual consistency OK | TTL-based expiry only |
| Strong consistency across replicas | Write-through + pub/sub invalidation |

## Anti-Patterns

- Delete-then-write race: Thread A deletes cache, Thread B reads miss, Thread B writes stale, Thread A writes DB -- cache now permanently stale until TTL
- Synchronous invalidation of 1000s of keys in write path -- adds seconds to response
- Invalidating without TTL fallback -- if invalidation message is lost, data is stale forever
- Using KEYS pattern match for invalidation -- O(N) scan blocks Redis
- Write-behind without idempotent writes -- retries create duplicates

## Consistency Levels

| Level | Implementation | Stale Window |
|-------|---------------|--------------|
| Strong | Write-through + sync invalidation | 0 (at cost of latency) |
| Bounded staleness | Event-driven + short TTL fallback | Seconds (event propagation) |
| Eventual | TTL-based expiry only | TTL duration |
| Best-effort | Pub/sub invalidation (no persistence) | Seconds (if no message loss) |

## Verification

- [ ] No race condition in write+invalidate path (test concurrent writes)
- [ ] Invalidation is idempotent (replay same event, no corruption)
- [ ] TTL acts as safety net even with active invalidation
- [ ] Stale data window measured and within SLA
- [ ] Failed invalidation triggers alert (dead letter queue monitoring)
- [ ] Write-behind queue has persistence and retry with backoff
