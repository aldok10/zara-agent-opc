---
type: fact
title: "Scalability - Horizontal/Vertical, Sharding, Autoscaling"
---

# Scalability Patterns

Scalability is the ability to handle increased load by adding resources. Good architecture scales linearly: 2x resources → 2x capacity. Great architecture scales sub-linearly: same resources handle more load through efficiency.

## Horizontal vs Vertical Scaling

### Vertical scaling (scale up)

Add more CPU, RAM, or faster disks to existing machine.

**When to use**: single-threaded workloads, databases before you're ready to shard, early-stage products. Simpler than distributed systems.

**Limits**: largest cloud instance is ~448 vCPUs / 24TB RAM (AWS u-24tb1.metal). Cost grows super-linearly. Single point of failure. Maintenance requires downtime.

### Horizontal scaling (scale out)

Add more machines. Distribute load across them.

**When to use**: stateless services (most web backends), read-heavy workloads, write-heavy workloads (with sharding), any system that must exceed single-machine limits.

**Requirements**: stateless application tier (or externalized state), load distribution mechanism, data partitioning strategy for stateful components.

**Real numbers**: a single PostgreSQL instance handles 10K-50K transactions/sec. When you need 500K TPS, you need horizontal distribution.

## Database Sharding

### Purpose

Split a single database into multiple databases, each holding a subset of data. Each shard operates independently.

### Sharding strategies

| Strategy | Mechanism | Best for | Risk |
|----------|-----------|----------|------|
| Hash-based | hash(shard_key) % num_shards | Even distribution | Resharding is painful |
| Range-based | shard by value range (A-M, N-Z) | Sequential access patterns | Hot ranges (recent data) |
| Geographic | shard by region/country | Data residency, latency | Uneven distribution |
| Tenant-based | one shard per tenant (or group) | Multi-tenant SaaS | Uneven tenant sizes |
| Directory-based | lookup table maps key → shard | Flexible routing | Lookup becomes bottleneck |

### Shard key selection

The most critical decision. Wrong shard key = hot partitions, cross-shard queries, painful migrations.

**Good shard keys**:
- High cardinality (many distinct values).
- Even distribution (no 80/20 skew).
- Present in most queries (avoid cross-shard scatter-gather).
- Stable (never changes for a row).

**Examples**: `user_id` for user-centric apps, `tenant_id` for SaaS, `order_id` for order processing. NOT `created_date` (all writes hit latest shard), NOT `country` (USA shard 100x larger than Luxembourg).

### Cross-shard operations

- Queries spanning shards: scatter-gather (hit all shards, merge results). Expensive.
- Joins across shards: impossible at database level. Denormalize or handle in application.
- Transactions across shards: two-phase commit (2PC) or saga pattern. Avoid if possible.
- Global ordering: no single auto-increment. Use UUIDs, Snowflake IDs, or shard-prefixed sequences.

### Resharding

Adding shards after initial deployment. Painful but sometimes necessary.

**Approaches**:
- Consistent hashing: minimizes data movement when adding nodes. Move only K/N keys.
- Virtual shards: over-partition initially (256 virtual shards on 4 physical nodes). Move virtual shards to new nodes without data splits.
- Online migration: double-write to old and new shard, backfill, switch reads, stop old writes.

**Prevention**: start with more shards than needed. 64-256 logical shards on fewer physical nodes. Rebalancing moves logical shards without splitting data.

## Read Replicas

### Pattern

One primary handles writes. Multiple replicas serve reads. Replication lag is the trade-off.

### Replication modes

| Mode | Consistency | Latency impact | Data safety |
|------|-------------|----------------|-------------|
| Synchronous | Strong | Higher write latency (wait for replica ACK) | Zero data loss on failover |
| Asynchronous | Eventual (ms to seconds lag) | No write latency impact | Possible data loss on failover |
| Semi-synchronous | At least one replica confirmed | Moderate | At most one replica behind |

### Routing reads

- Application-level: use connection pool with read/write split. Send writes to primary, reads to replica.
- Proxy-level: ProxySQL, PgPool route based on query type (SELECT → replica, others → primary).
- Consistency-aware: after a write, route subsequent reads from same user to primary for read-your-writes guarantee.

### Scaling reads

- PostgreSQL: supports 100+ streaming replicas per primary.
- MySQL: read replica chains (replica of replica) for extreme fan-out.
- Practical: most applications need 2-5 replicas. Beyond that, add caching instead.

## Connection Pooling

### Problem

Database connections are expensive (TCP handshake, auth, memory allocation). Each PostgreSQL connection uses ~10MB RAM. 1000 connections = 10GB just for connection overhead.

### Solutions

| Tool | Database | Model |
|------|----------|-------|
| PgBouncer | PostgreSQL | Transaction-mode pooling (most common) |
| PgCat | PostgreSQL | Rust rewrite, sharding + pooling |
| ProxySQL | MySQL | Query routing, read/write split, pooling |
| Amazon RDS Proxy | AWS managed | Automatic pooling for RDS/Aurora |
| Odyssey | PostgreSQL | Multi-threaded, from Yandex |

### PgBouncer modes

- **Session pooling**: one server connection per client session. Minimal benefit.
- **Transaction pooling**: server connection held only during transaction. 10x+ multiplexing. Cannot use prepared statements or session variables.
- **Statement pooling**: connection returned after each statement. Most aggressive. Breaks multi-statement transactions.

### Sizing

Pool size = ((num_cores * 2) + num_disks) for the database server. PostgreSQL sweet spot: 100-300 connections to the database, regardless of application connection count. More connections = more context switching = lower throughput.

## Caching Layers

### Cache hierarchy

| Layer | Latency | Scope | Example |
|-------|---------|-------|---------|
| CPU cache | 1-10ns | Per core | Hardware-managed |
| Application cache | 10-100ns | Per instance | In-process HashMap |
| Distributed cache | 0.5-2ms | Cluster-wide | Redis, Memcached |
| CDN | 10-50ms | Global edge | CloudFront, Fastly |
| Database buffer | 0.1-1ms | Per database | PostgreSQL shared_buffers |

### Redis vs Memcached

| Feature | Redis | Memcached |
|---------|-------|-----------|
| Data structures | Strings, hashes, lists, sets, sorted sets, streams | Strings only |
| Persistence | RDB snapshots + AOF | None |
| Replication | Primary-replica | None (client-side) |
| Clustering | Redis Cluster (auto-sharding) | Client-side consistent hashing |
| Memory efficiency | Higher overhead per key | Better for simple key-value |
| Threading | Single-threaded (6.0+ has I/O threads) | Multi-threaded |

**Use Redis when**: you need data structures, persistence, pub/sub, or Lua scripting.
**Use Memcached when**: simple key-value caching, multi-threaded performance matters, memory efficiency for small values.

### Cache invalidation strategies

| Strategy | Mechanism | Consistency |
|----------|-----------|-------------|
| TTL-based | Expire after fixed time | Eventually consistent (lag = TTL) |
| Write-through | Update cache on every write | Strong (write latency includes cache) |
| Write-behind | Queue cache updates async | Eventual (risk of loss on crash) |
| Cache-aside | App checks cache, fills on miss | Eventual (stale until TTL or invalidation) |
| Event-driven | CDC event triggers invalidation | Near real-time (CDC lag, typically <1s) |

### CDN caching

- Static assets: long TTL (1 year), versioned filenames for cache busting.
- API responses: short TTL (10-60s) with `stale-while-revalidate`.
- Personalized content: not cacheable at CDN (use edge compute or skip CDN).
- Cache hit ratio target: >95% for static, >60% for dynamic API responses.

## Autoscaling

### Metrics for scaling decisions

| Metric | Scale-out trigger | Scale-in trigger | Lag |
|--------|-------------------|------------------|-----|
| CPU utilization | >70% for 2 min | <30% for 10 min | Fast |
| Memory utilization | >80% | <40% | Medium |
| Request count (RPS) | >threshold per instance | <threshold | Fast |
| Queue depth | >N messages pending | Queue empty for 5 min | Fast |
| Custom (latency) | p99 > 500ms | p99 < 100ms | Medium |

### Scaling policies

- **Target tracking**: maintain metric at target value (e.g., CPU at 60%). Simplest.
- **Step scaling**: add N instances when metric crosses threshold. More control.
- **Scheduled**: pre-scale for known traffic patterns (Monday morning, sales events).
- **Predictive**: ML-based forecasting. AWS provides this natively.

### KEDA (Kubernetes Event-Driven Autoscaler)

Scales pods based on external event sources:

- Kafka consumer lag (scale consumers to match producer rate).
- Queue depth (SQS, RabbitMQ, Azure Service Bus).
- Prometheus metrics (custom business metrics).
- Cron-based (scheduled scaling).
- HTTP requests (scale to zero when idle).

**Scale-to-zero**: KEDA can scale deployments to 0 replicas, reactivating on incoming events. Saves cost for bursty workloads.

### Capacity planning methodology

1. **Baseline**: measure current resource usage per request at steady state.
2. **Project growth**: business forecast → expected traffic growth.
3. **Headroom**: plan for 2x peak capacity (handle spikes without scaling lag).
4. **Load test**: verify system handles projected load before it arrives.
5. **Review quarterly**: compare projections to actuals, adjust models.

## Load Testing for Scale

### Types

| Type | Purpose | Duration |
|------|---------|----------|
| Smoke | Verify system works under minimal load | 1-5 min |
| Load | Test at expected peak traffic | 15-60 min |
| Stress | Find breaking point (ramp until failure) | Until failure |
| Soak | Find memory leaks, resource exhaustion | 4-24 hours |
| Spike | Test sudden traffic surge handling | Burst pattern |

### Tools

- **k6**: JavaScript-based, developer-friendly. Good for CI/CD integration.
- **Gatling**: Scala DSL, detailed reports. Enterprise features.
- **Locust**: Python-based, distributed. Easy to write complex scenarios.
- **wrk/wrk2**: command-line, low-overhead. For quick HTTP benchmarks.

### Key principles

- Test against production-like environment (same instance sizes, data volume).
- Warm up caches before measuring (unless testing cold-start behavior).
- Measure: throughput, latency percentiles (p50, p95, p99), error rate, resource saturation.
- Find the bottleneck: it's always one thing. Fix it, then find the next one.

## Queue-Based Load Leveling

### Pattern

Put a queue between producers and consumers. Producers write at variable rate; consumers process at sustainable rate.

### When to use

- Spiky workloads (flash sales, batch imports, webhook bursts).
- Expensive operations that shouldn't block the request path (video encoding, PDF generation).
- Decoupling services with different throughput capacities.

### Implementation

- SQS + Lambda/ECS workers: fully managed, scales automatically.
- Kafka: ordered, replayable, high-throughput. For event streaming.
- RabbitMQ: flexible routing, priority queues, dead-letter exchanges.

### Sizing consumer count

Target: queue depth stays bounded. If messages arrive at 1000/sec and each takes 100ms to process, need 100 consumers minimum. Add 50% headroom: 150 consumers. KEDA automates this.

## Backpressure

### Concept

When a system can't keep up, signal upstream to slow down. Without backpressure, queues grow unbounded → OOM → crash.

### Mechanisms

| Mechanism | Layer | Behavior |
|-----------|-------|----------|
| TCP flow control | Network | Receiver advertises window size |
| HTTP 429 | Application | Reject with Retry-After header |
| Queue depth limit | Message broker | Reject publish when queue full |
| Reactive Streams | Library | Subscriber requests N items at a time |
| Load shedding | Load balancer | Drop low-priority requests when saturated |
| Admission control | Application | Reject requests when thread pool full |

### Load shedding priorities

When system is overloaded, shed in order:
1. Health checks from monitoring (they'll retry).
2. Internal batch jobs (reschedule).
3. Low-priority API requests (free tier).
4. High-priority API requests (paid users) — last resort.

Never shed: shutdown signals, circuit breaker checks, failover coordination.

## Stateless Design

### Principle

Application instances hold no local state between requests. All state lives in external stores (database, cache, object storage).

### What to externalize

| State type | External store | Notes |
|------------|---------------|-------|
| User sessions | Redis, DynamoDB | TTL-based expiration |
| File uploads | S3, GCS | Presigned URLs for direct upload |
| Locks | Redis (Redlock), ZooKeeper | Distributed locks with TTL |
| Configuration | Parameter store, Consul | Hot-reloadable |
| Scheduled tasks | Database-backed scheduler | ShedLock, Quartz with JDBC store |

### Benefits

- Any instance can handle any request (simplified load balancing).
- Scale horizontally by adding instances (no session affinity needed).
- Instant recovery: failed instance replaced without state migration.
- Blue-green and canary deploys: no connection draining concerns for state.

### Session affinity (sticky sessions)

Sometimes unavoidable (WebSocket connections, long-running uploads). Mitigate with:
- Graceful drain on shutdown (finish in-flight requests before terminating).
- Session migration protocol (hand off to another instance).
- Keep affinity scope minimal (per-connection, not per-user).
- Always have a fallback path if the sticky instance dies (session in Redis).

## Practical Scale Numbers

Reference points for capacity planning:

| Component | Single instance capacity | Scaling mechanism |
|-----------|------------------------|-------------------|
| Nginx | 10K-100K concurrent connections | Horizontal |
| PostgreSQL | 10K-50K TPS (OLTP) | Read replicas, sharding |
| Redis | 100K-200K ops/sec | Cluster (16K hash slots) |
| Kafka (per broker) | 200K-800K messages/sec | Add brokers + partitions |
| Elasticsearch | 10K-50K searches/sec per node | Add data nodes |
| S3 | 5,500 GET/sec per prefix, 3,500 PUT/sec | Partition prefixes |
| DynamoDB | Unlimited with proper partition key | On-demand or provisioned |

These vary heavily with hardware, data size, query complexity, and configuration. Benchmark your specific workload — never use generic numbers for capacity planning.
