# Redis

Beyond caching: data structures, Lua scripting, cluster mode, persistence, Streams, and modules.

> Note: Redis is source-available (RSALv2/SSPLv1) since March 2024. Valkey is the Linux Foundation BSD-licensed fork. Patterns below apply to both.

## When to Use

- Caching strategy (TTL, invalidation, stampede prevention)
- Real-time features (leaderboards, rate limiting, pub/sub)
- Redis Streams for event processing
- Cluster topology and slot management
- Persistence decisions (RDB vs AOF vs none)
- Distributed locking and coordination

## Rules

1. Redis command execution is single-threaded per shard (I/O is multi-threaded since 6.0); O(N) commands on large keys block everything. Never `KEYS *`, `SMEMBERS` on large sets, or `HGETALL` on huge hashes in production.
2. Use `SCAN` family (SSCAN, HSCAN, ZSCAN) for iteration; never full-key enumeration.
3. Key naming: `{service}:{entity}:{id}:{field}` with consistent separator. Use `{}` hash tags for cluster slot co-location.
4. TTL on every cache key; no TTL = memory leak. Use `EXPIREAT` for absolute deadlines.
5. Distributed locks: single-instance `SET NX PX` with fencing tokens for most cases; Redlock for multi-node setups (note: Redlock is controversial — Martin Kleppmann's analysis shows it can fail under clock skew/GC pauses; for correctness-critical coordination prefer etcd or ZooKeeper). Never plain `SETNX`.
6. Lua scripts are atomic but block the event loop; keep them under 5ms execution time.
7. Pipeline commands when possible (10x throughput vs sequential round-trips).
8. Redis Streams consumer groups must handle `XACK`; unacknowledged messages are redelivered and cause duplicates.
9. Max memory policy must be set explicitly: `allkeys-lru` for cache, `noeviction` for data store.
10. Cluster mode: 16384 hash slots, minimum 3 masters + 3 replicas. Cross-slot operations (`MGET` across slots) fail silently or error.

## Data Structure Selection

| Need | Structure | Example |
|------|-----------|---------|
| Cache | STRING with TTL | `SET user:123:profile "{...}" EX 3600` |
| Counter | STRING + INCR | `INCR api:rate:user:123` |
| Unique items | SET | `SADD online:users user:123` |
| Ranked data | SORTED SET | `ZADD leaderboard 1500 user:123` |
| Object fields | HASH | `HSET user:123 name "Alice" email "a@b.c"` |
| Queue | LIST (LPUSH/BRPOP) | Simple job queue |
| Event log | STREAM | `XADD events * type order.created ...` |
| Bitmap flags | BITMAP | `SETBIT feature:flags:user:123 0 1` |

## Patterns

### Cache-Aside with Stampede Prevention
```python
def get_user(user_id):
    cached = redis.get(f"user:{user_id}")
    if cached:
        return deserialize(cached)
    
    # Lock to prevent thundering herd
    lock_key = f"lock:user:{user_id}"
    if redis.set(lock_key, "1", nx=True, px=5000):
        user = db.query_user(user_id)
        redis.set(f"user:{user_id}", serialize(user), ex=3600)
        redis.delete(lock_key)
        return user
    
    # Another process is loading; wait and retry
    time.sleep(0.05)
    return get_user(user_id)
```

### Rate Limiter (Sliding Window)
```lua
-- KEYS[1] = rate limit key, ARGV[1] = window (ms), ARGV[2] = max requests, ARGV[3] = now (ms)
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now .. math.random())
    redis.call('PEXPIRE', key, window)
    return 1
end
return 0
```

### Stream Consumer Group
```
XGROUP CREATE events mygroup $ MKSTREAM
XREADGROUP GROUP mygroup consumer1 COUNT 10 BLOCK 2000 STREAMS events >
-- Process messages...
XACK events mygroup <message-id>
```

## Anti-Patterns

- Using Redis as primary data store without persistence AND replication
- `DEL` on large keys (blocks); use `UNLINK` for async deletion
- Storing >1MB values (network latency, fragmentation)
- Pub/Sub for reliable messaging (fire-and-forget, no persistence); use Streams instead
- Hot keys without sharding strategy (single key = single thread bottleneck)

## Verification

- `INFO memory` for usage and fragmentation ratio (should be <1.5)
- `SLOWLOG GET 10` for commands exceeding threshold
- `CLIENT LIST` for connection count and state
- `MEMORY USAGE <key>` to check individual key sizes
- Monitor evictions: `INFO stats` -> `evicted_keys` should be 0 for data stores
- Cluster: `CLUSTER INFO`, `CLUSTER NODES` for health and slot coverage
