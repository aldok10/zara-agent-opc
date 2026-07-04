# Caching: Patterns & Strategies

Deep-dive reference for adding caching without shooting yourself in the foot.

## Caching Patterns

- **Cache-aside (lazy loading)** — most common. App checks cache; on miss, reads DB and populates cache. Only requested data is cached. Stale risk on updates → pair with invalidation. App owns cache logic.
- **Write-through**: write to cache AND DB synchronously. Cache always fresh; writes slower. Good when reads dominate and staleness is unacceptable.
- **Write-behind (write-back)**: write to cache, async flush to DB. Fast writes, absorbs bursts, but **risk of data loss** if cache dies before flush. Use for high write volume tolerant of small loss.
- **Read-through**: cache library fetches from DB on miss (not the app). Simpler app code, cache is the abstraction. Needs cache that supports it.

## Invalidation Strategies

"Cache invalidation is one of the two hard problems." When in doubt: **short TTL + event-based invalidation.**

- **TTL**: simplest, eventual freshness. Pick TTL by tolerance for staleness.
- **Event-based**: invalidate/update on write. Most accurate, more plumbing (pub/sub, hooks).
- **Version keys**: embed version in key (`user:42:v7`). Bump version = instant logical invalidation, old entries expire naturally.
- **Cache-aside + short TTL**: pragmatic default — bounded staleness without event wiring.

## Multi-Layer Caching

- **L1 in-process** (local map, Caffeine): ~1μs. Tiny, per-instance, risks inconsistency across nodes.
- **L2 distributed** (Redis/Memcached): ~1ms. Shared, larger, network hop.
- **L3 CDN/edge**: geo-distributed, terminates close to user.

Check L1 → L2 → origin. Keep L1 TTL short to bound cross-node divergence.

## Cache Stampede (thundering herd)

When a hot key expires, many requests hit the DB at once.

- **Lock on miss**: first miss acquires a lock, rebuilds, others wait/serve stale.
- **Probabilistic early expiration**: recompute slightly before TTL, randomized, so not everyone expires together.
- **Pre-warming**: populate hot keys before traffic (deploys, scheduled jobs).

## Redis vs Memcached

- **Redis**: rich data structures (sorted sets, hashes, streams), persistence, pub/sub, Lua, replication. Default pick.
- **Memcached**: dead-simple, multi-threaded, pure volatile KV cache. Slight edge for raw string caching at scale; fewer features.

## CDN

- **Static assets**: always cache (images, JS, CSS) with long TTL + content hashing.
- **Dynamic**: short TTL + `stale-while-revalidate` (serve stale while refetching in background).
- **Edge compute** (Cloudflare Workers, Lambda@Edge): personalization/auth at the edge without origin hit.

## Numbers

- Redis single node: **100K–300K ops/sec**.
- Cache hit latency: **<1ms** (should be).
- CDN: reduces global latency to **<50ms**.
- Hit ratio target: >90% for it to matter; measure it.

## Anti-Patterns

- Caching without an invalidation strategy → stale data bugs.
- Long TTL on mutable data → users see old state.
- Cache as primary data store → data loss when cache evicts/dies. Cache is disposable.
- Caching per-user data with a shared key → data leaks across users.
