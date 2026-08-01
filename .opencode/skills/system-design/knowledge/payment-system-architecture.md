---
type: reference
title: Payment System Architecture
---

# Payment System Architecture

## Core Payment Flow

```
User clicks "Buy"
  → Payment Event generated
  → Payment Service stores event in DB
  → Payment Executor per payment order (multi-seller checkout)
  → External PSP (credit card processing)
  → Wallet Service (update seller balance)
  → Ledger Service (double-entry bookkeeping)
  → Settlement (end-of-day batch files from PSP/banks)
```

## Key Components

- **Payment Service**: orchestrates the flow, stores events, handles retries
- **Payment Executor**: processes individual payment orders, calls PSP
- **Wallet Service**: maintains account balances (hotspot-prone)
- **Ledger Service**: append-only double-entry records (audit trail)
- **PSP (Payment Service Provider)**: external gateway (Stripe, PayPal, etc.)
- **Settlement**: nightly batch reconciliation with PSP/banks

## Idempotency

Without idempotency, retries cause double charges.

- **Idempotency key**: unique per request (UUID), passed to PSP
- **Storage**: persist idempotency records until settlement confirmed
- **State machine**: INITIATED -> PROCESSING -> COMPLETED / FAILED / REFUNDED
- **PSP idempotency**: most PSPs support idempotency keys for 24-72h
- **Scope**: per operation (authorization, capture, refund)

## Reconciliation

Reconciliation compares records across: ecommerce orders, PSP transactions, ledger entries, bank statements.

Pain points:
- **Data normalization**: timestamps, currency formats differ across systems
- **Massive volume**: batch processing (Hadoop/Spark) for end-of-day, streaming (Flink) for near-real-time
- **Cut-off time**: records near midnight may fall in different batches -> temporary breaks
- **Exactly-once != safe**: network failures, partial retries, timeouts create discrepancies

Solutions:
- Transform layer for format normalization
- Temporary break categorization (re-check next batch window)
- Streaming reconciliation for critical paths

## Settlement

- **Netting**: mutual offset transactions are netted to reduce total transfers
- **Clearing files**: PSP sends batch files with all day's transactions
- **Settlement window**: T+1 to T+3 depending on payment method
- **Funding**: actual bank transfer after clearing confirmation

## Related Topics

- Hotspot accounts (concurrent balance updates at scale)
- Payment message formats: ISO 8583, ISO 20022, FIX (trading-specific)
- Double payment prevention (idempotency + reconciliation)
- Payment system security: PCI-DSS, tokenization, 3D Secure
