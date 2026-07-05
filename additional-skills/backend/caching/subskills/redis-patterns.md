---
type: subskill
title: "Redis Patterns"
---

# Redis Patterns

Redis-specific implementation patterns. Data structures, Lua scripting, pub/sub, Streams, cluster mode.

> Note: Redis is source-available (RSALv2/SSPLv1) since March 2024. Valkey (Linux Foundation, BSD-licensed) is API-compatible. Patterns here apply to both.

## Rules

1. Choose data structure by access pattern, not data shape -- Sorted Set for leaderboards even if data "looks like" a list
2. Lua scripts for multi-step atomic operations -- EVALSHA with script caching, not raw EVAL
3. Pipeline batch reads (MGET) and writes (MSET) -- reduce round-trips by 10-100x
4. Use EXPIRE/PEXPIRE after SET, or SET with EX/PX in single command (atomic TTL)
5. Pub/sub for fanout invalidation -- but messages are fire-and-forget, not reliable delivery
6. Streams for reliable event processing -- consumer groups with ACK, XCLAIM for recovery
7. HyperLogLog for cardinality estimation (unique counts) -- 12KB fixed memory per key
8. Hash for objects with partial field access -- HGET single field without deserializing entire object
9. Sorted Set for time-series sliding windows -- ZRANGEBYSCORE with ZREMRANGEBYSCORE for cleanup
10. Bitmap for boolean state per ID -- SETBIT/GETBIT, 1 bit per entity, compact for millions

## Patterns

### Atomic Counter with Rate Limit
```
-- Single command: increment + set expiry if new
INCR key
EXPIRE key ttl (only if TTL == -1, use Lua for atomicity)
```

### Distributed Lock (Single Instance)
```
SET lock_key unique_value NX EX 30
-- Release: Lua script checks value before DEL (prevent releasing others' locks)
```

### Sliding Window (Sorted Set)
```
ZADD key timestamp member
ZREMRANGEBYSCORE key 0 (now - window_size)
ZCARD key  -- current count in window
```

### Cache Object with Partial Update (Hash)
```
HSET user:123 name "Alice" email "a@b.com" plan "pro"
HGET user:123 plan  -- read single field
HINCRBY user:123 login_count 1  -- atomic field increment
```

### Pub/Sub Invalidation
```
PUBLISH cache:invalidate "user:123"
-- All app instances subscribe, delete local L1 cache entry
```

## Anti-Patterns

- Using LIST as a queue without BRPOPLPUSH/BLMOVE (messages lost on crash)
- Storing large JSON blobs in STRING when only fields are accessed (use HASH)
- SUBSCRIBE in main connection (blocks all other commands -- use dedicated connection)
- Lua scripts >5KB or with non-deterministic commands (breaks replication)
- Using MULTI/EXEC for conditional logic (no branching -- use Lua instead)

## When to Use Lua

| Scenario | Why Lua |
|----------|---------|
| Check-and-set (CAS) | Atomic read + conditional write |
| Rate limiting | Increment + check + expire in one round-trip |
| Token bucket | Decrement + refill calculation |
| Cache stampede lock | SETNX + GET + conditional refresh |
| Aggregate before return | Reduce network: compute server-side |

## Verification

- [ ] Lua scripts registered with SCRIPT LOAD, called via EVALSHA
- [ ] No blocking commands (BLPOP) on shared connections
- [ ] Pipeline used for >3 sequential commands to same node
- [ ] OBJECT ENCODING checked for unexpected type promotions (listpack -> hashtable on Redis 7+; ziplist -> hashtable on <7)
- [ ] Memory usage profiled with `MEMORY USAGE key` for large value detection
- [ ] Pub/sub on dedicated connections, not connection pool connections

## Key Sizing

| Data Structure | Ideal Use | Memory Notes |
|----------------|-----------|--------------|
| String | Simple K/V, counters | Overhead: 56 bytes + value |
| Hash | Objects, sparse fields | listpack encoding <128 entries, <64B values (Redis 7+; was ziplist) |
| List | Queues, recent items | listpack encoding <128 elements |
| Set | Membership, tags | intset if all integers <512 members |
| Sorted Set | Rankings, time windows | listpack <128 members (Redis 7+; was ziplist) |
| Stream | Event log, CDC | Radix tree, trimmed with MAXLEN |
| HyperLogLog | Unique counts | Fixed 12KB regardless of cardinality |
| Bitmap | Boolean per ID | 1 bit per entity, max 512MB |
