---
type: example
title: "Threat Model Template"
---

# Threat Model Template

## System Information

| Field | Value |
|-------|-------|
| System Name | [Name] |
| Version | [Version/Release] |
| Date | [Date] |
| Author(s) | [Names] |
| Reviewers | [Names] |
| Status | Draft / In Review / Approved / Needs Update |
| Last Updated | [Date] |

## System Description

[2-3 paragraphs describing what the system does, who uses it, and what data it handles. Include the business context and why this system matters.]

## Assets

| Asset | Classification | Location | Owner |
|-------|---------------|----------|-------|
| Customer PII | Confidential | PostgreSQL (prod) | Data Team |
| Authentication tokens | Restricted | Redis (session store) | Platform Team |
| Payment data | PCI Restricted | Payment processor (external) | Payments Team |
| Source code | Internal | GitHub | Engineering |
| API keys | Restricted | AWS Secrets Manager | Platform Team |

## Actors

| Actor | Trust Level | Access Method | Notes |
|-------|------------|---------------|-------|
| Anonymous user | Untrusted | HTTPS via CDN | No authentication |
| Authenticated user | Low trust | HTTPS + JWT | Email-verified only |
| Admin user | High trust | HTTPS + MFA + VPN | Background-checked |
| Service account | Medium trust | mTLS + IAM role | Automated, scoped |
| Third-party API | Low trust | Webhook + signature | Validate all input |

## Data Flow Diagram

```
[Draw the DFD here. Include:]
- External entities (users, third parties)
- Processes (services, functions)
- Data stores (databases, caches, queues)
- Data flows (with protocol labels)
- Trust boundaries (clearly marked)

Example:
┌─────────────────────────────────────────────────┐
│ Internet (Untrusted)                             │
│   [Browser] ──HTTPS──►                          │
│─────────────────────────┼───────────────────────│
│ DMZ                     │                       │
│              ┌──────────▼──────────┐            │
│              │   API Gateway       │            │
│              └──────────┬──────────┘            │
│─────────────────────────┼───────────────────────│
│ Application Tier        │ gRPC/mTLS             │
│              ┌──────────▼──────────┐            │
│              │   App Service       │            │
│              └───┬─────────────┬───┘            │
│                  │             │                 │
│         ┌────────▼───┐  ┌─────▼────────┐       │
│         │ PostgreSQL │  │ Redis Cache  │       │
│         └────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────┘
```

## Trust Boundaries

| Boundary | Between | Controls |
|----------|---------|----------|
| TB1: Internet/DMZ | Browser -- API Gateway | TLS 1.3, WAF, rate limiting |
| TB2: DMZ/App | API Gateway -- App Service | mTLS, JWT validation, network policy |
| TB3: App/Data | App Service -- Database | IAM auth, encrypted connection, parameterized queries |
| TB4: App/External | App Service -- Third Party | API key, webhook signatures, timeout |

## Threat Enumeration (STRIDE per Element)

### Element: API Gateway (Process)

| ID | Category | Threat | Likelihood | Impact | Risk | Mitigation | Status |
|----|----------|--------|-----------|--------|------|-----------|--------|
| T001 | Spoofing | Forged request bypasses auth | 3 | 4 | 12 HIGH | JWT validation, audience check | Implemented |
| T002 | Tampering | Request modification in transit | 1 | 4 | 4 LOW | TLS 1.3 (encrypted) | Implemented |
| T003 | Repudiation | Client denies API call | 2 | 2 | 4 LOW | Structured access logging | Implemented |
| T004 | Info Disclosure | Error message leaks internals | 3 | 3 | 9 MED | Generic errors to client, details in logs | Implemented |
| T005 | DoS | Request flood | 4 | 3 | 12 HIGH | Rate limiting (100 req/min), WAF | Implemented |
| T006 | Elevation | Gateway exploit gives internal access | 2 | 5 | 10 HIGH | Minimal permissions, patch SLA <72h | Monitoring |

### Element: [Continue for each element...]

## Attack Trees (High-Priority Threats)

### Goal: Exfiltrate Customer PII

```
[Insert attack tree for most critical threats]
[See attack-trees.md for construction methodology]
```

## Risk Summary

| Risk Level | Count | Action Required |
|-----------|-------|-----------------|
| Critical (16-25) | 0 | Immediate mitigation before release |
| High (10-15) | 3 | Mitigate before release |
| Medium (5-9) | 5 | Mitigate within current sprint |
| Low (1-4) | 8 | Accept or address in next cycle |

## Accepted Risks

| ID | Threat | Risk Score | Justification | Accepted By | Review Date |
|----|--------|-----------|---------------|-------------|-------------|
| T012 | Internal service DoS via queue flooding | 6 MED | Queue has dead letter queue, auto-scaling handles burst | [Name] | [Date + 90 days] |

## Mitigations

| ID | Mitigation | Addresses | Owner | Deadline | Verification |
|----|-----------|-----------|-------|----------|--------------|
| M001 | Add rate limiting to /api/auth/* | T005, T008 | Platform | Sprint 12 | Load test confirms 429 at threshold |
| M002 | Enable DPoP for API tokens | T001, T015 | Auth Team | Q2 2026 | Integration test validates token binding |
| M003 | Add audit logging to admin actions | T003, T020 | Backend | Sprint 13 | Log appears in SIEM within 30s |

## Assumptions

| ID | Assumption | If Wrong... | Validation |
|----|-----------|-------------|-----------|
| A001 | TLS terminates only at CDN/LB | MITM possible between internal services | Network scan confirms no plaintext |
| A002 | Admin accounts have MFA enabled | Account takeover via credential stuffing | Verify MFA enforcement in IdP config |
| A003 | Database not accessible from internet | Direct SQL injection exploitation | Port scan from external, VPC flow log review |

## Update Triggers

This threat model must be updated when:
- [ ] New external integration added
- [ ] New data store introduced
- [ ] Authentication/authorization changes
- [ ] Network architecture modified
- [ ] New user role or access level created
- [ ] Security incident occurs involving this system
- [ ] Quarterly review date reached

## Appendix: STRIDE Reference

| Category | Violation | Question |
|----------|-----------|----------|
| Spoofing | Authentication | Can someone pretend to be this entity? |
| Tampering | Integrity | Can data be modified without detection? |
| Repudiation | Non-repudiation | Can an actor deny performing an action? |
| Info Disclosure | Confidentiality | Can data leak to unauthorized parties? |
| Denial of Service | Availability | Can this be made unavailable? |
| Elevation of Privilege | Authorization | Can someone gain unauthorized access? |
