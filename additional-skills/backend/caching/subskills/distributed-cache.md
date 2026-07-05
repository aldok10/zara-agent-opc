---
type: subskill
title: "Distributed Cache"
---

# Distributed Cache

Distributed cache topology and operations. Consistent hashing, replication, partition tolerance, Redis Cluster vs alternatives.

## Rules

1. Redis Cluster uses 16384 hash slots -- keys map to slots via CRC16, slots assigned to masters
2. Multi-key operations require all keys on same slot -- use hash tags `{user}:123:profile` `{user}:123:prefs`
3. Minimum 3 masters for Redis Cluster -- fewer cannot achieve quorum for failover
4. Each master should have 1+ replica -- replica promotes on master failure (automatic failover)
5. Client must handle MOVED and ASK redirects -- use cluster-aware clients (ioredis, go-redis, jedis)
6. Cross-slot operations (MGET across slots) must be decomposed client-side into per-slot batches
7. Resharding is online but increases latency -- plan capacity ahead, resharding during low traffic
8. Network partition: Redis Cluster favors availability (stale reads from minority) -- not CP
9. Consistent hashing ring for custom sharding -- virtual nodes prevent hotspots on node add/remove
10. Replication is async by default -- WAIT command for synchronous replication (at latency cost)

## Redis Cluster Architecture

```
Cluster: 16384 hash slots distributed across masters

Master A [slots 0-5460]     ←→ Replica A'
Master B [slots 5461-10922] ←→ Replica B'
Master C [slots 10923-16383]←→ Replica C'

Client → any node → MOVED 3999 master-a:6379 (redirect to correct node)
```

## Hash Tags for Co-location

```
-- These keys land on SAME slot (hash computed on {user} only):
SET {user}:123:profile "..."
SET {user}:123:settings "..."
SET {user}:123:cart "..."

-- Now MGET works:
MGET {user}:123:profile {user}:123:settings {user}:123:cart
```

## Topology Comparison

| Feature | Redis Cluster | Redis Sentinel | Valkey | KeyDB | Dragonfly |
|---------|--------------|----------------|--------|-------|-----------|
| Sharding | Built-in (16384 slots) | No (single master) | Built-in (16384 slots) | Built-in | Single-instance multi-thread |
| Multi-thread | I/O threads (Redis 6.0+) | No | I/O threads (inherited) | Yes (native) | Yes (native) |
| Max throughput | Scale-out (add nodes) | Single-node limit | Scale-out (add nodes) | Higher per node | Much higher per node |
| Failover | Automatic (consensus) | Automatic (sentinel quorum) | Automatic (consensus) | Automatic | N/A (single node) |
| Multi-key ops | Same slot only | All keys available | Same slot only | Same slot only | All keys available |
| Lua scripts | Same slot keys only | All keys | Same slot keys only | Same slot keys only | All keys |
| License | RSALv2/SSPLv1 | RSALv2/SSPLv1 | BSD-3 (Linux Foundation) | BSD-3 | BSL 1.1 |
| Use case | Large datasets, high throughput | HA for moderate load | Redis-compatible, OSS alternative | High write throughput | Drop-in replacement, high perf |

## Consistent Hashing (Custom Sharding)

```
-- Virtual nodes prevent hotspots:
Ring: [0 ──── Node A ──── Node B ──── Node C ──── 2^32]
     Each physical node has 100-200 virtual nodes on ring
     Key maps to first node clockwise from hash(key)

-- Adding Node D:
     Only keys between predecessor and D migrate (minimal redistribution)
     Rebalance: ~1/N keys move (N = number of nodes)
```

## Partition Tolerance

| Scenario | Redis Cluster Behavior |
|----------|----------------------|
| Master fails, replica exists | Replica promoted after cluster-node-timeout (15s default) |
| Master fails, no replica | Cluster goes CLUSTERDOWN for those slots (partial unavailable) |
| Network split (minority partition) | Minority masters stop accepting writes after node-timeout |
| Network heals | Nodes rejoin, replica syncs from master |
| Split brain (both partitions elect masters) | Possible brief data loss on rejoin (last-writer-wins) |

## Scaling Operations

### Add Node (Scale Out)
```
1. redis-cli --cluster add-node new-host:6379 existing:6379
2. redis-cli --cluster reshard existing:6379 --cluster-from all --cluster-to <new-node-id> --cluster-slots 4096
3. Verify: redis-cli --cluster check any-node:6379
```

### Remove Node (Scale In)
```
1. Reshard all slots away from target node
2. redis-cli --cluster del-node any:6379 <node-id>
3. Verify no slots assigned to removed node
```

## Anti-Patterns

- Cross-slot MGET/pipeline without hash tags (silent failures or CROSSSLOT errors)
- Relying on Lua scripts that access keys in different slots
- Single replica per master in production (one failure away from slot unavailability)
- `cluster-require-full-coverage yes` in production (one down slot = entire cluster refuses writes)
- Resharding during peak traffic without monitoring migration queue depth
- Ignoring MOVED redirects (stale routing = unnecessary hops)

## Verification

- [ ] All multi-key operations use hash tags for co-location
- [ ] Cluster has minimum 3 masters with 1+ replica each
- [ ] Client library is cluster-aware and handles redirects
- [ ] `cluster-require-full-coverage` set to `no` for availability
- [ ] Failover tested: kill master, verify replica promotion and client reconnection
- [ ] Resharding tested in staging with production-like data volume
- [ ] Memory usage balanced across nodes (no hotspot slots)
- [ ] Monitoring: cluster state, slot coverage, replication lag per replica
