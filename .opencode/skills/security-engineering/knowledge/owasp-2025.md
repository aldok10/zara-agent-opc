# OWASP Top 10 2025

## Quick Reference

| # | Vulnerability | Detection | Fix |
|---|---|---|---|
| A01 | Broken Access Control | Authorization testing, IDOR probes | Deny by default, server-side checks |
| A02 | Cryptographic Failures | Secret scanning, TLS analysis | Strong algorithms, key rotation |
| A03 | Injection | SAST, fuzzing, parameterized queries | Input validation, prepared statements |
| A04 | Insecure Design | Threat modeling, design review | Secure design patterns, abuse cases |
| A05 | Security Misconfiguration | CIS benchmarks, config scanning | Hardened defaults, IaC validation |
| A06 | Vulnerable Components | SCA tools, SBOM analysis | Pin versions, automated patching |
| A07 | Authentication Failures | Credential stuffing tests, brute force | MFA, rate limiting, secure sessions |
| A08 | Software/Data Integrity | CI/CD audit, artifact verification | Signed artifacts, integrity checks |
| A09 | Logging/Monitoring Failures | Log coverage audit, alert testing | Structured logging, SIEM integration |
| A10 | SSRF | URL parsing tests, DNS rebinding | Allowlists, network segmentation |

## A01: Broken Access Control

Most common vulnerability. Every endpoint must enforce authorization server-side.

```typescript
// BAD: client-side check only
if (user.role === 'admin') showAdminPanel();

// GOOD: server-side enforcement
async function getResource(userId: string, resourceId: string) {
  const resource = await db.resource.findUnique({ where: { id: resourceId } });
  if (resource.ownerId !== userId) throw new ForbiddenError();
  return resource;
}
```

Mitigations:
- Deny by default; explicit grants per role
- Validate ownership on every data access
- Disable directory listing, remove metadata endpoints
- Rate-limit APIs to reduce automated exploitation

## A02: Cryptographic Failures

Data exposure through weak or missing encryption.

```python
# BAD: MD5 for password hashing
import hashlib
hashed = hashlib.md5(password.encode()).hexdigest()

# GOOD: bcrypt with cost factor
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

Mitigations:
- TLS 1.3 for data in transit
- AES-256-GCM or ChaCha20-Poly1305 for data at rest
- Never roll custom crypto
- Rotate keys on schedule; use KMS

## A03: Injection

SQL, NoSQL, OS command, LDAP, template injection.

```go
// BAD: string concatenation
query := "SELECT * FROM users WHERE id = '" + userID + "'"

// GOOD: parameterized query
row := db.QueryRow("SELECT * FROM users WHERE id = $1", userID)
```

```typescript
// Template injection prevention
// BAD: eval(userInput)
// GOOD: sandboxed template engine with strict context
```

Mitigations:
- Parameterized queries everywhere
- Input validation with allowlists
- ORM with proper escaping
- WAF as defense-in-depth (not primary)

## A04: Insecure Design

Flaws in business logic that no amount of implementation fixes can solve.

Mitigations:
- Threat model during design phase (STRIDE)
- Abuse case stories alongside user stories
- Secure design patterns: rate limiting, circuit breakers
- Reference architectures for common flows (auth, payments)

## A05: Security Misconfiguration

```yaml
# BAD: permissive CORS
Access-Control-Allow-Origin: *

# GOOD: specific origin
Access-Control-Allow-Origin: https://app.example.com
```

Mitigations:
- Minimal installs; remove unused features
- Automated config scanning in CI
- Separate credentials per environment
- Security headers: CSP, HSTS, X-Frame-Options

## A06: Vulnerable and Outdated Components

```bash
# Detection
npm audit --production
snyk test
trivy image myapp:latest

# Fix: pin exact versions
npm install express@4.21.2 --save-exact
```

Mitigations:
- Automated dependency updates (Dependabot, Renovate)
- SCA in CI pipeline with break-on-high
- SBOM generation for every release
- Remove unused dependencies aggressively

## A07: Identification and Authentication Failures

```typescript
// Rate limiting login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.body.email,
});

// Constant-time comparison for tokens
import { timingSafeEqual } from 'crypto';
function verifyToken(provided: string, stored: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

## A08: Software and Data Integrity Failures

Unsigned updates, unverified CI/CD pipelines, deserialization attacks.

Mitigations:
- Verify signatures on all artifacts
- Lock CI/CD pipeline definitions
- Restrict deserialization to known types
- Use integrity hashes (SRI for CDN resources)

## A09: Security Logging and Monitoring Failures

```typescript
// Structured security event logging
logger.warn({
  event: 'auth.failed',
  userId: attempt.email,
  ip: req.ip,
  reason: 'invalid_credentials',
  timestamp: new Date().toISOString(),
});
```

Mitigations:
- Log all auth events, access control failures, input validation failures
- Centralized log aggregation with alerting
- Tamper-proof log storage
- Incident response runbooks triggered by alerts

## A10: Server-Side Request Forgery (SSRF)

```python
# BAD: unvalidated URL fetch
response = requests.get(user_provided_url)

# GOOD: allowlist validation
from urllib.parse import urlparse
ALLOWED_HOSTS = {"api.trusted.com", "cdn.trusted.com"}

def safe_fetch(url: str):
    parsed = urlparse(url)
    if parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Host not allowed")
    if parsed.scheme != "https":
        raise ValueError("HTTPS required")
    return requests.get(url, timeout=5)
```

Mitigations:
- URL allowlists, not denylists
- Network segmentation (metadata endpoints blocked)
- Disable redirects or validate each hop
- DNS resolution validation (block private ranges)
