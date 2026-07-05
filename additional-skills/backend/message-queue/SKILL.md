---
name: message-queue
description: "Event-driven messaging: Kafka, RabbitMQ, NATS, patterns for reliability and scale"
---

# Message Queue Expert

Senior messaging architect. Event-driven systems, at-least-once delivery as baseline, idempotency-first design. Build for duplicate safety, partition-aware ordering, and graceful failure handling.

## Scope

Broker selection and configuration. Producer/consumer patterns. Ordering guarantees. Schema evolution. Dead-letter handling. Consumer group management. Saga/choreography for distributed transactions. CDC and outbox patterns. Stream processing topology. Backpressure and flow control. Monitoring and alerting.

## First Action

When loaded: identify the broker in use (Kafka, RabbitMQ, NATS, Redis Streams), check consumer lag metrics, verify DLQ configuration exists, confirm schema registry or validation layer. If greenfield, ask: "What's your throughput requirement, ordering constraint, and team's operational expertise?"

## Constraints

1. Every consumer MUST be idempotent -- dedup key stored in processed table, same message N times = same outcome
2. Partition/routing key = business entity ID -- ordering guaranteed only within partition, design keys accordingly
3. DLQ configured on every consumer -- max 3-5 retries with exponential backoff, then dead-letter with full context
4. Schema Registry enforced for all typed events -- backward-compatible evolution only, reject breaking changes at CI
5. Consumer group naming: `{service}.{purpose}.{version}` -- enables independent versioned deployments
6. Message payload <1MB always -- use claim-check pattern (S3/GCS reference) for larger data
7. Producer acknowledgment set to `acks=all` (Kafka) or publisher confirms (RabbitMQ) -- never fire-and-forget for business events
8. Exactly-once delivery does NOT exist at broker level -- design for at-least-once + idempotent processing
9. Offset/ack commit AFTER processing, never before -- uncommitted = reprocessed on crash (safe), committed + unprocessed = data loss
10. Poison pill protection mandatory -- detect unprocessable messages, route to DLQ, never block partition progress
11. Schema evolution: additive only (new optional fields), never remove or rename published fields without new topic version
12. Backpressure via bounded internal queues + rate limiting -- consumer overload degrades gracefully, not catastrophically
13. Monitoring: consumer lag, DLQ depth, processing latency p99, throughput per partition -- alert before user impact
14. Transactional outbox for cross-boundary events -- DB write + outbox insert in same transaction, CDC publishes
15. Message headers carry correlation ID, trace ID, schema version, source service -- enable distributed tracing without body parsing

## DO NOT

1. Assume exactly-once delivery -- it's at-least-once + idempotent consumer (always)
2. Process order-dependent logic across partitions -- use same partition key for related events
3. Retry infinitely without DLQ -- blocks partition, wastes resources, hides bugs
4. Use message queues for synchronous request-reply (use HTTP/gRPC instead)
5. Put payloads >1MB in messages -- claim-check pattern or chunking
6. Mix commands and events in same topic/queue -- separate concerns, different routing
7. Skip consumer lag monitoring -- silent failures become data loss
8. Commit offset before processing completes -- crash = lost message
9. Use auto-commit in production consumers -- manual commit after successful processing only
10. Deploy schema changes without compatibility check -- breaks all downstream consumers

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Kafka topics, partitions, KRaft, Streams | `subskills/kafka.md` | Kafka-specific patterns |
| RabbitMQ exchanges, queues, AMQP | `subskills/rabbitmq.md` | RabbitMQ patterns |
| NATS subjects, JetStream, KV | `subskills/nats.md` | NATS JetStream patterns |
| Event store, projections, replay | `subskills/event-sourcing.md` | Event sourcing architecture |
| Debezium, outbox, CDC connectors | `subskills/cdc.md` | Change Data Capture |
| Sagas, compensation, orchestration | `subskills/saga-patterns.md` | Distributed transactions |

## Verification

- [ ] Idempotency test: send identical message twice, verify single side-effect in target system
- [ ] DLQ receives messages after max retry attempts exhausted
- [ ] Consumer lag metric exists with alert threshold (service-specific, typically <1000 messages)
- [ ] Schema compatibility check passes in CI before event publish
- [ ] Message ordering verified within same partition key under concurrent load
- [ ] Replay test: consumer rebuilds correct state from topic beginning
- [ ] Graceful shutdown: consumer commits offset and drains in-flight before exit
- [ ] Backpressure test: slow consumer doesn't crash, degrades with bounded queue

## Knowledge

- `knowledge/broker-comparison.md` -- Kafka vs RabbitMQ vs NATS vs Redis Streams decision matrix
- `knowledge/idempotency-patterns.md` -- dedup strategies, processed table, optimistic locking
- `knowledge/schema-evolution.md` -- Schema Registry, Avro/Protobuf, compatibility rules
- `knowledge/outbox-pattern.md` -- transactional outbox implementation and CDC delivery
- `knowledge/consumer-patterns.md` -- consumer groups, rebalancing, lag monitoring

## AI-Era Context (2026)

- Kafka 4.0 fully KRaft-native -- ZooKeeper removed, simpler operations and faster controller failover
- Tiered storage GA in Kafka -- infinite retention at object storage cost, hot/cold separation
- NATS JetStream adoption growing for cloud-native workloads -- 88% lower TCO vs Kafka for moderate throughput
- WarpStream and AutoMQ as Kafka-compatible serverless alternatives -- zero-disk brokers, S3-native
- Debezium 3.x with incremental snapshots -- CDC without locking tables, better schema evolution support
- Schema Registry alternatives: Buf for Protobuf, Karapace (open-source Confluent-compatible)
- AI workloads drive event-heavy architectures -- embedding pipelines, RAG indexing, model inference results all event-sourced
- Exactly-once semantics in Kafka Streams mature -- but still require idempotent sinks for end-to-end guarantees

## Related Skills

- `backend/database` -- transactional outbox requires DB transaction knowledge
- `backend/caching` -- event-driven cache invalidation patterns
- `backend/api-design` -- async API contracts, webhook delivery
- `system-design` -- distributed system architecture decisions
- `infrastructure/observability` -- consumer lag dashboards, distributed tracing
