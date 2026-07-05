---
type: tool
title: "Dead Letter Queue Design"
---

# Dead Letter Queue Design

## Purpose

Design dead letter queue strategy including retry policies, alerting thresholds, and reprocessing workflows. Ensures failed messages are not lost and can be diagnosed and recovered systematically.

## When to Use

- Setting up error handling for message consumers
- Designing retry and backoff policies
- Building reprocessing pipelines for failed messages
- Choosing between DLQ per topic vs shared DLQ
- Troubleshooting message processing failures at scale

## Prompt Template

```
CONTEXT:
- Message broker: [RabbitMQ | Kafka | SQS | Azure Service Bus | GCP Pub/Sub]
- Consumer type: [stateless processor | saga orchestrator | event handler]
- Message volume: [messages/second]
- Failure rate: [expected percentage of failures]
- Failure types: [transient (network) | poison (bad data) | dependency (downstream)]
- Ordering requirement: [strict | partition-level | none]
- Retention requirement: [hours | days | indefinite]

DESIGN DECISIONS:
1. Retry policy
   - Immediate retries: [count before delay]
   - Backoff strategy: [fixed | exponential | exponential with jitter]
   - Max retry count: [before DLQ routing]
   - Retry delay caps: [maximum wait time]

2. DLQ topology
   - Per-topic DLQ vs shared DLQ
   - Naming convention: [original-topic].dlq
   - Partitioning strategy (mirror source or single partition)
   - TTL on DLQ messages

3. Message enrichment
   - Original topic/queue
   - Failure reason and stack trace
   - Retry count and timestamps
   - Consumer instance ID
   - Correlation/trace ID

4. Reprocessing workflow
   - Manual replay (admin tool)
   - Automated replay (after fix deployed)
   - Selective replay (filter by error type)
   - Ordering preservation during replay
   - Idempotency guarantees on replay

5. Alerting
   - DLQ depth threshold
   - Rate of new DLQ messages
   - Age of oldest unprocessed DLQ message
   - Error type clustering

6. Poison message handling
   - Detection (same message fails N times)
   - Quarantine vs discard policy
   - Manual review queue
   - Schema validation before processing

ANTI-PATTERNS:
- Infinite retry without backoff (thundering herd)
- DLQ without monitoring (silent data loss)
- Replaying without idempotency
- Mixing transient and permanent failures in same retry path
```

## Output Format

```
## DLQ Strategy: [system/topic name]

### Retry Policy
| Attempt | Delay | Action |
|---------|-------|--------|
| 1-3 | immediate | retry in-process |
| 4-6 | exponential (1s, 4s, 16s) | retry via delay queue |
| 7+ | - | route to DLQ |

### DLQ Topology
[Diagram: source topic -> consumer -> retry topic -> DLQ]

### Message Schema (DLQ)
[Fields stored with each dead letter]

### Reprocessing Runbook
1. [Diagnose: query DLQ by error type]
2. [Fix: deploy code/config change]
3. [Replay: command/tool to reprocess]
4. [Verify: confirm successful processing]

### Alerting Rules
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| ... | ... | ... | ... |

### Monitoring Dashboard
- [Key metrics to display]
```
