# Subskill: Threat Modeling

> Activate when: STRIDE, DREAD, attack tree, data flow diagram, trust boundary, new service, new data flow, new external integration.

**Core**: You cannot defend what you have not enumerated. Threat model first, then pick controls. Output is a living document, not a one-time gate.

## When to Threat Model

- New service or component crossing a trust boundary.
- New data flow (especially PII, credentials, payment data).
- New external integration (third-party API, webhook, OAuth provider).
- Significant architecture change (new auth path, new storage, new network exposure).
- Before major release for anything handling auth/payment/PII.

## STRIDE (per-element threat enumeration)

| Threat | Property violated | Example | Mitigation |
|--------|-------------------|---------|------------|
| **S**poofing | Authentication | Forged identity/token | Strong auth, MFA, mTLS |
| **T**ampering | Integrity | Modified payload/DB row | Signing, checksums, WAF, input validation |
| **R**epudiation | Non-repudiation | User denies action | Audit logs, signed events |
| **I**nfo disclosure | Confidentiality | Leaked PII/secrets | Encryption, access control, least privilege |
| **D**enial of service | Availability | Resource exhaustion | Rate limiting, quotas, autoscale |
| **E**levation of privilege | Authorization | User gains admin | RBAC/ABAC, deny-by-default |

Apply STRIDE to each element in the data flow diagram (processes, data stores, data flows, external entities).

## DREAD (prioritize discovered threats)

Score each 1-10, average to rank: **D**amage, **R**eproducibility, **E**xploitability, **A**ffected users, **D**iscoverability. Use to triage which STRIDE findings to fix first. Keep scoring lightweight  --  relative ranking matters more than absolute numbers.

## Data Flow Diagram (DFD)

1. Enumerate external entities (users, third parties), processes (services), data stores (DBs, caches, queues), and data flows (arrows with protocol + data classification).
2. Draw **trust boundaries** where data crosses privilege/network zones (internet → DMZ → internal → data tier).
3. Every flow crossing a boundary gets STRIDE analysis.

## Trust Boundaries

- Internet ↔ edge (untrusted → semi-trusted).
- Service ↔ service (verify even internal  --  see `zero-trust.md`).
- App ↔ data store (parameterize, least-privilege DB creds).
- App ↔ AI/LLM (treat model output as untrusted).

## Attack Trees

Root = attacker goal (e.g., "exfiltrate customer PII"). Branches = AND/OR sub-goals. Leaves = concrete attack steps. Use to find the cheapest attack path and prioritize the weakest branch.

## Output Format

```
## Threat Model: <service>
Data flows: <list crossing trust boundaries>
| Element | STRIDE | Threat | DREAD | Mitigation | Status |
```

## Delegates To

- **authentication**  --  spoofing/EoP mitigations.
- **zero-trust**  --  trust boundary enforcement.
- **@shield**  --  validating the model against real attack scenarios.
