---
name: streaming
description: "Stream processing: Kafka, Flink, exactly-once semantics, windowing, CDC with Debezium"
---

# Streaming Expert

Real-time data processing. Kafka for messaging, Flink for computation, Debezium for CDC, exactly-once guarantees.

## Scope

- Message brokers: Kafka, Redpanda, Pulsar
- Stream processors: Flink, Kafka Streams, Spark Structured Streaming
- Change Data Capture: Debezium, PostgreSQL logical replication
- Windowing: tumbling, sliding, session, event-time vs processing-time
- Exactly-once semantics, idempotent producers, transactional consumers
- Schema evolution with Schema Registry (Avro, Protobuf)
- Backpressure handling and consumer lag monitoring

## First Action

1. Identify existing messaging infrastructure (Kafka version, cluster topology)
2. Check schema registry and serialization format in use
3. Determine latency requirements (sub-second, seconds, minutes)
4. Map the event flow: producers, topics, consumers, sinks

## Constraints

1. Use Avro or Protobuf with Schema Registry for all production topics; never use plain JSON without schema enforcement.
2. Exactly-once semantics require idempotent producers + transactional consumers + sink idempotency; all three levels.
3. Event-time windowing over processing-time for correctness; include watermark strategy for late arrivals.
4. Consumer group lag must be monitored and alerted; define max acceptable lag per consumer.
5. Topic partitioning key must ensure ordering where required; hash on entity ID, not random.
6. CDC with Debezium: use outbox pattern for domain events; don't expose raw database change streams to consumers.
7. Dead letter queues required for all consumers; failed messages must not block processing.
8. Schema evolution must be backward-compatible (add fields with defaults, never remove or rename).
9. Flink checkpointing interval must balance latency vs recovery time; start at 30s, tune from metrics.
10. Consumer offset commits must happen after processing + sink write; never auto-commit offsets.
11. Retention policies must match reprocessing needs; default 7 days, critical topics 30+ days.
12. Use compacted topics for state/lookup data; not time-based retention.
13. Backpressure must propagate to producers via flow control; never drop messages silently.
14. Test stream processing with deterministic test harnesses (Flink MiniCluster, TopologyTestDriver).

## DO NOT

- Use auto-commit offsets in production consumers; it loses messages on failure
- Send large payloads (>1MB) through Kafka; use claim-check pattern with object storage
- Create topics without explicit partition count and replication factor
- Mix event types in a single topic without a discriminator field and separate deserialization
- Use stream processing for workloads that are naturally batch (daily aggregations on complete data)
- Ignore consumer rebalancing storms; use cooperative sticky assignor
- Deploy schema changes without compatibility check against Schema Registry
- Process events without handling out-of-order delivery
- Use Kafka as a database; it is a log, not a query engine

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| SQL on streams | `../sql` |
| Stream to warehouse sink | `../warehouse` |
| Pipeline triggering from streams | `../orchestration` |
| Stream data quality monitoring | `../quality` |
| Python stream consumers | `../python-data` |

## Verification

- End-to-end latency measured from event production to sink write (p50, p95, p99)
- Consumer lag stays below defined threshold under normal load
- Exactly-once verified: produce duplicate messages, confirm sink has no duplicates
- Late events handled correctly by watermark/allowed lateness configuration
- Schema evolution tested: new producer, old consumer still deserializes correctly
- Failure recovery: kill consumer, verify no data loss after restart from last committed offset

## Knowledge

- `knowledge/kafka.md` -- producers, consumers, partitioning, replication, KRaft
- `knowledge/flink.md` -- DataStream API, windowing, state backends, checkpointing
- `knowledge/debezium.md` -- connectors, outbox pattern, SMTs, snapshot modes
- `knowledge/schema-registry.md` -- compatibility modes, subject strategies, migration

## AI-Era Context (2026)

- Kafka 4.0 removes ZooKeeper entirely (KRaft-only); all new deployments are KRaft
- Flink 2.0: unified batch/stream API (DataStream v2), removed legacy DataSet API
- Redpanda as Kafka-compatible alternative with lower operational overhead; evaluate for new clusters
- Real-time ML feature stores (Tecton, Feast) consume directly from Kafka topics
- CDC pipelines increasingly replace batch ETL for operational analytics (sub-minute freshness)
- WarpStream and other Kafka-compatible serverless options eliminate broker management

## Related Skills

- `data-engineer/pipeline` -- batch vs stream pipeline decisions
- `data-engineer/quality` -- streaming data quality patterns
- `data-engineer/warehouse` -- real-time warehouse ingestion
- `system-design` -- event-driven architecture patterns
