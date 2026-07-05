---
type: fact
title: "Requirements Types"
---

# Requirements Types

## Functional Requirements

Define what the system must DO. Specific behaviors, features, and capabilities.

### Format

"The system shall [verb] [object] when [condition]."

Examples:
- The system shall send a password reset email within 60 seconds of request
- The system shall prevent duplicate orders within a 5-second window
- The system shall display the user's order history sorted by date descending

### Characteristics of Good Functional Requirements

- Testable: QA can verify pass/fail without ambiguity
- Atomic: One requirement, one behavior
- Complete: No missing conditions or outcomes
- Consistent: No conflicts with other requirements
- Traceable: Links to business goal or user story

## Non-Functional Requirements (Quality Attributes)

Define how well the system performs. Constraints on quality.

### Performance

- Response time: "API responses < 200ms at P95 under normal load"
- Throughput: "System handles 1000 concurrent users"
- Capacity: "Stores up to 10M records per tenant"

### Availability

- Uptime: "99.9% availability (8.7 hours downtime/year)"
- Recovery: "RTO < 15 minutes, RPO < 5 minutes"
- Degradation: "Core features remain available during partial outage"

### Security

- Authentication: "Support SSO via SAML 2.0 and OIDC"
- Authorization: "Role-based access with principle of least privilege"
- Data protection: "PII encrypted at rest (AES-256) and in transit (TLS 1.3)"
- Audit: "All data access logged with actor, action, timestamp"

### Scalability

- Horizontal: "Supports adding nodes without downtime"
- Data growth: "Performance degrades < 10% at 10x current data volume"
- Multi-tenancy: "Tenant isolation with no cross-tenant data leakage"

### Usability

- Accessibility: "WCAG 2.1 AA compliance"
- Learnability: "New user completes core task within 5 minutes without training"
- Error recovery: "User can undo any action within 30 seconds"

### Maintainability

- Deployability: "Zero-downtime deployments"
- Testability: "90% code coverage on business logic"
- Modularity: "New payment provider integrable within 2 developer-days"

## MoSCoW Prioritization

| Priority | Meaning | Implication |
|----------|---------|-------------|
| Must | Non-negotiable for release | Without this, the release has no value |
| Should | Important but not critical | Painful to miss, but workarounds exist |
| Could | Desirable if time permits | Nice-to-have, low risk to defer |
| Won't | Explicitly excluded this time | Documented as out of scope |

### Rules for MoSCoW

- No more than 60% of effort should be "Must"
- Every "Must" has clear acceptance criteria
- "Won't" is not "never" -- it's "not this iteration"
- Challenge anything labeled "Must" -- is it truly launch-blocking?

## Requirements Traceability

### Traceability Matrix

Links requirements to their origin and implementation:

```
| Req ID | Description | Source | Priority | Story | Test Case | Status |
|--------|-------------|--------|----------|-------|-----------|--------|
| FR-001 | Password reset email | Stakeholder interview | Must | US-012 | TC-045 | Done |
| NFR-003 | API < 200ms P95 | SLA agreement | Must | -- | PT-002 | In progress |
```

### Why Trace?

- Impact analysis: What breaks if this changes?
- Coverage: Are all requirements implemented and tested?
- Justification: Why does this requirement exist?
- Scope control: Is new work tied to an approved requirement?

## Requirements States

```
Draft -> Reviewed -> Approved -> Implemented -> Verified -> Closed
                 \-> Rejected -> (archived)
                 \-> Deferred -> (next cycle)
```

## Common Defects in Requirements

| Defect | Example | Fix |
|--------|---------|-----|
| Ambiguous | "Fast response time" | "< 200ms at P95" |
| Incomplete | "User can filter" (by what?) | "Filter by date, status, category" |
| Untestable | "Easy to use" | "Task completion < 3 clicks" |
| Gold-plated | Feature nobody asked for | Trace to stakeholder need |
| Conflicting | FR-001 says X, FR-023 says not-X | Resolution with priority |
| Assumed | Undocumented behavior | Make implicit explicit |

## Writing Checklist

For each requirement, verify:
- [ ] Single, atomic behavior
- [ ] Testable with clear pass/fail
- [ ] Assigned priority (MoSCoW)
- [ ] Traced to business need
- [ ] No implementation prescription (what, not how)
- [ ] Reviewed by at least one stakeholder
- [ ] No conflicting requirements identified
