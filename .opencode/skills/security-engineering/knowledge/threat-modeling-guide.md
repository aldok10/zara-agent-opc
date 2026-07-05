# Threat Modeling Guide

## STRIDE Per Element Methodology

STRIDE categorizes threats by type. "Per element" means applying relevant categories to each component in your data flow diagram.

| Category | Threat | Violated Property | Applies To |
|---|---|---|---|
| Spoofing | Impersonating another entity | Authentication | Processes, External Entities |
| Tampering | Modifying data without authorization | Integrity | Data Flows, Data Stores |
| Repudiation | Denying an action occurred | Non-repudiation | Processes, External Entities |
| Information Disclosure | Exposing data to unauthorized parties | Confidentiality | Data Flows, Data Stores |
| Denial of Service | Making system unavailable | Availability | Processes, Data Stores |
| Elevation of Privilege | Gaining unauthorized capabilities | Authorization | Processes |

## Step-by-Step Process

### Step 1: Define Scope

- What system or feature are you modeling?
- What are the trust boundaries?
- What are the assets worth protecting?
- Who are the threat actors? (external attacker, malicious insider, compromised service)

### Step 2: Build Data Flow Diagram (DFD)

### Step 3: Identify Threats (STRIDE per element)

### Step 4: Score and Prioritize

### Step 5: Define Mitigations

### Step 6: Validate (verify mitigations address threats)

## DFD Construction Guide

### Elements

```
[External Entity]  -- rectangle
(Process)          -- circle
[Data Store]       -- parallel lines
-->                -- data flow (arrow)
---                -- trust boundary (dashed line)
```

### Example: E-commerce Checkout

```
                    Trust Boundary
                    ============
[Browser] --> (API Gateway) --> (Order Service) --> [Order DB]
                    |                   |
                    v                   v
              (Auth Service)     (Payment Service) --> [Payment Provider]
                    |
                    v
              [User DB]
```

### DFD Rules

- Every process must have at least one input and one output
- Data stores can only be accessed by processes (not external entities directly)
- Data flows are labeled with what data moves
- Trust boundaries separate zones with different privilege levels

## Risk Scoring

### Likelihood x Impact Matrix

```
Impact:     1=Negligible  2=Minor  3=Moderate  4=Major  5=Critical
Likelihood: 1=Rare        2=Unlikely  3=Possible  4=Likely  5=Almost Certain

Risk Score = Likelihood x Impact

|            | Impact 1 | Impact 2 | Impact 3 | Impact 4 | Impact 5 |
|------------|----------|----------|----------|----------|----------|
| Likely 5   | 5 Med    | 10 High  | 15 High  | 20 Crit  | 25 Crit  |
| Likely 4   | 4 Low    | 8 Med    | 12 High  | 16 Crit  | 20 Crit  |
| Likely 3   | 3 Low    | 6 Med    | 9 Med    | 12 High  | 15 High  |
| Likely 2   | 2 Low    | 4 Low    | 6 Med    | 8 Med    | 10 High  |
| Likely 1   | 1 Low    | 2 Low    | 3 Low    | 4 Low    | 5 Med    |
```

Priority thresholds:
- Critical (16-25): Immediate remediation required
- High (10-15): Address in current sprint
- Medium (5-9): Plan for next cycle
- Low (1-4): Accept or address opportunistically

### DREAD Alternative (per-threat scoring)

- Damage: How severe if exploited? (1-10)
- Reproducibility: How easy to reproduce? (1-10)
- Exploitability: How easy to exploit? (1-10)
- Affected Users: How many impacted? (1-10)
- Discoverability: How easy to find? (1-10)

Score = average of all five. Prioritize highest scores.

## Attack Tree Construction

Root: attacker goal. Branches: methods to achieve. Leaves: atomic steps.

```
Goal: Steal user payment data
├── Via application layer
│   ├── SQL injection in search (AND)
│   │   ├── Find injectable parameter
│   │   └── Extract payment table
│   ├── XSS to steal session (AND)
│   │   ├── Inject script in profile field
│   │   └── Exfiltrate cookies to attacker server
│   └── IDOR on payment endpoint
│       └── Enumerate user IDs and fetch /api/users/{id}/payment
├── Via infrastructure
│   ├── Compromise database directly (AND)
│   │   ├── Exploit unpatched DB vulnerability
│   │   └── Exfiltrate via network
│   └── Intercept traffic (AND)
│       ├── ARP spoofing on internal network
│       └── Strip TLS (downgrade attack)
└── Via supply chain
    ├── Compromised npm package
    │   └── Malicious postinstall script exfiltrates env vars
    └── Compromised CI/CD
        └── Inject step to dump secrets during build
```

### Attack Tree Notation

- AND: all children must succeed (marked explicitly)
- OR: any child succeeds (default, no marking)
- Annotate leaves with: cost, skill required, detectability

## Practical Template: Web Application

### 1. System Description

```markdown
## Application: [Name]
## Description: [One paragraph]
## Data Classification: [Public/Internal/Confidential/Restricted]
## Users: [Types and trust levels]
## External Dependencies: [Third-party services]
```

### 2. Assets

```markdown
| Asset | Classification | Storage | Owner |
|-------|---------------|---------|-------|
| User credentials | Restricted | User DB (encrypted) | Auth team |
| Payment tokens | Restricted | Vault | Payment team |
| Order history | Confidential | Order DB | Commerce team |
| Product catalog | Internal | Cache + DB | Catalog team |
```

### 3. Threat Enumeration

```markdown
| ID | Element | STRIDE | Threat | Likelihood | Impact | Risk | Mitigation |
|----|---------|--------|--------|-----------|--------|------|------------|
| T1 | API Gateway | S | Token forgery | 2 | 5 | 10-High | JWT signature verification, short expiry |
| T2 | Order DB | T | Data modification via SQLi | 3 | 4 | 12-High | Parameterized queries, WAF |
| T3 | Payment flow | I | Card data in logs | 3 | 5 | 15-High | PCI-compliant logging, data masking |
| T4 | Auth Service | E | Privilege escalation via role manipulation | 2 | 5 | 10-High | Server-side role enforcement, signed tokens |
| T5 | API Gateway | D | Rate limit bypass | 4 | 3 | 12-High | Distributed rate limiting, captcha |
```

### 4. Mitigation Tracking

```markdown
| Threat ID | Mitigation | Status | Owner | Verification |
|-----------|-----------|--------|-------|--------------|
| T1 | JWT ES256 + 15min expiry | Implemented | Auth team | Unit test + pen test |
| T2 | ORM with parameterized queries | Implemented | Backend | SAST scan |
| T3 | Structured logging with PII filter | In Progress | Platform | Log audit |
| T4 | RBAC with policy engine | Planned | Auth team | Integration test |
| T5 | Redis-backed rate limiter | Implemented | Platform | Load test |
```

### 5. Assumptions and Residual Risk

```markdown
## Assumptions
- Cloud provider infrastructure is secure (shared responsibility)
- TLS termination at load balancer is correctly configured
- Developers do not commit secrets (enforced by pre-commit hooks)

## Residual Risk
- Zero-day in framework: accepted, mitigated by WAF + monitoring
- Insider threat: partially mitigated by audit logging + least privilege
- Supply chain compromise: mitigated by lockfiles + SCA, residual risk accepted
```

## When to Threat Model

- New system or major feature (before implementation)
- Significant architecture change
- New external integration
- After a security incident (retrospective)
- Periodic review (quarterly for critical systems)

## Common Pitfalls

- Modeling too broadly -- scope to a specific feature or flow
- Ignoring data flows -- threats live in the transitions
- Not updating after changes -- treat as living document
- Skipping prioritization -- not all threats need immediate action
- Threat modeling in isolation -- include dev, ops, and security
