---
type: subskill
title: "Messaging: Message Queues & Event-Driven Patterns"
---

# Messaging: Message Queues & Event-Driven Patterns

Deep-dive reference for async communication between services.

## When to Use a Queue

- **Decouple** producers from consumers (independent deploy/scale).
- **Buffer spikes**  --  absorb bursts, consumers drain at their own pace.
- **Async processing**  --  return fast, do slow work later (emails, thumbnails, exports).
- **Cross-service communication**  --  event-driven microservices.

If you need a synchronous answer right now, use an API, not a queue.

## Delivery Guarantees

- **At-most-once**: fire-and-forget. May lose messages. Fine for metrics/telemetry.
- **At-least-once**: retries until acked. May duplicate → **consumer must be idempotent**. The common default.
- **Exactly-once**: no loss, no dupes. Kafka transactions / dedup. Expensive, limited scope  --  usually you fake it with at-least-once + idempotency.

## Broker Comparison

- **Kafka**: distributed append-only log. Partitions for parallelism, consumer groups, **retention-based** (replay possible), ordering per partition. Throughput king (**millions/sec**). Heavier ops. Use for streaming, event sourcing, high volume.
- **RabbitMQ**: traditional broker, flexible routing (exchanges, topics), ACK-based, per-message. Better for complex routing rules. Lower throughput (**~50K/sec**).
- **SQS**: fully managed, zero ops, standard (at-least-once) or FIFO (ordered, exactly-once-ish), built-in DLQ. Best for AWS-native, don't-want-to-manage.
- **NATS**: ultra-lightweight, low latency, pub/sub + request/reply. JetStream adds persistence. Great for internal service mesh messaging.

## Patterns

- **Pub/sub**: one event → many subscribers.
- **Work queue (competing consumers)**: one message → one of N workers. Scale by adding workers.
- **Request/reply**: async RPC via correlation ID + reply queue.
- **Event sourcing**: store state as sequence of events, rebuild by replay (Kafka shines).
- **Saga orchestration**: coordinate multi-service transactions with compensating actions on failure.

## Dead Letter Queue

**ALWAYS configure a DLQ.** Capture messages that fail after N retries, alert on DLQ depth, allow manual inspection/replay. Without it, poison messages either block the queue or vanish.

## Backpressure

- **Bounded queues**: reject/block when full instead of OOM.
- **Rate limit producers** when consumers fall behind.
- **Scale consumers** on lag (queue depth metric).
- **Circuit breaker** on downstream overload.

## Ordering

- **Kafka**: ordered within a partition  --  use a partition key (e.g., `user_id`) to keep related events ordered.
- **SQS FIFO**: ordering + dedup via MessageGroupId.
- **RabbitMQ**: order within a single queue/consumer only.

Global total ordering kills parallelism  --  order only where it matters.

## Idempotency (required for at-least-once)

- **Idempotency keys**: dedup by unique request ID.
- **Deduplication windows**: track seen IDs for a time window.
- **Upserts**: make writes naturally idempotent (`INSERT ... ON CONFLICT`).

## Anti-Patterns

- Using a queue as a database (querying/scanning it).
- No DLQ → lost or blocking poison messages.
- Unbounded queues → memory blowup, hidden lag.
- Ignoring consumer lag → silent backlog until it's a crisis.
