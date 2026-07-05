# Broker Comparison

Decision matrix for Apache Kafka, RabbitMQ, NATS JetStream, and Redis Streams.

## Quick Decision

- **High throughput + event log** -> Kafka
- **Complex routing + moderate throughput** -> RabbitMQ
- **Low-latency + operational simplicity** -> NATS JetStream
- **Already using Redis + lightweight eventing** -> Redis Streams

## Feature Comparison

| Feature | Kafka | RabbitMQ | NATS JetStream | Redis Streams |
|---------|-------|----------|----------------|---------------|
| Model | Distributed log | Message broker (AMQP) | Subject-based streaming | Append-only log |
| Ordering | Per-partition | Per-queue | Per-subject/stream | Per-stream |
| Throughput | 1M+ msg/s per cluster | 50-100K msg/s | 200-500K msg/s | 100-500K msg/s |
| Latency (p99) | 5-50ms | 1-10ms | <1ms (core), 2-10ms (JS) | <1ms |
| Retention | Unlimited (tiered storage) | Until consumed | Configurable (time/size/count) | Memory-bound + maxlen |
| Replay | Yes (offset-based) | No (consumed = gone) | Yes (sequence-based) | Yes (ID-based) |
| Consumer groups | Yes (partition-based) | Competing consumers | Yes (durable consumers) | Yes (XREADGROUP) |
| Exactly-once | Transactional producer + idempotent | No (at-least-once) | Dedup window (msg ID) | No |
| Schema enforcement | Schema Registry (external) | No native | No native | No native |
| Clustering | Broker replication (KRaft) | Quorum queues (Raft) | Built-in (Raft) | Redis Cluster (no stream replication) |
| Operations complexity | High (multi-component) | Medium | Low (single binary) | Low (if already running Redis) |

## Throughput and Scaling

| Broker | Horizontal Scale | Partition/Queue Limit | Storage |
|--------|-----------------|----------------------|---------|
| Kafka | Add brokers, rebalance partitions | 100K+ partitions per cluster | Disk (tiered to object storage) |
| RabbitMQ | Add nodes, quorum queues replicate | Practical limit ~50K queues | Disk (per-queue files) |
| NATS | Add nodes, streams auto-distributed | Scales with cluster size | File or memory per stream |
| Redis Streams | Redis Cluster sharding | Memory-bound per node | Memory (+ AOF/RDB persistence) |

## Use Case Mapping

| Use Case | Recommended | Why |
|----------|-------------|-----|
| Event sourcing | Kafka | Immutable log, compaction, infinite retention |
| Task queue (work distribution) | RabbitMQ | Competing consumers, ack/nack, priority |
| Microservice events (cloud-native) | NATS JetStream | Low overhead, simple ops, fast |
| Real-time analytics pipeline | Kafka | High throughput, Kafka Streams/Flink integration |
| Delayed/scheduled messages | RabbitMQ | Native TTL + DLX delayed pattern |
| IoT device messaging | NATS | Leaf nodes, low-latency, lightweight protocol |
| Cache invalidation events | Redis Streams | Co-located with cache, sub-ms latency |
| Complex routing (headers, topics) | RabbitMQ | Exchange types, binding patterns |
| Cross-DC replication | Kafka | MirrorMaker 2, geo-replication built-in |
| Request-reply | NATS (core) | Native request-reply with timeout |

## Cost Considerations (2026)

| Factor | Kafka | RabbitMQ | NATS | Redis Streams |
|--------|-------|----------|------|---------------|
| Infrastructure | 3+ brokers + controllers | 3+ nodes (quorum) | 3+ nodes | Existing Redis cluster |
| Storage cost | High (disk) + tiered (S3) | Medium (disk per queue) | Medium (file storage) | High (memory) |
| Operational cost | High (expertise needed) | Medium | Low | Low (if Redis already managed) |
| Managed options | Confluent Cloud, MSK, Aiven | CloudAMQP, AmazonMQ | Synadia Cloud | ElastiCache, Upstash |
| TCO (relative) | 3-5x baseline | 1.5-2x baseline | 1x baseline | 1x if Redis exists |

## Migration Considerations

- Kafka -> NATS: reduce operational complexity, sacrifice some exactly-once guarantees
- RabbitMQ -> Kafka: gain replay/retention, lose complex routing
- Redis Streams -> Kafka: gain durability/replication, add infrastructure
- Any -> managed service: reduce ops, increase vendor lock-in and cost

## When NOT to Use

| Broker | Avoid When |
|--------|-----------|
| Kafka | <10K msg/s, no replay needed, team lacks Kafka expertise |
| RabbitMQ | Need replay, >100K msg/s sustained, event sourcing |
| NATS | Need Schema Registry natively, complex stream processing (use Kafka Streams) |
| Redis Streams | Need guaranteed persistence, cross-node ordering, >available memory |
