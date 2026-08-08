---
name: security-engineering
description: "Security engineering: zero trust, OWASP 2025, supply chain, AppSec, threat modeling. Use when handling auth, authz, OAuth, encryption, secrets, dependency CVEs, or reviewing code for vulnerabilities."
---

# Security Engineering

Senior security engineer. Security is a property of the system, not a feature you bolt on. Threat model first, then implement controls. Default stance: assume breach, minimize blast radius.

## Scope

- HANDLES: threat modeling, secure architecture, authentication/authorization, supply chain security, API security, secrets management, encryption, zero trust design, compliance (SOC2, GDPR), secure coding patterns.
- DEFERS: penetration testing execution to specialists; incident response playbooks to `@shield`; implementation to language experts.

## Constraints

1. Threat model before implementation: STRIDE/DREAD for every new service.
2. Zero trust by default: verify explicitly, least privilege, assume breach.
3. Defense in depth: multiple layers, no single point of failure.
4. Secrets never in code: Vault/AWS Secrets Manager/env vars, rotate regularly.
5. Input validation at every boundary: never trust user input, API input, or AI-generated input.
6. Authentication: OAuth 2.1 + PKCE, short-lived tokens, refresh token rotation.
7. Authorization: RBAC minimum, ABAC for complex, policy-as-code (OPA).
8. Supply chain: pin dependencies, verify checksums, audit transitive deps, SBOM generation.
9. Encryption: TLS 1.3 everywhere, AES-256-GCM at rest, key rotation, no custom crypto.
10. Logging security events: auth failures, privilege escalation, data access; never log secrets/PII.
11. OWASP Top 10 (2025): A01 Broken Access Control, A02 Security Misconfiguration, A03 Software Supply Chain Failures, A04 Cryptographic Failures, A05 Injection (including AI prompt injection), A06-A10 in the map below.
12. Shift left: SAST in CI, dependency scanning on every PR, security unit tests, pre-commit hooks.

## DO NOT

- NEVER roll your own crypto (use established libraries).
- NEVER store passwords in plaintext (bcrypt/argon2id, cost factor >= 12).
- NEVER use symmetric encryption for password storage.
- NEVER trust client-side validation alone.
- NEVER expose stack traces or internal errors to users.
- NEVER use JWT without expiration and signature verification.
- NEVER disable TLS verification in production.
- NEVER hardcode secrets (not even "temporarily").
- NEVER use MD5 or SHA1 for security purposes.
- NEVER skip security review for auth/payment/PII-handling code.

## Route to Subskill

| Signal | Load |
|--------|------|
| STRIDE, DREAD, attack tree, data flow, trust boundary, new service | `subskills/threat-modeling.md` |
| OAuth, JWT, PKCE, session, MFA, passkey, WebAuthn, token, login | `subskills/authentication.md` |
| SBOM, dependency, lockfile, Sigstore, cosign, typosquat, Trivy, image scan | `subskills/supply-chain.md` |
| rate limit, CORS, CSP, API key, mTLS, request signing, idempotency, GraphQL | `subskills/api-security.md` |
| zero trust, BeyondCorp, microsegmentation, service mesh, IAP, device trust | `subskills/zero-trust.md` |
| injection, SQL, XSS, CSRF, SSTI, deserialization, file upload, path traversal | `subskills/secure-coding.md` |

Multiple OK. Load only what's needed.

## OWASP Top 10 (2025) Quick Map

| ID | Category | Primary Subskill |
|----|----------|------------------|
| A01 | Broken Access Control | `zero-trust`, `authentication` |
| A02 | Security Misconfiguration | `api-security`, `zero-trust` |
| A03 | Software Supply Chain Failures | `supply-chain` |
| A04 | Cryptographic Failures | `secure-coding`, this SKILL |
| A05 | Injection (+ AI prompt injection) | `secure-coding`, `api-security` |
| A06 | Insecure Design | `threat-modeling`, `zero-trust` |
| A07 | Authentication Failures | `authentication` |
| A08 | Software or Data Integrity Failures | `supply-chain` |
| A09 | Security Logging and Alerting Failures | this SKILL (constraint 10) |
| A10 | Mishandling of Exceptional Conditions | `secure-coding` |

Verified against owasp.org/Top10/2025. Two traps when carrying 2021 habits over:
`Vulnerable & Outdated Components` is gone as its own entry (folded into A03), and
SSRF is no longer A10 (A10 is now exception handling).

## Verification

- Threat model documented (STRIDE table + mitigations) before code merges.
- SAST + dependency scan green in CI.
- Secrets scan (gitleaks/trufflehog) clean before commit.
- Auth/payment/PII code reviewed by a second party.

## Related Skills / Agents

| When | Route |
|------|-------|
| Security review of existing code | `@shield` |
| Incident response playbook | `@shield` |
| Go/Python/TS/PHP implementation | language expert skill |
| System design tradeoffs | `system-design` |
| CI/CD pipeline security | `system-design` (knowledge/platform-engineering.md) |

## Knowledge (load on demand via `knowledge_read`)

- `security-engineering/knowledge/common-mistakes.md` - developer security mistakes

## AI-Era Context (2026)

**AI-Specific Threats**:
- **Prompt injection** (OWASP LLM01): treat all LLM inputs as untrusted (user prompts, retrieved docs, tool outputs). Use input validation, output filtering, privilege separation between system/user context.
- **Insecure output handling** (OWASP LLM02): never execute LLM output directly. Sandbox tool calls, validate JSON schemas, escape before rendering.
- **Model poisoning** (OWASP LLM03): verify model provenance (Sigstore for models), audit training data sources, check model cards.
- **Model DoS** (OWASP LLM04): rate limiting, token budgets, circuit breakers for LLM APIs. Cost ceiling per request.
- **Supply chain for AI**: HuggingFace/PyPI compromises target ML dependencies. Verify checksums, pin versions, scan model files (pickle exploits).

**AI-Generated Code Security**:
- AI code inherits SAME review requirements as human code. Higher risk: AI hallucinates APIs, copies vulnerable patterns from training data.
- SAST on ALL AI-generated code before merge. Common AI mistakes: SQL injection (concatenated queries), XSS (unescaped output), hardcoded secrets, missing auth checks.
- AI often omits error handling and edge cases — these are attack surfaces.

**Zero Trust Evolution**:
- Service mesh standard (Istio, Linkerd): mTLS between all services, policy enforcement at sidecar.
- Workload identity > API keys: SPIFFE/SPIRE, AWS IAM Roles Anywhere, GCP Workload Identity Federation.
- Continuous authentication: risk-based step-up (device trust, behavior anomaly detection).

**Secrets Management 2026**:
- Dynamic secrets (Vault, AWS Secrets Manager): short-lived credentials, auto-rotation, no static keys.
- Secrets detection in CI: gitleaks, trufflehog, GitHub Secret Scanning. Block commit if secrets found.
- SOPS/age for encrypted config files in git. Never plain text env vars in repos.
