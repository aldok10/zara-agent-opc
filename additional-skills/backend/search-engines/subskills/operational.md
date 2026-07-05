# Search Engine Operations

Cluster management, sharding, replication, and monitoring for production search infrastructure.

## When to Load

- Sizing and deploying search clusters
- Troubleshooting performance degradation
- Planning capacity and scaling strategy
- Configuring high availability and disaster recovery

## Key Concepts

**Sharding** -- Splitting an index across multiple nodes for horizontal scale. Primary shards set at index creation (immutable in ES). More shards = more parallelism but more overhead. Rule of thumb: 10-50GB per shard.

**Replication** -- Copies of each shard for fault tolerance and read throughput. Replica count adjustable at runtime. Minimum 1 replica for production.

**Cluster Topology** -- Dedicated roles: master-eligible (3+ for quorum), data (hot/warm/cold tiers), coordinating (query routing), ingest (pipeline processing). Separate roles in production.

**Index Lifecycle Management (ILM)** -- Automate rollover, shrink, force merge, and deletion based on age or size. Hot-warm-cold architecture for cost optimization.

**Circuit Breakers** -- Memory protection. Request breaker (single query), fielddata breaker (aggregations), total breaker (node-level). Tuning prevents OOM but too aggressive = rejected queries.

## Patterns

```yaml
# Cluster topology (production minimum)
master_nodes: 3 (dedicated, small instances)
data_hot: 3+ (SSD, high CPU)
data_warm: 2+ (HDD, high storage)
coordinating: 2+ (high memory for aggregations)

# Shard sizing decision
total_data: 500GB
target_shard_size: 30GB
primary_shards: 17
replicas: 1
total_shards: 34

# ILM policy
hot_phase: { rollover: { max_size: "30gb", max_age: "7d" } }
warm_phase: { min_age: "30d", actions: { shrink: { number_of_shards: 1 }, forcemerge: { max_num_segments: 1 } } }
cold_phase: { min_age: "90d", actions: { searchable_snapshot: {} } }
delete_phase: { min_age: "365d" }
```

```
# Key monitoring queries
GET _cat/shards?v&s=store:desc
GET _cat/nodes?v&h=name,heap.percent,ram.percent,cpu,load_1m
GET _cluster/health
GET _nodes/stats/jvm,os,process
GET _cat/thread_pool?v&h=node_name,name,active,queue,rejected
```

## Gotchas

- Too many shards (over-sharding): each shard has fixed overhead (~1MB heap). 1000+ shards per node causes instability
- Unbalanced shard allocation: hot spots from uneven data distribution or allocation awareness misconfiguration
- JVM heap over 30.5GB loses compressed object pointers -- stay at or below 30GB
- Split brain: fewer than 3 dedicated master nodes risks data loss during network partition
- Mapping explosion: dynamic mapping with arbitrary keys creates thousands of fields, memory bloat

## Verification

- Cluster health is green (all primaries and replicas assigned)
- No individual shard exceeds 50GB
- JVM heap usage stays below 75% under normal load
- Search latency p95 meets SLA (typically <200ms)
- No rejected threads in search or bulk thread pools
- Recovery time after node loss is within acceptable window
