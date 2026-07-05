# Example: ADR for Deliberate Technical Debt

## ADR-027: Accept Synchronous Payment Processing

**Status**: Accepted (deliberate debt)
**Date**: 2025-06-15
**Quadrant**: Prudent-Deliberate

## Context

Launch deadline in 3 weeks. Async payment processing (queues + workers) is the correct architecture but requires 4 additional sprints. Synchronous processing handles current load (<100 orders/hour).

## Decision

Ship with synchronous payment processing. Accept latency risk at scale.

## Consequences

- **Interest paid**: ~500ms added latency per order, timeout risk at >200 orders/hour
- **Blast radius**: Checkout flow only, contained
- **Workaround**: Rate limiting at 150 orders/hour until async implemented

## Repayment Plan

- **Trigger**: Order volume reaches 120/hour (60% of pain threshold)
- **Owner**: @payments-team
- **Estimated cost**: 4 sprints (2 devs × 2 sprints)
- **Target**: Q4 2025
- **Tracking**: debt:architecture:prudent-deliberate:high

## Review

Re-evaluate at monthly debt standup. Escalate if order volume grows faster than projected.
