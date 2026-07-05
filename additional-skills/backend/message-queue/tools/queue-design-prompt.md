---
type: tool
title: "Message Queue Architecture Design"
---

# Message Queue Architecture Design

## Purpose

Design message queue systems with correct ordering guarantees, idempotency handling, dead-letter queue strategy, and failure recovery. Covers Kafka, RabbitMQ, SQS, and NATS patterns.

## When to Use

- Designing async communication between services
- Choosing ordering guarantees and delivery semantics
- Implementing dead-letter queue and retry strategies
- Evaluating throughput, latency, and durability tradeoffs

## Prompt Template

```
CONTEXT:
- Broker: [Kafka | RabbitMQ | SQS/SNS | NATS | Pulsar]
- Use case: [event sourcing | task queue | pub/sub fanout | CQRS projections]
- Message type: [commands | events | queries]
- Volume: [messages/sec, peak vs sustained]
- Ordering requirement: [strict per-key | partition-level | none]
- Delivery semantics: [at-least-once | at-most-once | exactly-once]
- Consumer pattern: [competing consumers | consumer groups | single consumer]

DESIGN DECISIONS:
1. Ordering: partition key selection, impact of rebalancing,
   ordering vs parallelism tradeoff
2. Idempotency: deduplication strategy (idempotency key, upsert, dedup window),
   consumer-side vs broker-side
3. Dead-letter queue: DLQ routing conditions, max retries, exponential backoff,
   DLQ monitoring and reprocessing
4. Schema evolution: Avro/Protobuf with registry, backward/forward compatibility,
   versioned topics vs header routing
5. Back-pressure: consumer lag monitoring, auto-scaling triggers,
   circuit breaker on downstream failures
6. Failure handling: poison message detection, partial batch failure,
   transaction boundaries (Kafka transactions, outbox pattern)
7. Retention: time-based vs size-based, compaction for changelog topics
8. Observability: consumer lag metrics, processing latency, error rate alerting

IDENTIFY RISKS:
- Message ordering violations during scaling
- Duplicate processing after rebalance
- DLQ overflow without alerting
- Schema breaking changes
- Unbounded retry loops
```

## Output Format

```
## Queue Design: [system/flow name]

### Architecture
[Producer -> Topic/Queue -> Consumer Group diagram]

### Configuration
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Delivery  | ...   | ...       |
| Ordering  | ...   | ...       |
| Retention | ...   | ...       |
| DLQ       | ...   | ...       |

### Idempotency Strategy
- Key: [what makes a message unique]
- Dedup: [mechanism and window]
- Consumer: [how consumer handles duplicates]

### Failure & Recovery
| Scenario | Behavior | Recovery |
|----------|----------|----------|
| Consumer crash | ... | ... |
| Poison message | ... | ... |
| Broker failure | ... | ... |
```
