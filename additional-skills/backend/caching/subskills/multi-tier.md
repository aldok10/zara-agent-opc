---
type: subskill
title: "Multi-Tier Caching"
---

# Multi-Tier Caching

L1/L2/L3 cache design. Promotion, demotion, consistency between tiers, local cache integration.

## Rules

1. L1 = in-process (ns-us latency, limited size) -- use for ultra-hot keys, config, metadata
2. L2 = shared remote cache (Redis, low-ms) -- primary cache layer for most data
3. L3 = origin database or upstream API (ms-seconds) -- source of truth
4. L1 must be bounded -- LRU/LFU eviction with max entry count (1000-10000 items typical)
5. L1 TTL << L2 TTL -- local cache stale window must be short (5-30 seconds typical)
6. Invalidation propagates from source outward: DB -> L2 -> L1 (pub/sub broadcast to all instances)
7. Never promote to L1 without TTL -- process memory is non-recoverable without restart
8. L1 serialization: avoid if same-process (store native objects) -- eliminates ser/deser overhead
9. Size-tier: large objects in L2 only (Redis), small hot objects in L1 (in-process)
10. Measure per-tier hit rate independently -- low L1 hit rate means wrong data promoted or TTL too short

## Architecture

```
Request
  │
  ├─ L1: In-Process Cache (Caffeine, go-cache, lru-cache)
  │   ├─ Hit → return (ns latency)
  │   └─ Miss ↓
  │
  ├─ L2: Shared Cache (Redis/Memcached)
  │   ├─ Hit → promote to L1, return (1-5ms)
  │   └─ Miss ↓
  │
  ├─ L3: Origin (Database / API)
  │   └─ Fetch → write to L2, promote to L1, return (10-100ms)
  │
  └─ Response
```

## Promotion/Demotion Rules

| Event | Action |
|-------|--------|
| L2 hit | Promote to L1 with short TTL |
| L3 fetch | Write to L2 (normal TTL), promote to L1 (short TTL) |
| L1 TTL expires | Evict from L1, L2 still valid |
| L2 TTL expires | Next access fetches from L3 |
| Write/invalidation | Delete L2, broadcast L1 eviction to all instances |
| L1 capacity full | LRU/LFU eviction, no L2 impact |

## Consistency Between Tiers

### Pub/Sub Broadcast (Redis)
```
-- On write:
1. Update DB
2. Delete L2 key in Redis
3. PUBLISH "cache:invalidate" "user:123"

-- All app instances subscribe:
on message "cache:invalidate":
    l1_cache.delete(key)
```

### Polling (Simpler, Higher Staleness)
```
-- Each instance polls version counter every N seconds
-- If version changed, flush relevant L1 entries
-- Acceptable for config/feature flags (staleness window = poll interval)
```

### Client-Side Caching (Redis 6+ RESP3)
```
-- Redis tracks which keys each client has cached
-- On key change, Redis pushes invalidation to tracking clients
-- Best for read-heavy, small key sets (<10K tracked keys per client)
```

## L1 Implementation Guidance

| Language | Library | Notes |
|----------|---------|-------|
| Go | `go-cache`, `ristretto`, `bigcache` | ristretto for admission policy (TinyLFU) |
| Java | Caffeine | Best-in-class LFU, async refresh |
| Node.js | `lru-cache`, `node-cache` | lru-cache v10+ supports TTL, fetchMethod |
| Python | `cachetools`, `diskcache` | cachetools for in-memory, diskcache for persistence |

## Anti-Patterns

- L1 without size bound (memory leak, eventual OOM)
- L1 TTL = L2 TTL (defeats purpose: L1 should be shorter for consistency)
- No invalidation broadcast (each instance sees different stale data)
- Promoting everything to L1 (low hit rate, wasted memory -- only promote hot keys)
- Skipping L2 on write (write to L1 + DB but not L2 -- other instances get stale L2 data)
- Using L1 for large objects (serialization cost + memory pressure, better in L2 only)

## Sizing Guide

| Tier | Size | TTL | Typical Content |
|------|------|-----|-----------------|
| L1 | 1K-10K entries | 5-30s | Config, hot entity IDs, session flags |
| L2 | 1-100GB | 5min-24h | Serialized entities, query results, HTML fragments |
| L3 | Unbounded | Source of truth | Database, upstream API |

## Verification

- [ ] L1 has max size configured (verify with metrics showing evictions)
- [ ] L1 TTL < L2 TTL (code review)
- [ ] Invalidation broadcast works across instances (kill cache in one, verify others update)
- [ ] Per-tier hit rates tracked independently in metrics
- [ ] L1 memory usage bounded (monitor process RSS)
- [ ] Cold start tested (all tiers empty, system functions correctly)
- [ ] Graceful degradation: L2 failure falls through to L3 (circuit breaker active)
