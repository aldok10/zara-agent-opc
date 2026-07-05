---
name: caching
description: "Caching: Redis, multi-tier, invalidation, stampede prevention, CDN"
---

# Caching Expert

Production caching systems. Redis-primary, multi-tier strategies, invalidation patterns, stampede prevention, CDN/edge caching. Design for correctness first, then performance.

## Scope

Cache architecture, implementation, and operations. Redis data structures and patterns. CDN/edge caching strategies. Multi-tier cache design (L1/L2/L3). Invalidation and consistency. Stampede prevention. Distributed cache topology. Performance tuning and monitoring.

## First Action

When loaded: identify the caching problem type (performance, consistency, invalidation, scaling) and route to the appropriate subskill. If unclear, ask: "What's the read/write ratio and consistency requirement?"

## Constraints

1. TTL on EVERY key -- no immortal cache entries, even "permanent" data gets 24h+ TTL with refresh
2. Namespace keys as `{service}:{entity}:{version}:{id}` -- enables bulk invalidation and versioned deploys
3. Cache-aside as default pattern unless write-read latency requires write-through
4. Stampede protection on all hot keys -- probabilistic early expiry (XFetch) or mutex lock
5. Circuit breaker between app and cache layer -- degrade to DB, never 500 because Redis is down
6. Serialize with schema version prefix -- `v2:` prefix allows rolling deploys without cache flush
7. Max value size 512KB recommended per value (Redis hard limit is 512MB); compress or split larger objects
8. Monitor: hit rate >90% for read-heavy hot-key workloads; establish per-service baselines (write-heavy or long-tail access patterns may run 60-80%). p99 latency <5ms, eviction rate near-zero under normal load
9. Connection pooling mandatory -- min 5, max = (expected_concurrency / instances), idle timeout < server timeout
10. No `KEYS *` or `SCAN` in hot path -- use sets/sorted sets for membership tracking
11. Separate Redis instances for cache vs. persistent data (queues, sessions, locks)
12. Test cache-miss path under load -- simulate Redis failure in staging before production
13. Use RESP3 protocol and client-side caching (Redis 6+) for ultra-hot keys with tracking invalidation
14. Compression for values >1KB -- zstd or lz4, benchmark to confirm net gain with serialization overhead
15. Log cache operations at DEBUG level with key (not value) -- enables hit/miss analysis without leaking data

## DO NOT

1. Cache without TTL (memory leak, stale data forever)
2. Store secrets or PII in unencrypted cache entries
3. Assume cache is always available -- design and test the miss/failure path
4. Cache negative results without short TTL (masks data appearing, typically 30s-60s max)
5. Use Redis as primary data store without persistence + replication
6. Invalidate by deleting individual keys when you can version (cheaper, no race conditions)
7. Mix cache eviction policies (allkeys-lru) with persistent data in same instance
8. Set identical TTLs on bulk-loaded keys (causes thundering herd on expiry)
9. Trust cache-aside alone for data written and immediately read (use write-through)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Redis data structures, Lua, pub/sub | `subskills/redis-patterns.md` | Redis-specific implementation |
| CDN, edge, HTTP headers, purging | `subskills/cdn-caching.md` | CDN/edge layer |
| Invalidation, consistency, stale data | `subskills/invalidation-strategies.md` | Cache invalidation |
| L1/L2/L3, local cache, tiering | `subskills/multi-tier.md` | Multi-tier architecture |
| Cluster, sharding, replication | `subskills/distributed-cache.md` | Distributed topology |

## Verification

- [ ] All keys have TTL set (scan sample with `TTL` command)
- [ ] Hit rate >90% verified via `INFO stats` (keyspace_hits / (hits + misses))
- [ ] No `KEYS` command in codebase (`grep -r "KEYS" --include="*.go" --include="*.ts"`)
- [ ] Graceful degradation tested (kill Redis, verify app serves from DB)
- [ ] Stampede protection on hot keys (load test with cold cache)
- [ ] Connection pool sized correctly (no pool exhaustion under peak)
- [ ] Memory usage stable under load (no unbounded growth)
- [ ] Latency p99 <5ms at production traffic levels

## Knowledge

- `knowledge/redis-data-structures.md` -- when to use each Redis type
- `knowledge/cache-patterns.md` -- cache-aside, read/write-through, refresh-ahead
- `knowledge/stampede-prevention.md` -- XFetch, locking, coalescing
- `knowledge/cdn-headers.md` -- Cache-Control, Vary, ETag, stale-while-revalidate
- `knowledge/redis-cluster.md` -- topology, hash slots, failover, client routing

## AI-Era Context (2026)

- Redis is source-available (RSALv2/SSPL) since March 2024. Valkey (Linux Foundation fork) is the fully open-source alternative. KeyDB and Dragonfly are other options.
- Redis 8 with enhanced multi-threading for I/O -- connection pooling still matters but throughput per instance is higher
- Dragonfly/KeyDB as Redis-compatible alternatives for write-heavy workloads (multi-threaded by design)
- Edge compute (Cloudflare Workers, Vercel Edge) enables L0 cache tier -- sub-ms for personalized content
- AI inference results are prime cache candidates -- high compute cost, often deterministic for same input
- Vector similarity cache: cache embedding lookups with approximate TTL based on corpus freshness
- Client-side caching (RESP3 tracking) reduces network round-trips for ultra-hot keys
- Tiered storage in Redis Enterprise: flash-backed for warm data, RAM for hot data
- For simple key-value workloads without advanced data structures, Memcached remains a simpler/lighter alternative (multi-threaded, no persistence overhead)

## Related Skills

- `backend/database` -- cache-aside requires understanding query patterns
- `backend/message-queue` -- write-behind uses async messaging
- `infrastructure/observability` -- cache metrics, hit rate dashboards
- `security-engineering` -- encrypting cached PII, access control
