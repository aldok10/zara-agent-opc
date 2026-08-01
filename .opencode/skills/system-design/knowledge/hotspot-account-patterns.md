---
type: reference
title: Hotspot Account Patterns
---

# Hotspot Account Patterns

## Problem

A hotspot account receives a large number of concurrent operations on a single row.

Examples:
- Merchant Nike during Prime Day promotion -- thousands of purchases per minute
- Trading margin account during market open -- hundreds of position updates per second
- Creator account during viral moment -- concurrent withdrawal requests
- Wallet service: single balance row updated by many concurrent transactions

In normal operation, row locks serialize updates to the balance. At high concurrency, this becomes the system bottleneck -- throughput drops, latency spikes, and timeouts cascade.

## Solution 1: Rate Limiting

Limit requests within a time window. Remaining requests get rejected or retried later.

Pros:
- Simple to implement
- Protects database from overload

Cons:
- Bad user experience for legitimate users
- Lost revenue during peak events

## Solution 2: Split Balance into Sub-Accounts

Partition the merchant's balance into N sub-accounts. Each update request locks only one sub-account.

- Each sub-account has its own balance row
- Routing: hash(merchant_id, order_id) % N to pick sub-account
- Total balance = SUM of all sub-account balances
- Sub-accounts periodical for read queries

Design considerations:
- N must be large enough to avoid contention but small enough to manage
- Sub-account distribution: via consistent hashing for even distribution
- Balance query: aggregate all sub-accounts (adds read overhead)
- Reconciliation: each sub-account reconciled independently

## Solution 3: Cache-First Balance Update

Update balance in cache synchronously, persist to DB asynchronously.

Flow:
1. Update balance in Redis/Memcached (atomic INCR/DECR)
2. Enqueue async job to persist to database
3. On read: serve from cache (fast) or fallback to DB

Pros:
- Cache handles 10-100x throughput of database
- Low latency for users
- Async persistence avoids lock contention

Cons:
- Cache failure = potential data loss (mitigate with WAL or dual-write)
- Eventual consistency between cache and DB
- Need reconciliation cron to detect/correct drift

## Comparison

| Approach | Throughput | Complexity | Consistency | Best For |
|----------|-----------|------------|-------------|----------|
| Rate limit | Fixed cap | Low | Strong | Simple cases, compliance |
| Sub-accounts | 10-100x | Medium | Strong | High-volume merchants, trading accounts |
| Cache-first | 100-1000x | High | Eventual | Peak traffic, promotional events |

## Related Patterns

- **Read replica pattern**: separate read/write paths for balance queries
- **Pessimistic vs optimistic locking**: tradeoff between throughput and conflict rate
- **Event sourcing**: ledger as source of truth, balance as derived state
- **Distributed lock**: coordinate balance updates across services (use sparingly -- bottleneck)
