---
type: fact
title: "Cache Patterns"
---

# Cache Patterns

Core caching patterns: when to use each, tradeoffs, implementation notes.

## Cache-Aside (Lazy Loading)

```
read(key):
    value = cache.get(key)
    if value != nil:
        return value          // cache hit
    value = db.query(key)     // cache miss
    cache.set(key, value, TTL)
    return value
```

- Default pattern for most use cases
- App manages cache explicitly
- Pros: only caches what's actually read, simple failure mode (miss = DB query)
- Cons: first request always slow (cold miss), stale data until TTL expires
- Best for: read-heavy workloads, data that tolerates bounded staleness

## Read-Through

```
// Cache library handles miss logic internally
value = cache.get(key, loader=db.query)
// If miss: cache calls loader, stores result, returns
```

- Cache layer handles miss internally (app never sees "miss")
- Pros: simpler app code, consistent loading logic
- Cons: cache library must know about data source, harder to debug misses
- Best for: ORM-level caching, framework-integrated caching

## Write-Through

```
write(key, value):
    cache.set(key, value, TTL)   // update cache
    db.write(key, value)         // update DB
    // Both updated synchronously in write path
```

- Cache always has fresh data after write
- Pros: no stale reads after write, cache is always warm for written data
- Cons: higher write latency (cache + DB in series), writes go to cache even if never read
- Best for: read-after-write consistency requirement, user profile updates

## Write-Behind (Write-Back)

```
write(key, value):
    cache.set(key, value, TTL)   // update cache (fast return)
    queue.publish(key, value)    // async persist to DB

// Background worker:
worker.consume(queue):
    db.write(key, value)         // batch writes to DB
```

- Async DB persistence, very low write latency
- Pros: extremely fast writes, can batch DB operations
- Cons: data loss if cache and queue both fail, complex failure handling
- Best for: write-heavy workloads where eventual persistence is acceptable (analytics, counters)
- Requires: durable queue (Kafka, Redis Streams with persistence)

## Refresh-Ahead

```
read(key):
    value, ttl_remaining = cache.get_with_ttl(key)
    if ttl_remaining < threshold:
        async: refresh(key)    // background refresh before expiry
    return value               // always returns current cached value
```

- Proactively refreshes before expiry
- Pros: cache never goes cold for hot keys, consistent low latency
- Cons: wasted refreshes if key is not accessed again, complexity
- Best for: predictable access patterns, real-time dashboards, hot keys

## Pattern Comparison

| Pattern | Read Latency | Write Latency | Consistency | Complexity |
|---------|-------------|---------------|-------------|------------|
| Cache-aside | Miss = slow | N/A (no write caching) | Eventual (TTL) | Low |
| Read-through | Miss = slow (hidden) | N/A | Eventual (TTL) | Medium |
| Write-through | Always fast | Higher (cache + DB) | Strong after write | Medium |
| Write-behind | Always fast | Very low | Eventual (async) | High |
| Refresh-ahead | Always fast | N/A | Near-real-time | Medium |

## Combining Patterns

| Combination | Use Case |
|-------------|----------|
| Cache-aside + TTL | Default for most read workloads |
| Write-through + cache-aside | Read-after-write + lazy loading for other reads |
| Write-behind + refresh-ahead | High write AND read, eventual consistency OK |
| Cache-aside + event invalidation | Fresh data when source changes (pub/sub) |

## Implementation Notes

- Always set TTL even with active invalidation (safety net for missed events)
- Serialization format matters: JSON (debuggable) vs protobuf/msgpack (compact, fast)
- Add jitter to TTLs: `TTL + random(0, TTL*0.1)` prevents synchronized expiry
- Monitor: hit rate, miss rate, eviction rate, latency percentiles per operation
