---
type: example
title: "Non-Functional Requirements Template"
---

# Non-Functional Requirements Template

## Context
When defining quality attributes for a system beyond functional behavior. Each NFR must be measurable, testable, and tied to a business justification. This template covers the most common categories with concrete thresholds.

## Code/Template

### System: Customer-Facing API Platform

---

### 1. Performance

| ID | Requirement | Metric | Target | Measurement Method |
|----|-------------|--------|--------|-------------------|
| NFR-P01 | API response time (read) | P95 latency | < 200ms | APM (Datadog/New Relic) |
| NFR-P02 | API response time (write) | P95 latency | < 500ms | APM |
| NFR-P03 | Search query time | P99 latency | < 1s | Application logs |
| NFR-P04 | Page load time (web) | Largest Contentful Paint | < 2.5s | Lighthouse CI |
| NFR-P05 | Batch job completion | Wall clock time | < 2h for 10M records | Job scheduler logs |

**Business Justification**: Studies show 53% of mobile users abandon sites taking >3s to load. Each 100ms latency reduction correlates to 1% revenue increase.

---

### 2. Scalability

| ID | Requirement | Target | Growth Horizon |
|----|-------------|--------|----------------|
| NFR-S01 | Concurrent users | 50,000 simultaneous | 12 months |
| NFR-S02 | Requests per second | 10,000 RPS sustained | 12 months |
| NFR-S03 | Data volume | 5TB primary storage | 24 months |
| NFR-S04 | Horizontal scale-out | Add capacity without downtime | Ongoing |
| NFR-S05 | Peak load handling | 3x normal traffic (flash sales) | Ongoing |

**Scaling Strategy**: Auto-scaling based on CPU (70% threshold) and queue depth. Pre-warm for known peak events.

---

### 3. Availability & Reliability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-A01 | Uptime SLA | 99.95% (22 min downtime/month) | Excluding planned maintenance |
| NFR-A02 | Recovery Time Objective (RTO) | < 15 minutes | From detection to service restored |
| NFR-A03 | Recovery Point Objective (RPO) | < 5 minutes | Maximum acceptable data loss |
| NFR-A04 | Planned maintenance window | < 30 min/month | Zero-downtime deploys preferred |
| NFR-A05 | Failover time | < 30 seconds | Automatic, no manual intervention |

---

### 4. Security

| ID | Requirement | Standard | Verification |
|----|-------------|----------|--------------|
| NFR-SEC01 | Data in transit | TLS 1.2+ mandatory | Certificate scan, HSTS headers |
| NFR-SEC02 | Data at rest | AES-256 encryption | Cloud KMS audit |
| NFR-SEC03 | Authentication | OAuth 2.0 + MFA for admin | Pen test report |
| NFR-SEC04 | Authorization | RBAC with least privilege | Access matrix review |
| NFR-SEC05 | Secrets management | No secrets in code/config | SAST + vault audit |
| NFR-SEC06 | Vulnerability patching | Critical: 24h, High: 7d | Dependency scanning (Snyk/Trivy) |
| NFR-SEC07 | Audit logging | All auth events + data mutations | Log completeness check |

---

### 5. Observability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-O01 | Log retention | 30 days hot, 1 year cold |
| NFR-O02 | Alert response time | SEV1 paged within 1 minute of threshold breach |
| NFR-O03 | Distributed tracing | 100% of requests traced in production |
| NFR-O04 | Dashboard coverage | All SLIs visible in real-time dashboard |
| NFR-O05 | Error budget tracking | Weekly burn-rate alerts |

---

### 6. Maintainability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-M01 | Deployment frequency | Multiple times per day (CI/CD) |
| NFR-M02 | Lead time for changes | < 1 day from commit to production |
| NFR-M03 | Test coverage | > 80% line coverage, 100% for critical paths |
| NFR-M04 | Code review | All changes require 1+ approval |
| NFR-M05 | Documentation | API docs auto-generated from OpenAPI spec |

---

### 7. Compliance

| ID | Requirement | Regulation | Evidence |
|----|-------------|-----------|----------|
| NFR-C01 | Data residency | GDPR | Data stored in EU region only for EU users |
| NFR-C02 | Right to deletion | GDPR Art. 17 | Deletion completes within 30 days |
| NFR-C03 | Data retention | Industry policy | Automated purge after retention period |
| NFR-C04 | Accessibility | WCAG 2.1 AA | Annual audit + automated testing |

---

### Verification Strategy

```
Each NFR maps to one or more verification methods:

- Load Testing: NFR-P*, NFR-S* (k6/Locust, run weekly in staging)
- Chaos Engineering: NFR-A* (GameDay quarterly, Chaos Monkey continuous)
- Penetration Testing: NFR-SEC* (annual third-party + continuous DAST)
- Synthetic Monitoring: NFR-P01, NFR-A01 (external probes every 30s)
- Compliance Audit: NFR-C* (quarterly internal, annual external)
- CI Pipeline: NFR-M03, NFR-M04 (enforced as merge gates)
```

## Key Points
- Every NFR has a measurable target and a method of verification. "The system should be fast" is not a requirement; "P95 latency < 200ms measured via APM" is.
- Include business justification to prioritize NFRs during tradeoff discussions. Teams can make informed decisions about which thresholds to relax under budget pressure.
- NFRs are living documents  -  review targets quarterly against actual production metrics and adjust growth projections.
