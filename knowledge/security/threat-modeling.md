# Threat Modeling

## What It Is

A structured way to find design-level security flaws before writing code. Not a tool. A thinking exercise applied to architecture decisions.

You can't pentest your way out of a bad design. Threat modeling catches the classes of bugs that scanners miss: broken access control, missing trust boundaries, implicit assumptions.

## When To Do It

- New feature involving authentication, authorization, or sensitive data
- Architecture changes (new service, new data store, new external integration)
- Before security reviews or compliance audits
- System handling payments, PII, or health data
- Any time you add a trust boundary crossing

## STRIDE Framework

| Category | Threat | Example | Typical Mitigation |
|----------|--------|---------|-------------------|
| **S**poofing | Pretending to be someone else | Forged JWT, session hijack | Auth, MFA, token validation |
| **T**ampering | Modifying data in transit/rest | Man-in-middle, DB injection | Integrity checks, TLS, signing |
| **R**epudiation | Denying an action occurred | User denies placing order | Audit logs, timestamps, signing |
| **I**nformation Disclosure | Data exposed to wrong party | Error messages leak internals | Encryption, access control, minimal exposure |
| **D**enial of Service | Making system unavailable | Resource exhaustion, floods | Rate limiting, quotas, scaling |
| **E**levation of Privilege | Gaining unauthorized access | IDOR, privilege escalation | Least privilege, input validation, authz checks |

## The 4-Question Process

### 1. What are we building?

Draw a Data Flow Diagram (DFD):
- External entities (users, third-party services)
- Processes (your services, functions)
- Data stores (databases, caches, file systems)
- Data flows (arrows between components)
- Trust boundaries (where privilege level changes)

### 2. What can go wrong?

Apply STRIDE to each component and data flow. For every element ask: can it be spoofed? Can data be tampered? etc.

### 3. What are we doing about it?

For each identified threat, choose: mitigate, accept, transfer, or eliminate.

### 4. Did we do a good job?

Review coverage. Did we miss components? Are mitigations actually implemented? Revisit after implementation.

## Lightweight Approach (15-Minute Version)

For feature PRs and smaller changes when a full model is overkill:

1. **List trust boundaries** in your change (browser-to-API, service-to-service, app-to-DB)
2. **Enumerate data flows** crossing those boundaries (what data, which direction, who can trigger)
3. **Apply STRIDE** to each flow (quick mental pass, note concerns)
4. **Document assumptions** (e.g., "we assume the API gateway validates JWTs before traffic reaches us")

Put findings in the PR description or a brief section in the design doc.

## Output: Threat Table

| # | Threat | STRIDE | Component | Impact | Likelihood | Mitigation | Status |
|---|--------|--------|-----------|--------|------------|------------|--------|
| 1 | Attacker forges admin JWT | S | API Gateway | Critical | Medium | Validate sig + exp + iss claims | Done |
| 2 | User accesses other user's data | E | /api/orders/:id | High | High | Verify ownership in query | TODO |
| 3 | Unbounded file upload causes OOM | D | Upload service | Medium | Medium | 10MB limit + streaming | Done |
| 4 | Logs contain PII in error messages | I | All services | Medium | High | Structured logging, scrub PII | In progress |

## Tips

- Threat model the design, not the code. Code-level bugs are for SAST/DAST.
- Focus on trust boundaries. Most vulnerabilities live at boundary crossings.
- "What assumptions are we making?" is the most productive question.
- Keep models updated. Architecture changes invalidate previous models.
- Involve the team. Different perspectives catch different threats.
- Don't try to be exhaustive. Focus on high-impact, high-likelihood first.
