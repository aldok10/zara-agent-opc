# Consumer Patterns

Consumer group management, rebalancing strategies, offset handling, and lag monitoring. Patterns that apply across Kafka, RabbitMQ, NATS, and Redis Streams with broker-specific notes.

## Consumer Groups

### Concept
- Multiple consumers in a group share work (each message processed by ONE consumer in group)
- Multiple groups on same topic = independent processing (fan-out)
- Parallelism limited by partition/queue count (Kafka: max consumers = partitions)

### Naming Convention
```
{service}.{purpose}.{version}
order-service.process-payments.v2
analytics-service.user-events.v1
```

Version suffix enables parallel consumer groups during migration (v1 + v2 both active).

## Rebalancing (Kafka-Specific)

### Eager Rebalance (Legacy)
- All consumers stop, revoke all partitions, reassign from scratch
- Causes: consumer join/leave, crash, poll timeout
- Problem: stop-the-world, all consumers paused during rebalance

### Cooperative Sticky (Recommended)
```
partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor
```
- Only revokes partitions that need to move
- Other consumers continue processing unaffected partitions
- Two-phase rebalance: revoke -> rejoin -> assign (no full stop)

### Static Membership
```
group.instance.id=consumer-pod-1    # Unique per consumer instance
session.timeout.ms=300000           # Long timeout (5 min)
```
- Consumer identified by instance ID (not member ID)
- Transient disconnects don't trigger rebalance (within session timeout)
- Best for: Kubernetes pods with stable identity (StatefulSet), rolling deploys

### Rebalance Triggers
| Trigger | Mitigation |
|---------|-----------|
| Consumer crash | Static membership + long session timeout |
| Slow consumer (poll timeout) | Increase `max.poll.interval.ms`, reduce `max.poll.records` |
| New consumer joins | Cooperative sticky minimizes disruption |
| Network partition | Increase `session.timeout.ms` (trade detection speed for stability) |

## Offset Management

### Manual Commit (Recommended)
```
1. Poll batch of messages
2. Process all messages in batch
3. Commit offset of last processed message
4. Guarantee: crash before commit = reprocess batch (safe with idempotency)
```

### Commit Strategies
| Strategy | Trade-off |
|----------|-----------|
| Commit after each message | Lowest reprocessing, highest commit overhead |
| Commit after batch | Balanced (reprocess batch on crash) |
| Commit async | Highest throughput, may lose commit on crash |
| Commit within transaction | Exactly-once within Kafka (EOS) |

### Offset Reset Policy
- `earliest`: process all messages from beginning (safe, may be slow on first start)
- `latest`: skip to current position (lose messages published while consumer was down)
- `none`: fail if no committed offset (explicit: force human decision)

## Lag Monitoring

### What is Lag
```
Lag = Latest offset in partition - Consumer's committed offset
```
High lag = consumer falling behind. Growing lag = consumer slower than production rate.

### Monitoring Tools
| Tool | Broker | Notes |
|------|--------|-------|
| Burrow (LinkedIn) | Kafka | Consumer lag evaluation with status (OK/WARN/ERR) |
| kafka-exporter | Kafka | Prometheus metrics for lag per group/topic/partition |
| `kafka-consumer-groups.sh` | Kafka | CLI: `--describe --group <name>` shows lag per partition |
| RabbitMQ Management API | RabbitMQ | Queue depth = "lag" equivalent |
| `nats consumer info` | NATS | `num_pending` = unconsumed messages |
| `XPENDING` | Redis Streams | Pending entries per consumer |

### Alert Thresholds
```yaml
# Example alerting rules
- alert: ConsumerLagHigh
  condition: kafka_consumergroup_lag > 10000
  for: 5m
  severity: warning

- alert: ConsumerLagCritical
  condition: kafka_consumergroup_lag > 100000
  for: 2m
  severity: critical

- alert: ConsumerLagGrowing
  condition: rate(kafka_consumergroup_lag[5m]) > 0
  for: 15m
  severity: warning
```

## Backpressure Patterns

### Bounded Internal Queue
```
Broker -> [bounded channel/queue (size: 100)] -> worker pool
If channel full: stop polling (backpressure to broker)
```

### Rate Limiting
- Token bucket per consumer: max N messages/second
- Prevents overwhelming downstream dependencies
- Spills to broker (lag increases temporarily, drains when downstream recovers)

### Prefetch/QoS
- RabbitMQ: `basicQos(prefetch=20)` -- max 20 unacked messages per consumer
- Prevents single fast consumer from grabbing all messages
- Tune: higher prefetch = better throughput, lower = fairer distribution

## Graceful Shutdown

```
1. Stop polling (no new messages)
2. Finish processing in-flight messages
3. Commit final offsets
4. Close connections
5. Exit
```

### Kubernetes Integration
```yaml
terminationGracePeriodSeconds: 60  # Enough time to drain in-flight
lifecycle:
  preStop:
    exec:
      command: ["/bin/sh", "-c", "sleep 5"]  # Allow deregistration to propagate
```

## Dead Letter Handling

### DLQ Consumer Pattern
```
1. Main consumer: process message
2. On failure: increment retry count (header or external counter)
3. If retries < max: requeue with backoff delay
4. If retries >= max: publish to DLQ topic/queue
5. DLQ consumer: log, alert, store for investigation
6. Manual replay: operator reviews + replays from DLQ
```

### DLQ Message Enrichment
- Original topic/queue, partition, offset
- Error message and stack trace
- Retry count and timestamps
- Correlation ID for tracing

## Verification Checklist

- [ ] Consumer group naming follows convention (service.purpose.version)
- [ ] Cooperative sticky assignor configured (Kafka)
- [ ] Manual commit after processing (no auto-commit)
- [ ] Lag monitoring with alerts per consumer group
- [ ] Graceful shutdown drains in-flight before exit
- [ ] DLQ configured with max retry limit
- [ ] Static membership for Kubernetes deployments
- [ ] Backpressure mechanism prevents downstream overload
