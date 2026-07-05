---
type: example
title: "Test Plan for New Microservice"
---

# Test Plan for New Microservice (Risk-Based Approach)

## Context
When launching a new service that handles payment processing. This template prioritizes test effort based on business risk, failure probability, and impact—not uniform coverage across all components.

## Code/Template

```markdown
# Test Plan: Payment Notification Service

## 1. Service Overview
| Field | Value |
|-------|-------|
| Service | payment-notification-service |
| Owner | Payments Team |
| Dependencies | Stripe API, PostgreSQL, SQS, Email Provider |
| SLA | 99.95% uptime, <500ms p99 latency |
| Data Classification | PCI-DSS Scope (card tokens, amounts) |

## 2. Risk Assessment Matrix

| Component | Impact | Likelihood | Risk Score | Test Priority |
|-----------|--------|------------|------------|---------------|
| Payment webhook processing | Critical | Medium | HIGH | P0 |
| Idempotency handling | Critical | High | HIGH | P0 |
| Email delivery | Medium | Medium | MEDIUM | P1 |
| Rate limiting | High | Low | MEDIUM | P1 |
| Health check endpoint | Low | Low | LOW | P2 |
| Admin dashboard | Low | Low | LOW | P2 |

## 3. Test Strategy by Layer

### Unit Tests (Target: 90% coverage on P0 components)
- Webhook signature validation (all edge cases)
- Payment state machine transitions
- Idempotency key generation and dedup logic
- Amount calculation and currency conversion
- Input validation for all API endpoints

### Integration Tests (Focus: external boundaries)
- PostgreSQL: transaction isolation, deadlock recovery
- SQS: message publish/consume, DLQ routing, retry behavior
- Stripe: webhook payload parsing (use recorded fixtures)
- Email provider: template rendering, delivery confirmation

### Contract Tests (Pact)
- Consumer: Dashboard -> Notification API
- Provider: Notification API -> Email Service
- Provider: Notification API -> Audit Service

### E2E Tests (Critical paths only)
- Happy path: payment_intent.succeeded -> notification sent -> status updated
- Failure path: webhook retry after transient DB failure
- Idempotency: duplicate webhook -> single notification

### Performance Tests (k6)
- Sustained load: 500 req/s for 10 minutes
- Spike: 0 -> 2000 req/s in 30 seconds
- Soak: 100 req/s for 4 hours (memory leak detection)

### Security Tests
- Webhook signature bypass attempts
- SQL injection on search endpoints
- Authorization: cross-tenant data access
- Rate limit bypass via header manipulation

## 4. Test Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| Local (Docker Compose) | Unit + Integration | Seeded fixtures |
| Staging | E2E + Contract | Synthetic PCI-safe data |
| Perf | Load tests | Generated volume data |
| Prod (canary) | Smoke tests | Real traffic (1% canary) |

## 5. Entry/Exit Criteria

### Entry (Ready to Test)
- [ ] All P0 unit tests passing
- [ ] Docker Compose environment boots cleanly
- [ ] Test data seeding automated
- [ ] Monitoring dashboards deployed

### Exit (Ready to Ship)
- [ ] P0 components: >90% mutation score
- [ ] P1 components: >80% line coverage
- [ ] Zero critical/high security findings
- [ ] Performance: p99 < 500ms at 500 req/s
- [ ] Contract tests green for all consumers
- [ ] Runbook reviewed and tested
- [ ] Rollback procedure validated

## 6. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Stripe sandbox rate limits | Cache webhook fixtures, mock for unit tests |
| Flaky E2E from email delivery | Assert on queue publish, not email receipt |
| PCI data in test logs | Scrub card data in test fixtures, audit log output |
| Clock drift in idempotency | Test with mocked time, not real clocks |

## 7. Schedule

| Week | Focus | Exit Gate |
|------|-------|-----------|
| 1 | Unit tests + integration setup | All P0 units green |
| 2 | Integration + contract tests | External boundaries verified |
| 3 | E2E + performance | Load test passes SLA |
| 4 | Security + chaos | Pen test clean, failover tested |
```

## Key Points
- Risk score drives test investment: spend 80% of effort on the 20% of code that handles money and state transitions
- Define exit criteria before writing tests—prevents endless "one more test" scope creep
- Separate test environments by purpose; never run load tests against shared staging
