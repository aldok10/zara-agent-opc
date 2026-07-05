---
type: fact
title: "Non-Functional Requirements"
---

# Non-Functional Requirements

## ISO 25010 Quality Characteristics

| Characteristic | Example Requirement |
|---------------|-------------------|
| Performance Efficiency | "API responds in <200ms at p95" |
| Reliability | "99.9% uptime monthly" |
| Security | "All PII encrypted at rest (AES-256)" |
| Maintainability | "Deploy new feature in <1 day" |
| Compatibility | "Integrate with SAP via REST" |
| Usability | "New user completes onboarding in <5 min" |
| Portability | "Run on AWS and GCP without code changes" |

## Writing Testable NFRs

Template: `[Quality] shall [measurable condition] under [context]`

```
BAD:  "The system should be fast"
GOOD: "Search results return in <300ms at p95 under 1000 concurrent users"

BAD:  "The system should be secure"
GOOD: "Session tokens expire after 30 minutes of inactivity"

BAD:  "The system should scale"
GOOD: "Handle 10x traffic spike (5K→50K RPM) within 3 minutes via auto-scaling"
```

## Measurable Examples

**Performance**: p50 <100ms, p95 <300ms, p99 <1s | Measure: APM tool, load test (k6)
**Reliability**: 99.9% avail (8.7h downtime/year), MTTR <30min, RPO <5min
**Security**: encryption at rest + transit, MFA enforced, zero critical OWASP ZAP findings
**Scalability**: horizontal scale in <2min, handle 10TB without degradation

## Traceability: NFR → Architecture → Test

```
NFR: "API p95 <200ms"
  → Architecture: Redis cache, read replicas
  → Test: k6 load test, 500 VUs, 10 min, assert p95 < 200ms

NFR: "99.9% availability"
  → Architecture: Multi-AZ, health checks, circuit breakers
  → Test: Kill instance, verify recovery <60s
```

## Prioritization

| Priority | Criteria | Example |
|----------|----------|---------|
| Must | Legal, safety, data loss | GDPR, encryption |
| Should | User-facing quality | Response time, uptime |
| Could | Nice-to-have | Sub-50ms, 99.99% |
| Won't | Over-engineering | Multi-region when single suffices |

## Elicitation Questions

1. "What happens if system is down 1 hour? 1 day?"
2. "How many concurrent users in 6/12/24 months?"
3. "Acceptable wait time for [specific action]?"
4. "Who should NOT access [data/feature]?"
5. "How quickly must you recover from failure?"
6. "What compliance standards apply?" (SOC 2, HIPAA, PCI, GDPR)
