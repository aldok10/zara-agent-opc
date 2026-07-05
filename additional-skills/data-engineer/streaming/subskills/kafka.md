---
type: subskill
title: "Apache Kafka"
---

# Apache Kafka

Producers, consumers, exactly-once semantics, consumer groups, and operational patterns.

## When to Load

- Designing event-driven architectures with Kafka
- Implementing exactly-once processing semantics
- Tuning producer/consumer configurations for throughput or latency
- Troubleshooting consumer lag or rebalancing issues

## Key Concepts

**Core Architecture**
- Broker: Kafka server storing partitions and serving clients
- Topic: logical stream of records, split into partitions
- Partition: ordered, immutable sequence of records (unit of parallelism)
- Consumer Group: set of consumers sharing topic partitions (each partition -> one consumer)
- Offset: position of a consumer within a partition

**Producer Guarantees**
- `acks=0`: fire and forget (fastest, may lose data)
- `acks=1`: leader acknowledged (may lose if leader fails before replication)
- `acks=all` + `min.insync.replicas=2`: strongest durability guarantee
- Idempotent producer (`enable.idempotence=true`): deduplicates at broker level
- Transactional producer: atomic writes across multiple partitions

**Consumer Patterns**
- At-most-once: commit offset before processing (may lose messages)
- At-least-once: process then commit (may duplicate -- most common)
- Exactly-once: transactional consumer-producer or idempotent sinks

**Partition Strategy**
- Key-based: records with same key always go to same partition (ordering guarantee)
- Round-robin: even distribution when ordering doesn't matter
- Custom partitioner: business logic (e.g., tenant-based routing)
- Partition count: set at creation, hard to change later -- plan for growth

## Patterns

```python
from confluent_kafka import Producer, Consumer, KafkaError
import json

# Producer with exactly-once semantics
producer_config = {
    "bootstrap.servers": "kafka:9092",
    "enable.idempotence": True,
    "acks": "all",
    "retries": 2147483647,
    "max.in.flight.requests.per.connection": 5,
    "linger.ms": 5,
    "batch.size": 65536,
    "compression.type": "lz4",
}

producer = Producer(producer_config)

def produce_event(topic: str, key: str, value: dict):
    producer.produce(
        topic=topic,
        key=key.encode(),
        value=json.dumps(value).encode(),
        callback=delivery_callback,
    )
    producer.poll(0)

# Consumer with manual offset management
consumer_config = {
    "bootstrap.servers": "kafka:9092",
    "group.id": "order-processor",
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False,
    "max.poll.interval.ms": 300000,
    "session.timeout.ms": 45000,
}

consumer = Consumer(consumer_config)
consumer.subscribe(["orders"])

while True:
    msg = consumer.poll(1.0)
    if msg is None:
        continue
    if msg.error():
        handle_error(msg.error())
        continue
    process_message(msg)
    consumer.commit(message=msg)
```

**Topic Configuration Guidelines**
- Retention: time-based (7 days default) or size-based
- Compacted topics: keep latest value per key (state snapshots)
- Replication factor: 3 for production (tolerates 1 broker failure)
- Partition count: start with `max(expected_throughput_MB / 10, consumer_count)`

## Gotchas

- Increasing partitions doesn't redistribute existing data -- only new messages
- Consumer rebalancing causes processing pause -- use cooperative sticky assignor
- `max.poll.interval.ms` exceeded = consumer kicked from group (tune for slow processing)
- Exactly-once requires both producer AND consumer to participate in transactions
- Topic deletion with active consumers causes undefined behavior -- drain first
- Compacted topics still have a "dirty" tail section before compaction runs

## Verification

- Producer delivery callbacks confirm successful writes (no errors)
- Consumer lag is bounded and trending toward zero
- No messages lost: produce count == consume count (end-to-end check)
- Rebalancing completes within acceptable time (< 30 seconds)
- Under failure: stop one broker, confirm no data loss after recovery
