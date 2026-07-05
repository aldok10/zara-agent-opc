---
type: subskill
title: "RabbitMQ"
---

# RabbitMQ

AMQP 0-9-1 broker. Exchange-based routing, acknowledgments, quorum queues for replication, publisher confirms for reliability. Best for complex routing, moderate throughput, and request-reply patterns.

## Exchange Types

| Type | Routing | Use Case |
|------|---------|----------|
| Direct | Exact routing key match | Task queues, point-to-point |
| Topic | Wildcard routing (`*` one word, `#` zero+) | Event fan-out with filtering |
| Fanout | Broadcast to all bound queues | Notifications, cache invalidation |
| Headers | Match on message headers | Complex multi-attribute routing |

### Binding Patterns
```
# Topic exchange examples
order.created.eu    -> matches order.created.*
order.#             -> matches order.created.eu, order.shipped
*.created.*         -> matches order.created.eu, user.created.us
```

## Quorum Queues (Production Default)

- Raft-based replication across cluster nodes (replace classic mirrored queues)
- Configuration: `x-queue-type: quorum` on declaration
- Minimum 3 nodes for quorum (tolerates 1 failure)
- Poison message handling: built-in delivery limit (`x-delivery-limit`)
- Memory limit per queue: `x-max-in-memory-length` for large backlogs
- No priority support (use separate queues per priority level)

### When Classic Queues Still
- Temporary/exclusive queues (auto-delete on disconnect)
- Non-durable queues for transient data
- Lazy queues for very large backlogs (disk-first, replaced by quorum queue memory limits)

## Publisher Confirms

```
channel.confirmSelect();  // Enable confirm mode
channel.basicPublish(exchange, routingKey, props, body);
channel.waitForConfirms(timeout);  // Block until broker ACKs

// Async alternative (preferred for throughput)
channel.addConfirmListener(ackCallback, nackCallback);
```

- Mandatory flag: return unroutable messages (no matching queue)
- Persistent messages + quorum queue + publisher confirm = durable delivery chain
- Batch confirms: publish N messages, then `waitForConfirms()` (throughput vs latency tradeoff)

## Consumer Acknowledgments

- Manual ACK after processing: `channel.basicAck(deliveryTag, false)`
- NACK + requeue for transient failures: `channel.basicNack(tag, false, true)`
- NACK + no requeue for poison pills: routes to DLX if configured
- Prefetch (`basicQos`): limit unacked messages per consumer (flow control)
- Recommended prefetch: 10-50 for most workloads, tune based on processing time

## Dead Letter Exchange (DLX)

```json
{
  "x-dead-letter-exchange": "dlx.exchange",
  "x-dead-letter-routing-key": "dlq.orders",
  "x-message-ttl": 30000,
  "x-delivery-limit": 3
}
```

- Messages dead-lettered on: reject/nack without requeue, TTL expiry, queue length exceeded, delivery limit hit
- DLX headers preserve original exchange, routing key, and death reason
- Retry pattern: DLX -> wait queue (TTL) -> original queue (exponential backoff via multiple wait queues)

## Delayed Messages

### TTL + DLX Pattern (No Plugin)
1. Publish to delay queue with per-message TTL
2. Delay queue DLX points to target exchange
3. Message expires -> routes to target queue

### Delayed Message Exchange Plugin
- `x-delayed-type` exchange: holds messages until `x-delay` header expires
- Simpler but adds operational dependency (plugin management)
- Not suitable for high-volume delays (stores in Mnesia/ETS)

## Shovel and Federation

### Shovel
- Point-to-point message forwarding between clusters
- Source queue/exchange -> destination queue/exchange
- Dynamic shovel: API-managed, suitable for ops automation
- Use for: migration, geo-replication, hybrid cloud bridging

### Federation
- Exchange federation: messages replicated upstream -> downstream
- Queue federation: consumers can pull from remote queues
- Eventual consistency model (not synchronous replication)
- Use for: multi-DC active-active, edge -> central aggregation

## Monitoring

- Queue depth: messages ready + unacknowledged
- Consumer utilization: `consumer_utilisation` metric (1.0 = consumers keeping up)
- Connection/channel count: resource leak indicator
- Memory/disk alarms: flow control triggers
- Message rates: publish, deliver, ack, redeliver per queue

## Operational Patterns

| Pattern | Implementation |
|---------|---------------|
| Competing consumers | Multiple consumers on same queue, round-robin dispatch |
| Work queue priority | Separate queues per priority, consumer reads high-priority first |
| RPC | Reply-to queue + correlation ID, exclusive temp queue per client |
| Delayed retry | DLX chain with increasing TTL queues (1s, 5s, 30s, 5m) |
| Broadcast + selective | Fanout exchange + per-consumer queue with binding filter |

## Verification Checklist

- [ ] Publisher confirms enabled on all production publishers
- [ ] Quorum queues used for all durable workloads
- [ ] DLX configured on every queue with monitoring on DLQ depth
- [ ] Prefetch set (not unlimited) -- prevents memory explosion
- [ ] Manual ack mode (no auto-ack for business messages)
- [ ] Alarms: queue depth > threshold, consumer utilisation < 0.5
- [ ] Connection pool with heartbeat (prevent silent TCP death)
