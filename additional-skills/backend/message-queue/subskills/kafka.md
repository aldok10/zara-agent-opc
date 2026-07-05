---
type: subskill
title: "Kafka"
---

# Kafka

Apache Kafka deep-dive. Distributed commit log, partitioned topics, consumer groups, exactly-once semantics (transactional), KRaft consensus, tiered storage, Kafka Streams, and Connect.

## Core Concepts

### Partitioning Strategy
- Partition key = business entity ID (order_id, user_id, account_id)
- All events for same entity land on same partition = ordered processing
- Null key = round-robin distribution (no ordering guarantee)
- Re-partitioning requires new topic + consumer migration (plan ahead)
- Target: 10-50 partitions per topic for typical workloads, scale with consumer count

### Producer Configuration
```
acks=all                    # Wait for all ISR replicas
enable.idempotence=true     # Dedup at broker (PID + sequence)
max.in.flight.requests=5    # Safe with idempotence enabled
retries=MAX_INT             # Retry indefinitely (bounded by delivery.timeout.ms)
delivery.timeout.ms=120000  # Total time before give up
compression.type=zstd       # Best ratio for JSON/Avro events
```

### Consumer Configuration
```
enable.auto.commit=false         # Manual commit after processing
auto.offset.reset=earliest       # Don't skip messages on new consumer
max.poll.records=500             # Bounded batch size
max.poll.interval.ms=300000      # Heartbeat vs processing timeout
session.timeout.ms=45000         # Detect dead consumers
partition.assignment.strategy=cooperative-sticky  # Incremental rebalance
```

### Exactly-Once Semantics (EOS)
- Transactional producer: `beginTransaction()` -> produce -> `commitTransaction()`
- Consumer isolation: `isolation.level=read_committed` skips uncommitted messages
- EOS = idempotent producer + transactional writes + committed reads
- Only works within Kafka (produce-consume-produce chains)
- External sinks still need idempotent consumers (EOS doesn't extend to DBs)

## KRaft (ZooKeeper Removal)

- Kafka 4.0: ZooKeeper fully removed, KRaft is the only mode
- Controller quorum: 3-5 dedicated controller nodes (or combined mode for small clusters)
- Faster partition leader election (seconds vs minutes with ZK)
- Metadata stored as internal `__cluster_metadata` topic
- Migration: must migrate to KRaft on Kafka 3.x (via `kafka-metadata.sh`) before upgrading to 4.0 (ZK support fully removed)

## Tiered Storage

- Hot tier: local broker disks (recent segments, actively consumed)
- Cold tier: object storage (S3/GCS/Azure Blob) for retention beyond local capacity
- Transparent to consumers -- fetch from either tier based on offset
- Configuration: `remote.storage.enable=true`, per-topic `local.retention.ms`
- Cost model: keep 1-7 days local, years in object storage

## Kafka Streams

- Library (not cluster) for stateful stream processing within JVM
- State stores: RocksDB-backed, changelog topics for fault tolerance
- Exactly-once within streams topology via `processing.guarantee=exactly_once_v2`
- Key patterns: windowed aggregation, joins (KTable-KStream, KTable-KTable), repartitioning
- Interactive queries: expose state store via REST for read-only access

## Kafka Connect

- Source connectors: CDC (Debezium), JDBC, file, cloud services
- Sink connectors: Elasticsearch, S3, JDBC, MongoDB
- Distributed mode: tasks distributed across Connect workers, auto-rebalance
- SMTs (Single Message Transforms): route, filter, mask, rename before sink
- Dead-letter topic for connector errors: `errors.deadletterqueue.topic.name`

## Consumer Groups

- One partition = one consumer within group (max parallelism = partition count)
- Cooperative rebalancing: only revoke partitions that move (no stop-the-world)
- Static membership: `group.instance.id` prevents rebalance on transient disconnects
- Lag monitoring: `kafka-consumer-groups.sh --describe --group <name>`
- Reset offsets: `--to-earliest`, `--to-datetime`, `--shift-by` for replay scenarios

## Operational Patterns

| Pattern | Implementation |
|---------|---------------|
| Compacted topic | `cleanup.policy=compact` -- latest value per key, ideal for state sync |
| Tombstone | Produce `null` value to delete key from compacted topic |
| Header-based routing | Route to specific consumers without deserializing body |
| Transactional outbox | Debezium CDC from outbox table -> Kafka topic |
| Fan-out | Multiple consumer groups on same topic, independent processing |

## Monitoring

- Consumer lag: `kafka_consumergroup_lag` (Burrow, kafka-exporter)
- Under-replicated partitions: cluster health indicator
- ISR shrink/expand: replication issues
- Request latency: produce/fetch p99
- Log directory size: disk pressure alerts

## Verification Checklist

- [ ] `acks=all` and `enable.idempotence=true` on all producers
- [ ] `enable.auto.commit=false` on all consumers
- [ ] Consumer lag alerting configured per group
- [ ] Compacted topics have appropriate `min.cleanable.dirty.ratio`
- [ ] Partition count matches expected consumer parallelism
- [ ] DLQ topic exists for each consumer group
- [ ] Schema Registry validates before produce (CI check)
