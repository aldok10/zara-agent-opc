# Redis Data Structures

When to use each Redis data structure. Selection by access pattern, not data shape.

## String

- Simple key-value pairs, counters, serialized objects
- `SET`, `GET`, `INCR`, `DECR`, `MGET`, `MSET`
- Use for: session tokens, counters, serialized JSON blobs, flags
- Memory: 56 bytes overhead + value size
- Max value: 512MB (but keep under 1MB for performance)

## Hash

- Object with named fields, partial field access
- `HSET`, `HGET`, `HMGET`, `HINCRBY`, `HDEL`
- Use for: user profiles, product details, any entity with field-level read/write
- Advantage: read/update single field without deserializing entire object
- Encoding: listpack (compact) for <128 fields with values <64 bytes, then hashtable
- Avoid: nesting (Redis hashes are flat)

## List

- Ordered sequence, push/pop from both ends
- `LPUSH`, `RPUSH`, `LPOP`, `RPOP`, `LRANGE`, `LLEN`, `BLPOP`
- Use for: recent items (latest N), simple queues, activity feeds
- Encoding: listpack for <128 elements <64 bytes each, then quicklist
- Trim with `LTRIM` to cap length (prevent unbounded growth)
- For reliable queues, use Streams instead (Lists lose messages on crash)

## Set

- Unordered unique members, set operations (union, intersect, diff)
- `SADD`, `SREM`, `SMEMBERS`, `SISMEMBER`, `SINTER`, `SUNION`
- Use for: tags, unique visitors, followers/following, feature flags per user
- Encoding: intset for all-integer sets <512 members, then hashtable
- SRANDMEMBER for random selection without removal

## Sorted Set

- Unique members with score, ordered by score
- `ZADD`, `ZRANGE`, `ZRANGEBYSCORE`, `ZRANK`, `ZINCRBY`, `ZREM`
- Use for: leaderboards, rate limiting (sliding window), time-series, priority queues
- Encoding: listpack <128 members, then skiplist
- Powerful range queries: by score (ZRANGEBYSCORE) or rank (ZRANGE)
- `ZRANGEBYSCORE key (now-window) +inf` for sliding window counts

## Stream

- Append-only log with consumer groups
- `XADD`, `XREAD`, `XREADGROUP`, `XACK`, `XLEN`, `XTRIM`
- Use for: event sourcing, change data capture, reliable message queue
- Consumer groups provide at-least-once delivery with acknowledgment
- `XCLAIM` for reclaiming unacknowledged messages from failed consumers
- `MAXLEN ~1000` for approximate trimming (efficient, bounded memory)
- Radix tree storage: memory-efficient for sequential IDs

## HyperLogLog

- Probabilistic cardinality estimation
- `PFADD`, `PFCOUNT`, `PFMERGE`
- Use for: unique visitor counts, unique event counts, any "count distinct"
- Fixed 12KB memory regardless of elements added (billions)
- Error rate: 0.81% standard error
- Cannot retrieve members, only count
- PFMERGE combines multiple HLLs (useful for time-windowed counts)

## Bitmap

- Bit-level operations on strings
- `SETBIT`, `GETBIT`, `BITCOUNT`, `BITOP`, `BITPOS`
- Use for: daily active users, feature flags, boolean state per entity ID
- Memory: 1 bit per entity. 1M users = 125KB
- BITCOUNT for population count in range
- BITOP AND/OR/XOR for combining bitmaps (e.g., users active Mon AND Tue)

## Decision Table

| Need | Structure | Why |
|------|-----------|-----|
| Simple K/V or counter | String | Minimal overhead |
| Object with field access | Hash | Partial read/write |
| Latest N items | List + LTRIM | O(1) push, O(N) range |
| Unique membership | Set | O(1) add/check |
| Ranking / time window | Sorted Set | Ordered by score |
| Reliable message queue | Stream | Consumer groups + ACK |
| Unique count (approx) | HyperLogLog | Fixed 12KB |
| Boolean per entity | Bitmap | 1 bit per ID |
| Relationships/graph | Sorted Set + Hash | Score = weight, hash = properties |
| Geospatial | Geo (Sorted Set) | GEOADD, GEORADIUS |
