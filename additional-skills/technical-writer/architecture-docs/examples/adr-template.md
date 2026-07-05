---
type: example
title: "4. Use Event Sourcing for Order Processing"
---

# 4. Use Event Sourcing for Order Processing

Date: 2026-03-15
Status: accepted

## Context

The order processing system handles 50K orders/day with complex state transitions (placed, confirmed, packed, shipped, delivered, returned). Current approach stores only the latest state in PostgreSQL, making it impossible to answer questions like "when was this order packed?" or replay events for debugging.

Business requirements:
- Full audit trail for compliance (financial regulations require 7-year history)
- Ability to rebuild read models when new reporting needs emerge
- Support for order state rollback when warehouse reports picking errors

Technical constraints:
- Team has experience with PostgreSQL and Kafka
- System must handle 200 orders/second at peak
- Read latency for order lookup must remain under 100ms

Options considered:
1. Event sourcing with Kafka + PostgreSQL projections
2. CDC (Change Data Capture) from PostgreSQL with Debezium
3. Audit log table alongside current state table

## Decision

We will use event sourcing for the order aggregate because it provides a complete audit trail, supports state rebuilding, and naturally models the order lifecycle as a sequence of domain events.

Events stored in PostgreSQL (append-only event table) with Kafka for event distribution to downstream consumers. Read models projected into separate PostgreSQL tables optimized for query patterns.

Scope: Order aggregate only. Other domains (users, inventory) remain CRUD until similar needs emerge.

## Consequences

**Positive:**
- Complete audit trail satisfies compliance requirement without additional tooling
- New read models can be built by replaying events -- no data migration needed
- Debugging production issues: replay event sequence to reproduce exact state
- Natural fit for order lifecycle (events map directly to business processes)

**Negative:**
- Increased complexity for developers new to event sourcing patterns
- Event schema evolution requires careful versioning (upcasting)
- Read model consistency is eventual (acceptable for this domain -- max 2 seconds)
- Storage growth: ~500 bytes/event * 50K orders/day * 7 years = ~60 GB/year

**Neutral:**
- Need to build event replay tooling for projection rebuilds
- Monitoring must track projection lag and event processing throughput
- On-call runbooks needed for projection rebuild scenarios
