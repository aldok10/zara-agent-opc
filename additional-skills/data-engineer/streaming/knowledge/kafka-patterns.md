# Kafka Patterns

Producers, consumers, partitioning, replication, and exactly-once semantics for Apache Kafka 4.0+ (KRaft).

## Architecture (KRaft -- No ZooKeeper)

Kafka 4.0 is KRaft-only. Controller nodes manage metadata via Raft consensus.

```
Controller Quorum (3 nodes) -- metadata, partition assignment
Broker Nodes (N) -- store partitions, serve producers/consumers
Topics -> Partitions -> Replicas (leader + followers)
```

## Producers

### Idempotent Producer (Default in 3.0+)

```python
from confluent_kafka import Producer

config = {
    "bootstrap.servers": "broker1:9092,broker2:9092",
    "enable.idempotence": True,
    "acks": "all",
    "max.in.flight.requests.per.connection": 5,
    "retries": 2147483647,
    "delivery.timeout.ms": 120000,
    "linger.ms": 5,
    "batch.size": 65536,
    "compression.type": "zstd",
}

producer = Producer(config)
```

### Key Design Decisions

| Config | Value | Rationale |
|--------|-------|-----------|
| `acks` | `all` | Full durability -- all ISR replicas confirm |
| `compression.type` | `zstd` | Best ratio + speed for most workloads |
| `linger.ms` | 5-20 | Batch messages for throughput |
| `batch.size` | 64KB-256KB | Larger = better throughput, more latency |
| `max.in.flight` | 5 | Safe with idempotence; higher = more throughput |

### Partitioning Strategy

```python
def order_partitioner(key: bytes, partitions: list, available: list) -> int:
    # Hash on customer_id to ensure order per customer
    return hash(key) % len(partitions)
```

**Key rules**:
- Same key -> same partition -> guaranteed ordering
- Null key -> round-robin (no ordering guarantee)
- Hash on business entity ID (customer, account, device)
- Avoid hot partitions: don't use low-cardinality keys (status, region)

## Consumers

### Consumer Group

```python
from confluent_kafka import Consumer

config = {
    "bootstrap.servers": "broker1:9092",
    "group.id": "order-processor",
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False,
    "max.poll.interval.ms": 300000,
    "session.timeout.ms": 45000,
    "heartbeat.interval.ms": 3000,
    "partition.assignment.strategy": "cooperative-sticky",
}

consumer = Consumer(config)
consumer.subscribe(["orders"])
```

### Offset Management

```python
while True:
    msg = consumer.poll(timeout=1.0)
    if msg is None:
        continue
    if msg.error():
        handle_error(msg.error())
        continue

    try:
        process_message(msg)
        consumer.commit(message=msg, asynchronous=False)
    except ProcessingError:
        send_to_dlq(msg)
        consumer.commit(message=msg, asynchronous=False)
```

**Never auto-commit**: commit only after successful processing + sink write.

## Exactly-Once Semantics

Three levels must all be satisfied:
1. **Producer**: idempotent producer (dedup on broker)
2. **Consumer**: transactional read-process-write
3. **Sink**: idempotent writes (upsert, dedup key)

### Transactional Consumer-Producer

```python
producer.init_transactions()
try:
    producer.begin_transaction()
    # Process messages and produce output
    producer.produce("output-topic", key=key, value=transformed)
    # Commit consumer offsets within the transaction
    producer.send_offsets_to_transaction(
        consumer.position(consumer.assignment()),
        consumer.consumer_group_metadata(),
    )
    producer.commit_transaction()
except Exception:
    producer.abort_transaction()
```

## Topic Configuration

```bash
# Production topic creation
kafka-topics.sh --create \
    --topic orders \
    --partitions 12 \
    --replication-factor 3 \
    --config retention.ms=604800000 \
    --config cleanup.policy=delete \
    --config min.insync.replicas=2 \
    --config compression.type=zstd
```

### Partition Count

- Start with: max(target_throughput_MB / 10, max_consumer_instances)
- Each partition handles ~10MB/s write throughput
- Can only increase partitions, never decrease (rekeys messages)
- 12-30 partitions covers most use cases

### Replication

- `replication.factor` = 3 (survive 1 broker failure with `min.insync.replicas=2`)
- `min.insync.replicas` = 2 (producer `acks=all` requires 2 confirmations)
- `unclean.leader.election.enable` = false (prevent data loss)

## Compacted Topics

For state/lookup data (latest value per key):

```bash
kafka-topics.sh --create \
    --topic customer-profiles \
    --partitions 6 \
    --replication-factor 3 \
    --config cleanup.policy=compact \
    --config min.compaction.lag.ms=3600000 \
    --config delete.retention.ms=86400000
```

Use for: cache population, event sourcing snapshots, configuration distribution.

## Schema Registry

```python
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer

schema_registry = SchemaRegistryClient({"url": "http://schema-registry:8081"})
avro_serializer = AvroSerializer(schema_registry, schema_str, conf={"auto.register.schemas": False})
```

**Compatibility modes**:
- BACKWARD (default): new schema can read old data
- FORWARD: old schema can read new data
- FULL: both directions
- Rule: add fields with defaults, never remove or rename

## Monitoring

| Metric | Alert Threshold |
|--------|-----------------|
| Consumer lag (records) | >10k for >5 min |
| Under-replicated partitions | >0 for >2 min |
| ISR shrink rate | Any occurrence |
| Request latency p99 | >100ms |
| Log end offset growth | Flat for expected active topic |
| Active controller count | != 1 |

## Anti-Patterns

- Auto-committing offsets (at-most-once delivery on failure)
- Messages >1MB (use claim-check: store payload in S3, send URI)
- Single partition topics (no parallelism, head-of-line blocking)
- Using Kafka as a database (no random reads, no secondary indexes)
- Topic-per-customer (metadata explosion at scale)
- Ignoring consumer rebalancing (cooperative-sticky reduces storms)
