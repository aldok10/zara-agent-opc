---
type: tool
title: "Exactly-Once Delivery Strategy Prompt"
---

# Exactly-Once Delivery Strategy Prompt

Use this prompt to design exactly-once processing semantics for streaming data systems.

## Prompt

```
You are a streaming data engineer designing exactly-once processing guarantees. Ensure no data loss and no duplicate processing across failures and restarts.

Input:
- System: [Kafka/Kinesis/Pulsar/Flink/Spark Streaming/custom]
- Source: [where data originates, delivery guarantee of source]
- Sink: [where data lands, idempotency support of sink]
- Processing: [stateless transforms / stateful aggregations / joins]
- Volume: [messages per second, message size]
- Failure modes: [what has failed before? network, OOM, consumer crash]
- Current guarantee: [at-most-once / at-least-once / unknown]

Design the exactly-once strategy covering:

1. IDEMPOTENCY AT THE SINK
   - Natural idempotency: is the operation naturally safe to repeat? (upsert, PUT)
   - Idempotency key: unique identifier per message (event_id, source_offset, hash)
   - Deduplication window: how long to remember processed IDs?
   - Storage for dedup state: in-memory (fast, lost on restart) vs persistent (slower, durable)
   - Conditional writes: use version columns or IF NOT EXISTS clauses

2. TRANSACTIONAL PROCESSING
   - Kafka transactions: produce + offset commit in single atomic transaction
   - Flink checkpointing: exactly-once with two-phase commit sinks
   - Database transactions: consume + write + offset store in single transaction
   - Outbox pattern: write to DB, publish from change log
   - Saga pattern: compensating actions for distributed transactions

3. OFFSET MANAGEMENT
   - Commit strategy: commit after processing (at-least-once base)
   - External offset store: store offsets in same transaction as output
   - Checkpoint interval: balance between latency and reprocessing on failure
   - Consumer group rebalance: handle partition reassignment without duplication
   - Seek-to-offset: how to restart from last committed position

4. DEDUPLICATION APPROACHES
   - Source-side dedup: producer assigns unique ID, consumer deduplicates
   - Sink-side dedup: upsert/merge on unique key at destination
   - Processing-side dedup: maintain seen-IDs set in state store
   - Time-window dedup: only check for duplicates within a time window
   - Bloom filter: probabilistic dedup for high-volume streams (acceptable false positive rate)

5. FAILURE & RECOVERY
   - Consumer crash: what happens to in-flight messages?
   - Network partition: can messages be produced to sink but offset not committed?
   - Zombie instances: fencing old consumers after rebalance
   - State recovery: how is processing state restored after restart?
   - Poison pill handling: messages that always fail (dead letter queue)

6. VERIFICATION
   - How to prove exactly-once is working?
   - Count reconciliation: source count == sink count over time window
   - Duplicate detection query: GROUP BY key HAVING count > 1
   - Chaos testing: kill consumers mid-batch, verify no duplicates or gaps
   - Monitoring: track reprocessed messages, dedup hits, transaction failures

Output format:
- Architecture diagram (text): source -> processing -> sink with guarantee at each hop
- Idempotency design: key format, storage, TTL
- Transaction boundaries: what is atomic together
- Failure matrix: failure mode | behavior | recovery | data impact
- Configuration: specific settings for the chosen streaming platform
- Verification plan: tests to run, metrics to monitor
- Known limitations: where exactly-once degrades to at-least-once
```
