# References

## Redis Core (8 refs)

- **Redis Documentation** -- https://redis.io/docs/ -- Complete Redis reference
- **Redis Commands** -- https://redis.io/commands/ -- Full command reference with complexity
- **Redis Data Types** -- https://redis.io/docs/data-types/ -- Strings, hashes, lists, sets, sorted sets, streams
- **Redis Cluster** -- https://redis.io/docs/management/scaling/ -- Horizontal scaling and sharding
- **Redis Sentinel** -- https://redis.io/docs/management/sentinel/ -- High availability and monitoring
- **Redis Persistence** -- https://redis.io/docs/management/persistence/ -- RDB and AOF options
- **Redis Pub/Sub** -- https://redis.io/docs/interact/pubsub/ -- Messaging pattern
- **Redis Streams** -- https://redis.io/docs/data-types/streams/ -- Append-only log data structure

## Caching Patterns (7 refs)

- **Cache-Aside Pattern** -- https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside -- On-demand cache population
- **Write-Through vs Write-Behind** -- https://hazelcast.com/blog/a-hitchhikers-guide-to-caching-patterns/ -- Cache write strategies compared
- **Cache Invalidation** -- https://www.mnot.net/cache_docs/ -- HTTP caching and invalidation strategies
- **Facebook Memcache Paper** -- https://research.facebook.com/publications/scaling-memcache-at-facebook/ -- Lessons from planet-scale caching
- **Caching Best Practices** -- https://aws.amazon.com/caching/best-practices/ -- AWS caching architecture guidance
- **Two-Tier Caching** -- https://redis.io/docs/manual/client-side-caching/ -- Client-side + server-side caching
- **Cache Warming** -- https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/cache-warming.html -- Pre-population strategies

## CDN & HTTP Caching (6 refs)

- **HTTP Caching (RFC 9111)** -- https://www.rfc-editor.org/rfc/rfc9111 -- Cache semantics standard
- **Cache-Control Header** -- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control -- Directive reference
- **Cloudflare Caching** -- https://developers.cloudflare.com/cache/ -- CDN caching configuration
- **Fastly Caching Guide** -- https://www.fastly.com/documentation/guides/concepts/edge-state/cache/ -- Edge caching concepts
- **Varnish Documentation** -- https://varnish-cache.org/docs/ -- HTTP accelerator reference
- **Surrogate Keys** -- https://www.fastly.com/documentation/guides/concepts/edge-state/cache/purging/surrogate-keys/ -- Tag-based cache invalidation

## Stampede Prevention (5 refs)

- **Cache Stampede** -- https://en.wikipedia.org/wiki/Cache_stampede -- Problem definition and solutions
- **Probabilistic Early Expiration** -- https://cseweb.ucsd.edu/~avattani/papers/cache_stampede.pdf -- XFetch algorithm paper
- **Locking Strategies** -- https://redis.io/docs/manual/patterns/distributed-locks/ -- Redis distributed locks (Redlock)
- **Stale-While-Revalidate** -- https://web.dev/stale-while-revalidate/ -- Background refresh pattern
- **Request Coalescing** -- https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_lock -- NGINX cache lock

## Redis Alternatives & Extensions (5 refs)

- **Dragonfly** -- https://www.dragonflydb.io/docs -- Redis-compatible in-memory store
- **Valkey** -- https://valkey.io/docs/ -- Open-source Redis fork
- **KeyDB** -- https://docs.keydb.dev/ -- Multi-threaded Redis fork
- **Redis Stack** -- https://redis.io/docs/about/about-stack/ -- JSON, search, graph, time-series modules
- **Memcached** -- https://memcached.org/ -- Distributed memory object caching

## Application-Level Caching (5 refs)

- **Caffeine (Java)** -- https://github.com/ben-manes/caffeine/wiki -- High-performance local cache
- **dogpile.cache (Python)** -- https://dogpilecache.sqlalchemy.org/ -- Caching with dogpile lock
- **ristretto (Go)** -- https://github.com/dgraph-io/ristretto -- Concurrent cache with admission policy
- **Node.js lru-cache** -- https://github.com/isaacs/node-lru-cache -- LRU cache for Node applications
- **Cachex (Elixir)** -- https://hexdocs.pm/cachex/Cachex.html -- Feature-rich caching library

## Monitoring & Operations (4 refs)

- **Redis INFO** -- https://redis.io/commands/info/ -- Server statistics and monitoring
- **Redis Slowlog** -- https://redis.io/commands/slowlog-get/ -- Slow query detection
- **Redis Memory Analysis** -- https://redis.io/commands/memory-usage/ -- Memory profiling commands
- **Redis Latency Monitoring** -- https://redis.io/docs/management/optimization/latency-monitor/ -- Latency diagnostics

## Architecture Decisions (5 refs)

- **When to Cache** -- https://aws.amazon.com/caching/best-practices/ -- Decision framework for caching layers
- **Cache Eviction Policies** -- https://redis.io/docs/reference/eviction/ -- LRU, LFU, TTL strategies
- **Session Storage** -- https://redis.io/docs/manual/patterns/ -- Redis as session store
- **Rate Limiting with Redis** -- https://redis.io/commands/incr/#pattern-rate-limiter -- Token bucket in Redis
- **Distributed Caching Patterns** -- https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching -- Microsoft architecture guidance
