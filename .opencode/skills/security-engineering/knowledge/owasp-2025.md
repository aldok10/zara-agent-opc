---
type: fact
title: "OWASP Top 10 2025"
---
# OWASP Top 10 2025

## Quick Reference

| # | Vulnerability | Detection | Fix |
|---|---|---|---|
| A01 | Broken Access Control | Authorization testing, IDOR probes | Deny by default, server-side checks |
| A02 | Security Misconfiguration | CIS benchmarks, config scanning | Hardened defaults, IaC validation |
| A03 | Supply Chain Vulnerabilities | SCA, SBOM, provenance verification | Pin versions, verify signatures, SLSA |
| A04 | Cryptographic Failures | Secret scanning, TLS analysis | Strong algorithms, key rotation |
| A05 | Injection | SAST, fuzzing | Input validation, prepared statements |
| A06 | Insecure Design | Threat modeling, design review | Secure design patterns, abuse cases |
| A07 | Vulnerable/Outdated Components | SCA tools, dependency audit | Automated patching, SBOM tracking |
| A08 | SSRF | URL parsing tests, DNS rebinding | Allowlists, network segmentation |
| A09 | Logging/Monitoring Failures | Log coverage audit, alert testing | Structured logging, SIEM integration |
| A10 | Exception/Error Mishandling | Error response audit, info leak tests | Generic responses, fail closed |

## A01: Broken Access Control

Every endpoint must enforce authorization server-side. Most common vulnerability.

```typescript
// GOOD: server-side ownership check
async function getResource(userId: string, resourceId: string) {
  const resource = await db.resource.findUnique({ where: { id: resourceId } });
  if (resource.ownerId !== userId) throw new ForbiddenError();
  return resource;
}
```

Mitigations: deny by default, validate ownership on every access, disable directory listing, rate-limit APIs. Detection: IDOR probes, authorization matrix testing.

## A02: Security Misconfiguration

Moved up from A05 (2021). Permissive defaults, open cloud storage, missing headers.

```yaml
# GOOD: specific origin, not wildcard
Access-Control-Allow-Origin: https://app.example.com
```

Mitigations: minimal installs, automated config scanning (checkov, trivy), separate creds per env, security headers (CSP, HSTS, Permissions-Policy). Detection: CIS benchmarks, Prowler, ScoutSuite.

## A03: Supply Chain Vulnerabilities

NEW in 2025. Attacks on build systems, dependencies, and delivery pipelines.

```bash
npm ci --ignore-scripts && npm audit signatures
cosign verify-attestation --type slsaprovenance \
  --certificate-identity=ci@myorg.com ghcr.io/myorg/app@sha256:abc123
```

Examples: xz-utils (2024, social engineering of maintainer), SolarWinds (CI/CD compromise), event-stream (npm hijack). Mitigations: SLSA Level 3+, SBOM in CI, dependency review in PRs, pin with integrity hashes. Detection: Socket.dev, Snyk, Sigstore.

## A04: Cryptographic Failures

Was A02 in 2021. Weak or missing encryption exposing data.

```python
# GOOD: bcrypt with cost factor
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

Mitigations: TLS 1.3 in transit, AES-256-GCM at rest, never custom crypto, key rotation via KMS. Detection: trufflehog, gitleaks, sslyze.

## A05: Injection

Was A03 in 2021. SQL, NoSQL, OS command, template injection.

```go
// GOOD: parameterized query
row := db.QueryRow("SELECT * FROM users WHERE id = $1", userID)
```

Mitigations: parameterized queries everywhere, input validation with allowlists, ORM escaping, WAF as defense-in-depth. Detection: SAST (semgrep, CodeQL), DAST fuzzing.

## A06: Insecure Design

Business logic flaws that implementation cannot fix. Mitigations: threat model during design (STRIDE, PASTA), abuse case stories, secure design patterns (rate limiting, least privilege), reference architectures. Detection: architecture reviews, design doc security checklists.

## A07: Vulnerable and Outdated Components

```bash
npm audit --production && snyk test && trivy image myapp:latest
npm install express@4.21.2 --save-exact  # pin exact
```

Mitigations: Dependabot/Renovate for automated updates, SCA in CI with break-on-high, SBOM per release, remove unused deps. Detection: npm audit, Snyk, Trivy, Grype.

## A08: Server-Side Request Forgery (SSRF)

```python
ALLOWED_HOSTS = {"api.trusted.com", "cdn.trusted.com"}
def safe_fetch(url: str):
    parsed = urlparse(url)
    if parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Host not allowed")
    return requests.get(url, timeout=5, allow_redirects=False)
```

Mitigations: URL allowlists (not denylists), block metadata endpoints (169.254.169.254), disable redirects, DNS resolution validation (block private ranges). Detection: URL parsing tests, DNS rebinding probes.

## A09: Security Logging and Monitoring Failures

```typescript
logger.warn({
  event: 'auth.failed', userId: attempt.email,
  ip: req.ip, reason: 'invalid_credentials',
  timestamp: new Date().toISOString(),
});
```

Mitigations: log all auth/access-control/validation failures, centralized aggregation (ELK, Datadog), tamper-proof storage, incident runbooks. Detection: log coverage audits, simulated attack alerts.

## A10: Mishandling of Exceptions and Errors

NEW in 2025. Leaking stack traces, exposing internal state, failing open.

```typescript
// GOOD: generic response + internal logging
app.use((err, req, res, next) => {
  const errorId = crypto.randomUUID();
  logger.error({ errorId, err, path: req.path });
  res.status(500).json({ error: 'Internal error', reference: errorId });
});
```

Mitigations: never expose stack traces/SQL errors to clients, fail closed (deny on unexpected error), structured logging with correlation IDs, env-specific error pages. Detection: error response auditing, penetration testing.
