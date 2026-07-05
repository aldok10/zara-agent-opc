---
type: fact
title: "Redis Cluster"
---

# Redis Cluster

Redis Cluster topology, hash slots, resharding, failover, and client routing.

## Topology

- 16384 hash slots distributed across master nodes
- Each master owns a contiguous or arbitrary range of slots
- Each master has 1+ replicas (async replication by default)
- Minimum viable cluster: 3 masters + 3 replicas (6 nodes)
- Slot assignment: `CLUSTER ADDSLOTS` or `redis-cli --cluster create`

## Hash Slot Assignment

```
slot = CRC16(key) mod 16384

-- Hash tags override: only content in first {} is hashed
CRC16("{user}:123:profile") → hashes "user" → slot X
CRC16("{user}:123:cart")    → hashes "user" → slot X (same!)

-- Keys co-located on same slot → multi-key ops work
```

## Client Routing

1. Client connects to any node, sends command
2. If key belongs to that node's slots → execute
3. If not → `-MOVED slot host:port` redirect
4. Client updates slot map, retries on correct node
5. During resharding → `-ASK slot host:port` (one-time redirect, don't update map)

Cluster-aware clients maintain slot map locally, route directly most of the time.

## Failover Process

```
1. Master becomes unreachable
2. Replicas detect via cluster-node-timeout (default 15s)
3. Replica with lowest replication offset initiates election
4. Majority of masters vote (quorum)
5. Winning replica promotes itself, takes over slots
6. Cluster broadcasts new configuration
7. Old master (if returns) becomes replica of new master
```

- Automatic failover: no sentinel needed
- Manual failover: `CLUSTER FAILOVER` (graceful, no data loss)
- Failover window: cluster-node-timeout + election time (~15-30s)

## Resharding (Online)

```bash
# Move 1000 slots from node A to new node D
redis-cli --cluster reshard <any-node>:6379 \
  --cluster-from <node-A-id> \
  --cluster-to <node-D-id> \
  --cluster-slots 1000

# During migration:
# - Reads: served by source (or ASK redirect to target if key already migrated)
# - Writes: may get ASK redirect to target
# - Client handles ASK transparently
```

- Resharding moves keys slot-by-slot (MIGRATE command per key)
- Large keys slow migration (key-by-key, not bulk)
- Monitor with `CLUSTER INFO` → `cluster_stats_messages_sent`

## Configuration

```
# redis.conf for cluster mode
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 15000
cluster-require-full-coverage no    # Don't refuse writes if some slots uncovered
cluster-allow-reads-when-down yes   # Serve reads from replicas during partial failure
```

## Monitoring

| Metric | Healthy Value | Alert Threshold |
|--------|--------------|-----------------|
| cluster_state | ok | "fail" |
| cluster_slots_ok | 16384 | < 16384 |
| cluster_known_nodes | Expected count | Node count drops |
| connected_slaves (per master) | >= 1 | 0 (no replica) |
| repl_offset lag | < 1MB | > 10MB (replica falling behind) |
| cluster_stats_messages_sent | Stable | Spike (split brain chatter) |

## Operational Runbook

| Scenario | Action |
|----------|--------|
| Add capacity | Add node → reshard slots from busiest nodes |
| Remove node | Reshard slots away → `CLUSTER FORGET` → shutdown |
| Replace failed master | Replica auto-promotes; add new replica to replacement |
| Network partition heals | Nodes auto-rejoin; verify no duplicate masters per slot |
| Rolling upgrade | Failover each master to replica → upgrade old master → failover back |
| Memory pressure | Identify hot slots (`CLUSTER COUNTKEYSINSLOT`) → reshard to less loaded node |

## Limitations

- Multi-key commands: all keys must be in same slot (use hash tags)
- Lua scripts: all keys accessed must be in same slot
- Transactions (MULTI): limited to same slot
- Large keys: slow to migrate during resharding
- Pub/sub: messages broadcast to all nodes (bandwidth cost at scale)
- Maximum cluster size: ~1000 nodes (gossip protocol overhead)
