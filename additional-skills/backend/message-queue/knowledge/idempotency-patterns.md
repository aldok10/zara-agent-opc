---
type: fact
title: "Idempotency Patterns"
---

# Idempotency Patterns

Strategies to ensure processing a message multiple times produces the same result as processing it once. Required because all message brokers deliver at-least-once under failure scenarios.

## Why Always Idempotent

- Broker redelivers on: consumer crash, timeout, network partition, rebalance
- Producer retries create duplicates at broker level (even with idempotent producer, consumer still gets redelivered)
- Replay scenarios intentionally redeliver historical messages
- No broker guarantees exactly-once delivery end-to-end to external systems

## Strategy 1: Message ID Dedup Table

Store processed message IDs; skip duplicates on re-receipt.

```sql
CREATE TABLE processed_messages (
    message_id    VARCHAR(255) PRIMARY KEY,
    processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumer_group VARCHAR(128) NOT NULL
);

-- Cleanup old entries (retention window)
CREATE INDEX idx_processed_at ON processed_messages (processed_at);
```

### Processing Flow
```
1. Receive message with ID
2. BEGIN transaction
3. INSERT INTO processed_messages (message_id, consumer_group) VALUES (?, ?)
   ON CONFLICT DO NOTHING
4. Check rows affected: 0 = duplicate, skip; 1 = new, process
5. Execute business logic within same transaction
6. COMMIT
7. ACK message
```

### Pros/Cons
- Simple, universal, works with any broker
- Requires storage (DB table), grows with throughput
- Cleanup: delete entries older than max redelivery window (e.g., 7 days)

## Strategy 2: Idempotency Key (Business-Level)

Use natural business identifiers instead of message IDs.

```sql
-- Order payment: idempotency key = order_id + payment_attempt
CREATE UNIQUE INDEX idx_payments_idempotency 
    ON payments (order_id, attempt_number);

-- INSERT fails on duplicate = already processed
INSERT INTO payments (order_id, attempt_number, amount, status)
VALUES ($1, $2, $3, 'completed');
```

### When to Use
- Business entity has natural unique constraint
- Idempotency key derivable from message content (no external state needed)
- Examples: `order_id`, `payment_id + attempt`, `user_id + action + date`

## Strategy 3: Optimistic Locking (Version-Based)

Use entity version to detect concurrent/duplicate processing.

```sql
UPDATE orders 
SET status = 'shipped', version = version + 1
WHERE order_id = $1 AND version = $2;
-- Rows affected = 0: version mismatch, already processed or concurrent update
```

### Flow
```
1. Message contains: entity_id, expected_version, new_state
2. UPDATE with WHERE version = expected_version
3. Rows affected = 0: skip (already applied or conflict)
4. Rows affected = 1: success, ACK message
```

### Best For
- State transitions (status machines)
- Event sourcing (expected version on append)
- Concurrent consumers on same entity (last-writer detection)

## Strategy 4: Conditional Write (Upsert)

Make the write operation itself idempotent via upsert semantics.

```sql
-- Upsert: same input always produces same result
INSERT INTO user_preferences (user_id, theme, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (user_id) 
DO UPDATE SET theme = EXCLUDED.theme, updated_at = EXCLUDED.updated_at;
```

### When to Use
- Final state overwrites (latest value wins)
- No side effects beyond DB write
- Acceptable to re-apply same state

## Strategy 5: Outbox + Processed in Same Transaction

Combine processing + dedup + outbox in single transaction for full guarantees.

```sql
BEGIN;
-- Dedup check
INSERT INTO processed_messages (message_id, consumer_group)
VALUES ($1, $2) ON CONFLICT DO NOTHING;
-- If inserted (not duplicate):
INSERT INTO order_items (order_id, item_id, quantity) VALUES (...);
-- Outbox for downstream event
INSERT INTO outbox_events (aggregate_id, event_type, payload)
VALUES ($3, 'ItemAdded', $4);
COMMIT;
```

## Choosing a Strategy

| Scenario | Strategy |
|----------|----------|
| Generic consumer, any message type | Message ID dedup table |
| Business entity with natural key | Idempotency key (unique constraint) |
| State machine transitions | Optimistic locking (version check) |
| Latest-value-wins semantics | Conditional write (upsert) |
| Full transactional guarantee + downstream events | Outbox + processed table |

## Common Pitfalls

1. **Side effects outside transaction**: email sent before commit -- if TX rolls back, email already gone
2. **Time-based dedup**: timestamps aren't unique, clock skew breaks ordering
3. **In-memory dedup only**: process restart loses dedup state, allows duplicates
4. **Dedup window too short**: late redelivery after window = duplicate processed
5. **Ignoring partial processing**: crash mid-batch leaves some items processed, some not

## Verification

- [ ] Send same message twice in test: verify single side effect
- [ ] Simulate consumer crash after processing, before ACK: verify redelivery handled
- [ ] Load test with concurrent duplicates: no double-counting
- [ ] Dedup table cleanup job exists and runs (prevent unbounded growth)
- [ ] Side effects (email, webhook) protected by idempotency key at provider level
