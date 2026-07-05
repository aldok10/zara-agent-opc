---
type: tool
title: "Security Test Plan Prompt"
---

# Security Test Plan Prompt

## Purpose
Design a security testing plan for an application, covering automated scans, manual testing, and vulnerability assessment.

## Inputs Required
- Application type (web app, API, mobile, microservices)
- Tech stack (framework, language, database, cloud)
- Authentication mechanism (JWT, session, OAuth, API keys)
- Data sensitivity (PII, financial, health, public)
- Compliance requirements (SOC 2, PCI-DSS, HIPAA, GDPR)
- Existing security measures (WAF, rate limiting, encryption)
- Previous findings (past pentests, known issues)

## Design Steps

### 1. Threat Modeling (Quick)

```markdown
## Assets
- [What data/systems are we protecting?]

## Entry Points
- [Where can attackers interact? APIs, forms, uploads, webhooks]

## Trust Boundaries
- [Where does trust level change? Public → Authenticated → Admin]

## Threats (STRIDE)
| Category | Threat | Applicable? | Priority |
|----------|--------|-------------|----------|
| Spoofing | Account takeover | Yes/No | High/Med/Low |
| Tampering | Data modification | | |
| Repudiation | Action denial | | |
| Info Disclosure | Data leak | | |
| Denial of Service | Resource exhaustion | | |
| Elevation | Privilege escalation | | |
```

### 2. Test Categories

```markdown
## Automated Testing

### SAST (Static)
- Tool: [Semgrep / CodeQL / SonarQube]
- Config: [rules to enable]
- Run: every PR

### DAST (Dynamic)
- Tool: [OWASP ZAP / StackHawk / Nuclei]
- Target: [staging URL]
- Scope: [what to scan, what to exclude]
- Run: nightly / pre-release

### Dependency Scanning
- Tool: [npm audit / Snyk / Trivy]
- Run: daily + on dependency changes

### Secret Detection
- Tool: [Gitleaks / TruffleHog]
- Scope: entire repo history
```

### 3. Manual Testing Areas

```markdown
## Authentication
- [ ] Credential stuffing resistance (rate limit)
- [ ] Password reset security (token expiry, one-time use)
- [ ] Session management (timeout, invalidation, fixation)
- [ ] MFA bypass attempts
- [ ] OAuth/SSO misconfiguration

## Authorization
- [ ] IDOR on all resource endpoints
- [ ] Horizontal privilege escalation (user A → user B data)
- [ ] Vertical privilege escalation (user → admin)
- [ ] API endpoints without auth checks
- [ ] Bulk operations bypass checks

## Input Handling
- [ ] SQL injection (parameterized queries verified)
- [ ] XSS (stored, reflected, DOM)
- [ ] Command injection (file operations, exec calls)
- [ ] SSRF (URL inputs, webhooks)
- [ ] File upload (type validation, path traversal)

## Business Logic
- [ ] Rate limiting on critical operations
- [ ] Race conditions (double-spend, duplicate creation)
- [ ] Workflow bypass (skip steps in multi-step process)
- [ ] Negative values / integer overflow
```

### 4. Infrastructure Checks

```markdown
## Configuration
- [ ] Security headers present and correct
- [ ] TLS 1.2+ only, strong ciphers
- [ ] CORS policy restrictive
- [ ] No unnecessary services/ports exposed
- [ ] Error messages don't leak internals
- [ ] Logging captures security events

## Cloud
- [ ] Storage buckets not public
- [ ] IAM least privilege
- [ ] Encryption at rest enabled
- [ ] Network segmentation correct
- [ ] Secrets in vault (not env vars / code)
```

### 5. Output

```markdown
## Security Test Plan: [Application Name]

### Scope
- [What's included / excluded]
- [Testing window]
- [Environment: staging only]

### Automated Pipeline
| Tool | Purpose | Frequency | Blocking? |
|------|---------|-----------|-----------|

### Manual Test Matrix
| Area | Tests | Priority | Estimated Time |
|------|-------|----------|---------------|

### Schedule
- Week 1: Automated setup + reconnaissance
- Week 2: Manual authentication + authorization testing
- Week 3: Input handling + injection testing
- Week 4: Business logic + infrastructure review

### Deliverables
- [ ] Vulnerability report (findings + severity + fix guidance)
- [ ] Executive summary (risk posture)
- [ ] Automated pipeline configured
- [ ] Remediation tracking tickets created

### Risk Acceptance
| Finding | Severity | Accept / Fix | Justification |
|---------|----------|--------------|---------------|
```
