---
type: fact
title: "Communication Patterns"
---

# Communication Patterns

How services talk to each other. Choice between sync and async shapes the entire architecture.

## Synchronous (Request-Response)

Caller sends request, waits for response. Simple but creates temporal coupling.

### HTTP/REST

- Ubiquitous, well-understood, great tooling.
- Use for: queries, CRUD operations, public APIs.
- Downsides: serialization overhead, less efficient than binary, no streaming.
- Versioning: URL path (`/v2/orders`) or header (`Accept: application/vnd.api.v2+json`).

### gRPC

- Binary protocol (protobuf), strongly typed, code generation.
- Use for: internal service-to-service, high throughput, streaming.
- Supports: unary, server-streaming, client-streaming, bidirectional.
- Downsides: harder to debug (binary), requires HTTP/2, protobuf toolchain.

### When to Use Sync

- Caller needs immediate response (user-facing queries).
- Simple request-response semantics.
- <=2 hops (avoid synchronous chains).
- Acceptable to fail if downstream is down.

## Asynchronous (Event-Driven)

Caller publishes message, doesn't wait. Decouples services in time and availability.

### Events (Notification)

Something happened. Publisher doesn't know or care who listens.

```
OrderPlaced { order_id, customer_id, total, items[], timestamp }
```

- Pub/sub topology (Kafka, NATS, RabbitMQ fanout)
- Multiple consumers, each processes independently
- Publisher is never blocked by consumer speed

### Commands (Directed)

Instruction to do something. Sent to specific service.

```
ProcessPayment { order_id, amount, currency, payment_method }
```

- Point-to-point topology (queue with single consumer group)
- Exactly-one consumer processes each command
- Sender expects eventual completion (may check status later)

### When to Use Async

- Caller doesn't need immediate response.
- Multiple services need to react to same event.
- Operations are long-running (minutes+).
- Services should be decoupled in availability.
- Need durability (message survives sender crash).

## Patterns

### Request-Reply (Async)

Async request with correlation ID. Response comes back on reply channel.

```
1. Service A sends command with correlation_id + reply_to topic
2. Service B processes, publishes result to reply_to with same correlation_id
3. Service A correlates response to original request
```

Use when: need async decoupling but also need response (e.g., saga step result).

### Fire-and-Forget

Publish event, never check result. Simplest async pattern.

```
Service A: publish OrderPlaced
Service A: continues immediately (doesn't track result)
Consumers: process independently, handle their own errors
```

Use when: downstream processing is independent and eventual.

### Event-Carried State Transfer

Events carry enough data that consumers don't need to call back.

```
// Bad: consumer needs to call back for details
OrderPlaced { order_id }

// Good: consumer has what it needs
OrderPlaced { order_id, customer_id, items[], total, shipping_address }
```

Reduces coupling at cost of larger events and potential data staleness.

### Transactional Outbox

Publish events reliably without distributed transactions.

```
1. Write to DB and outbox table in same transaction
2. Background process reads outbox, publishes to broker
3. Mark outbox entry as published
4. Guarantees at-least-once delivery
```

Alternative: Change Data Capture (CDC)  -  Debezium reads DB transaction log, publishes events.

## Message Broker Selection

| Broker | Strengths | Use When |
|--------|-----------|----------|
| Kafka | Ordering, replay, high throughput, log compaction | Event sourcing, high volume, need replay |
| RabbitMQ | Routing, priority queues, per-message TTL | Task queues, complex routing, lower volume |
| NATS | Simplicity, low latency, JetStream for durability | Real-time, IoT, request-reply patterns |
| SQS/SNS | Managed, no ops | AWS-native, simple pub/sub, moderate scale |

## Anti-Patterns

- **Sync chains >2 hops**: availability = A1 * A2 * A3. Latency = L1 + L2 + L3.
- **Async for queries**: user is waiting for data. Use sync.
- **Event soup**: too many fine-grained events. Group related state changes.
- **Missing idempotency**: async = at-least-once. Consumers must handle duplicates.
- **Temporal coupling via sync**: if downstream is down, caller fails. Use async if acceptable.
