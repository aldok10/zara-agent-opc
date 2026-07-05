---
type: subskill
title: "NATS JetStream"
---

# NATS JetStream

Subject-based messaging with persistent stream storage. Single binary, zero-config clustering, low-latency. JetStream adds durability, exactly-once dedup window, KV store, and object store on top of core NATS.

## Core NATS vs JetStream

| Feature | Core NATS | JetStream |
|---------|-----------|-----------|
| Delivery | At-most-once (fire-and-forget) | At-least-once (ack-based) |
| Persistence | None | Stream storage (file/memory) |
| Replay | No | From any point in stream |
| Consumer tracking | No | Server-managed consumer state |
| Use case | Real-time pub/sub, request-reply | Event streaming, work queues |

## Subjects and Wildcards

```
orders.created         # Specific subject
orders.*               # Single token wildcard (orders.created, orders.shipped)
orders.>               # Multi-token wildcard (orders.created.eu, orders.shipped.us.west)
```

- Subject hierarchy enables fine-grained subscriptions without topic proliferation
- Streams capture subjects by filter: one stream can hold `orders.>` (all order events)
- Publish to specific subject, consume from stream with subject filter

## Stream Configuration

```json
{
  "name": "ORDERS",
  "subjects": ["orders.>"],
  "retention": "limits",
  "max_msgs": 10000000,
  "max_bytes": 10737418240,
  "max_age": 604800000000000,
  "storage": "file",
  "num_replicas": 3,
  "discard": "old",
  "duplicate_window": 120000000000
}
```

### Retention Policies
- **Limits**: discard old when max_msgs/max_bytes/max_age exceeded (default)
- **Interest**: delete once all consumers have acked
- **WorkQueue**: delete after single consumer acks (competing consumers)

### Storage Types
- **File**: persistent, survives restart (production default)
- **Memory**: faster, volatile (caching, ephemeral streams)

## Consumers

### Pull Consumers (Preferred)
```go
sub, _ := js.PullSubscribe("orders.created", "order-processor",
    nats.ManualAck(),
    nats.AckWait(30*time.Second),
    nats.MaxDeliver(5),
    nats.DeliverAll(),
)
msgs, _ := sub.Fetch(10, nats.MaxWait(5*time.Second))
for _, msg := range msgs {
    process(msg)
    msg.Ack()
}
```

### Push Consumers
- Server pushes messages to subscriber
- Use for simple pub/sub patterns where pull complexity isn't needed
- Flow control via `max_ack_pending` (backpressure)

### Consumer Configuration
- `durable_name`: survives disconnect, server tracks position
- `deliver_policy`: all, last, new, by_start_sequence, by_start_time
- `ack_policy`: explicit (manual), none (at-most-once), all (cumulative)
- `max_deliver`: max redelivery attempts before advisory (DLQ equivalent)
- `filter_subject`: consume subset of stream subjects

## Exactly-Once via Dedup

```go
// Producer sets Nats-Msg-Id header
msg := &nats.Msg{
    Subject: "orders.created",
    Data:    payload,
    Header:  nats.Header{"Nats-Msg-Id": []string{orderID}},
}
js.PublishMsg(msg)
```

- Server deduplicates within `duplicate_window` (default 2 minutes)
- Same `Nats-Msg-Id` within window = stored once
- Not true exactly-once end-to-end -- consumer side still needs idempotency
- Double-ack: `msg.AckSync()` ensures server received acknowledgment

## KV Store

- Built on JetStream streams (key = subject, value = message payload)
- Operations: `Put`, `Get`, `Delete`, `Watch`, `Keys`, `History`
- TTL per bucket, revision history, watchers for change notification
- Use for: configuration distribution, feature flags, lightweight state

```go
kv, _ := js.CreateKeyValue(&nats.KeyValueConfig{
    Bucket:  "config",
    TTL:     24 * time.Hour,
    History: 5,
})
kv.Put("feature.dark-mode", []byte("enabled"))
entry, _ := kv.Get("feature.dark-mode")
```

## Object Store

- Large binary objects stored in JetStream (chunked, checksummed)
- Operations: `Put`, `Get`, `Delete`, `List`, `Watch`
- Use for: file distribution, model weights, large config blobs
- Alternative to S3 for cluster-local object sharing

## Clustering

- RAFT-based consensus for JetStream metadata and stream replication
- Minimum 3 nodes for fault tolerance (odd numbers preferred)
- Super-cluster: gateway connections between clusters (geo-distribution)
- Leaf nodes: edge/IoT connections that bridge to cluster
- No external dependencies (no ZooKeeper, no etcd)

## Monitoring

- `$SYS.>` subjects for system events and metrics
- Stream: message count, bytes, consumer count, first/last sequence
- Consumer: num_pending, num_ack_pending, num_redelivered
- Connection: RTT, in/out messages/bytes, subscriptions
- Tools: `nats` CLI, Prometheus exporter, Grafana dashboards

## Operational Patterns

| Pattern | Implementation |
|---------|---------------|
| Work queue | WorkQueue retention + pull consumers (competing) |
| Fan-out | Multiple consumers on same stream, each with own position |
| Request-reply | Core NATS `Request()` with timeout (not JetStream) |
| Dead letter | Max deliver exceeded -> advisory subject -> DLQ stream |
| Event sourcing | Stream per aggregate type, replay from sequence 0 |

## Verification Checklist

- [ ] JetStream enabled with file storage for production streams
- [ ] Replication factor >= 3 for critical streams
- [ ] Pull consumers with manual ack for all business processing
- [ ] `Nats-Msg-Id` set on producers for dedup window protection
- [ ] Max deliver configured with advisory monitoring (DLQ equivalent)
- [ ] Consumer lag: `num_pending` metric alerted
- [ ] Graceful drain on shutdown: `conn.Drain()` before exit
