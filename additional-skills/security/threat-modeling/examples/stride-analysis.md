---
type: example
title: "STRIDE Analysis for Payment API"
---

# STRIDE Analysis for Payment API

## Context
When threat modeling a new or modified system to identify security risks before implementation. STRIDE categorizes threats into 6 types: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege. Apply to each component and data flow.

## Code/Template

```markdown
# STRIDE Threat Model: Payment Processing API

## System Overview

```
┌──────────┐    HTTPS     ┌──────────────┐    gRPC     ┌──────────────┐
│  Mobile  │─────────────>│  API Gateway │────────────>│  Payment Svc │
│   App    │              │  (Kong)      │             │  (Go)        │
└──────────┘              └──────────────┘             └──────┬───────┘
                                                              │
                          ┌──────────────┐                    │ TLS
                          │  Stripe API  │<───────────────────┤
                          └──────────────┘                    │
                                                              │
                          ┌──────────────┐                    │
                          │  PostgreSQL  │<───────────────────┘
                          │  (PCI scope) │
                          └──────────────┘
```

## Threat Analysis

### 1. Spoofing (Identity)

| # | Threat | Target | Likelihood | Impact | Mitigation |
|---|--------|--------|-----------|--------|------------|
| S1 | Stolen JWT used to initiate payment | API Gateway | Medium | Critical | Short-lived tokens (15m), refresh rotation, device binding |
| S2 | Forged webhook from attacker (not Stripe) | Payment Svc | Medium | High | Verify Stripe signature header, reject replays >5min |
| S3 | Service impersonation via DNS poisoning | Inter-service | Low | Critical | mTLS between services, certificate pinning |

### 2. Tampering (Integrity)

| # | Threat | Target | Likelihood | Impact | Mitigation |
|---|--------|--------|-----------|--------|------------|
| T1 | Client modifies payment amount in request | API Gateway | High | Critical | Server-side price lookup from DB, ignore client amount |
| T2 | Man-in-middle modifies gRPC payload | Gateway→Svc | Low | Critical | mTLS, payload signing for sensitive fields |
| T3 | Direct database modification bypassing app | PostgreSQL | Low | Critical | DB audit logging, row-level checksums, restricted access |

### 3. Repudiation (Deniability)

| # | Threat | Target | Likelihood | Impact | Mitigation |
|---|--------|--------|-----------|--------|------------|
| R1 | User denies making a payment | Payment Svc | Medium | High | Immutable audit log with user action + IP + device fingerprint |
| R2 | Admin claims they didn't refund | Admin panel | Medium | Medium | Admin actions require MFA + logged to tamper-proof trail |
| R3 | Missing evidence for disputed charge | Audit system | Low | High | Structured events to append-only store (CloudTrail + app logs) |

### 4. Information Disclosure (Confidentiality)

| # | Threat | Target | Likelihood | Impact | Mitigation |
|---|--------|--------|-----------|--------|------------|
| I1 | Card data in application logs | Payment Svc | Medium | Critical | Never log PAN; mask to last 4; use tokenization |
| I2 | Error response leaks internal state | API Gateway | Medium | Medium | Generic error messages to client; details in internal logs only |
| I3 | Database backup exposed in S3 | PostgreSQL | Low | Critical | Encrypt backups with CMK, bucket policy denies public access |
| I4 | Memory dump contains card tokens | Payment Svc | Low | High | Process tokens in isolated memory, zero after use |

### 5. Denial of Service (Availability)

| # | Threat | Target | Likelihood | Impact | Mitigation |
|---|--------|--------|-----------|--------|------------|
| D1 | Flood of payment attempts | API Gateway | High | High | Rate limit: 10 req/s per user, 100 req/s per IP |
| D2 | Large payload causing OOM | Payment Svc | Medium | Medium | Request body limit (1MB), streaming validation |
| D3 | Database connection exhaustion | PostgreSQL | Medium | Critical | Connection pooling (PgBouncer), max 50 conns per service |
| D4 | Stripe API outage cascading | Payment Svc | Medium | High | Circuit breaker, queue for retry, graceful degradation |

### 6. Elevation of Privilege

| # | Threat | Target | Likelihood | Impact | Mitigation |
|---|--------|--------|-----------|--------|------------|
| E1 | Regular user accesses admin refund endpoint | Payment Svc | Medium | Critical | RBAC enforced at gateway AND service level |
| E2 | SQL injection escalates to DB admin | PostgreSQL | Low | Critical | Parameterized queries, least-privilege DB user |
| E3 | Container escape to host | Infrastructure | Low | Critical | Non-root containers, read-only filesystem, seccomp profiles |
| E4 | IDOR: access another user's payment | Payment Svc | High | High | Always filter by authenticated user_id, never trust URL param alone |

## Risk Matrix Summary

| Risk Level | Count | Action |
|-----------|-------|--------|
| Critical  | 8     | Must mitigate before launch |
| High      | 7     | Mitigate in sprint 1 |
| Medium    | 5     | Track in backlog |
| Low       | 2     | Accept with monitoring |

## Prioritized Actions

1. **Implement server-side price validation** (T1) - Sprint 0
2. **Add Stripe webhook signature verification** (S2) - Sprint 0
3. **IDOR protection on all payment endpoints** (E4) - Sprint 0
4. **Rate limiting at gateway** (D1) - Sprint 1
5. **Audit logging with tamper-proof storage** (R1, R2) - Sprint 1
6. **PAN scrubbing from all log pipelines** (I1) - Sprint 1
7. **Circuit breaker for Stripe dependency** (D4) - Sprint 2
8. **mTLS between services** (S3, T2) - Sprint 2
```

## Key Points
- Apply STRIDE to each component AND each data flow between components - threats often live at boundaries, not inside services
- Rank by likelihood x impact and assign to sprints; not every threat needs immediate mitigation
- The #1 payment API vulnerability is IDOR (accessing another user's data) - always filter queries by authenticated user context
