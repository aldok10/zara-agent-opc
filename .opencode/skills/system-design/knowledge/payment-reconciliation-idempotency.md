---
type: reference
title: Payment Reconciliation and Idempotency
---

# Payment Reconciliation and Idempotency

## Reconciliation: Why It Exists

Reconciliation compares records across systems to ensure amounts match. Even with exactly-once semantics, discrepancies happen because:

- Network failures cause partial writes
- PSP timeouts mean the payment succeeded but the response was lost
- Cut-off time misalignment between systems (23:59:55 in internal vs 00:00:30 in external)
- Different systems have different clock skews
- Human errors during manual adjustments

Reconciliation is the safety net. Without it, discrepancies go undetected.

## Reconciliation Pain Points

### 1. Data Normalization
Records come in different formats across systems:
- Timestamps: "2022/01/01" vs "Jan 1, 2022" vs epoch
- Currency codes: "USD" vs "840" vs "$"
- Amounts: with/without decimals, different rounding

Solution: transformation layer between systems. Normalize to canonical format before comparison.

### 2. Massive Data Volume
Processing millions of records daily requires scalable comparison.

- End-of-day batch: Hadoop/Spark for large-scale comparison (cheap, T+1)
- Near-real-time: Flink/Kafka Streams for critical paths (expensive, low latency)
- Incremental reconciliation: compare only changes since last run

### 3. Cut-Off Time Issues
Records near midnight (23:59:xx) may be stamped in different days.

Solution: categorize as "temporary break" and re-check against next batch. If found in next day's records, auto-cleared.

### 4. Partial Matches
Amount matches but metadata differs (different order ID, wrong fee deducted, currency conversion discrepancy).

Solution: rule engine for match levels (exact, fuzzy, manual review needed).

## Idempotency

Idempotency ensures retries don't cause double charges.

### Design Principles
- **Idempotency key**: unique per operation (V4 UUID or business key)
- **Storage**: persist key with status until settlement confirmed
- **TTL**: match PSP's idempotency window (typically 24-72 hours)
- **Scope**: per operation type (authorize, capture, refund, cancel)

### Granularity Options
| Level | Key Example | Risk |
|-------|------------|------|
| Per request | UUID per HTTP request | Same payment retried = duplicate |
| Per payment | payment_id + operation | Better, covers network retry |
| Per idempotency_id | Explicit client-provided key | Most flexible, shifts responsibility |

### State Machine
```
INITIATED -> PROCESSING -> COMPLETED
                         -> FAILED (retryable)
                         -> FAILED (terminal: insufficient funds, fraud)
COMPLETED -> REFUNDED
          -> PARTIALLY_REFUNDED
          -> CHARGEBACK
```

## Ledger: Double-Entry Bookkeeping

Every transaction debits one account and credits another. The ledger is append-only -- never update or delete rows.

```
Buyer account: -$200
Seller account: +$200
Platform fee account: +$5  (if platform takes cut)
```

Ledger is the source of truth for reconciliation. Wallet balances are derived from ledger state.

## Related Topics

- Payment system architecture (core flow)
- Hotspot accounts (concurrent balance updates)
- Double payment prevention (idempotency patterns)
- Event sourcing ledger patterns (ledger as event stream)
- Settlement (end-of-day batch netting)
