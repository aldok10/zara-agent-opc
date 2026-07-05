---
type: fact
title: "Security Engineering Common Mistakes - Developer Production Lessons"
---

# Security Engineering Common Mistakes

40 production security mistakes organized by category. Each entry includes the mistake, its impact, and the correct fix.

## Broken Access Control

| Mistake | Impact | Fix |
|---------|--------|-----|
| Missing ownership check (IDOR) | Users access others' data by changing IDs | Verify resource.owner_id == current_user server-side |
| UI-only hiding of admin features | Attacker calls admin APIs directly | RBAC on every endpoint server-side |
| Missing function-level access control | Privilege escalation | Permission middleware before handler |
| Relying on client-sent role/permissions | Attacker modifies request to elevate role | Derive permissions from session/token server-side |

## Injection

| Mistake | Impact | Fix |
|---------|--------|-----|
| SQL via string concatenation | Full database compromise | Parameterized queries exclusively |
| NoSQL injection via unvalidated JSON ($gt, $ne) | Auth bypass, data exfiltration | Validate/cast types; reject objects where strings expected |
| OS command injection via os.system with user input | Remote code execution | Native APIs; allowlists; never interpolate |
| Template injection via unsanitized user input in templates | Server-side code execution | Sandboxed templates; never pass raw user input to render |

## JWT Misuse

| Mistake | Impact | Fix |
|---------|--------|-----|
| alg: none or algorithm confusion | Attacker forges tokens | Hardcode expected algorithm server-side |
| Storing JWTs in localStorage | XSS steals tokens | HttpOnly, Secure, SameSite=Strict cookies |
| Long-lived JWTs without revocation | Stolen tokens valid for weeks | Short access (5-15 min) + rotating refresh tokens |
| Secret key shared across environments | Token forgery for any user | Per-environment keys via secrets manager |
| Not validating iss, aud, exp claims | Cross-service tokens accepted | Strict claim validation on every verify |

## CORS

| Mistake | Impact | Fix |
|---------|--------|-----|
| Reflecting Origin header as Access-Control-Allow-Origin | Any site makes authenticated requests | Explicit allowlist of origins |
| Wildcard (*) with credentials: true | Browser blocks but dev disables checks | Named origins only when credentials used |

## Secrets Management

| Mistake | Impact | Fix |
|---------|--------|-----|
| Hardcoding secrets in source | Keys persist in git history forever | Secrets manager; .env in .gitignore |
| Same secrets across dev/staging/prod | Dev breach grants production access | Unique per environment |
| Logging secrets in error messages | Secrets exposed in monitoring systems | Redact in logging middleware |
| Not rotating after employee departure | Ex-employees retain access | Automated rotation on offboarding |

## Rate Limiting

| Mistake | Impact | Fix |
|---------|--------|-----|
| No rate limiting on login | Brute-force and credential stuffing | Exponential backoff + lockout + CAPTCHA |
| No rate limiting on API | DDoS, resource exhaustion | Per-user/IP token bucket |
| Rate limiting by IP only | Shared NATs bypass limits | Combine IP + user ID + fingerprint |

## SSRF

| Mistake | Impact | Fix |
|---------|--------|-----|
| Fetching user-supplied URLs without validation | Cloud metadata theft, internal port scan | Block private IPs after DNS resolution; allowlist schemes |
| Following redirects blindly | Redirect to internal endpoint bypasses check | Disable or re-validate each hop |

## Mass Assignment

| Mistake | Impact | Fix |
|---------|--------|-----|
| Binding entire request body to model | Attacker adds role=admin | Explicit allowlist of bindable fields |
| Accepting nested objects without schema validation | Hidden fields modified | Strict schema validation (zod, JSON Schema) |

## Supply Chain

| Mistake | Impact | Fix |
|---------|--------|-----|
| No private registry priority | Dependency confusion attack | Scoped registries, lockfile integrity |
| Typosquatted packages | Malware execution | Verify names, Socket.dev, lockfiles |
| Running postinstall scripts blindly | Credential exfiltration | Use --ignore-scripts flag, audit scripts |
| Unpinned version ranges | Compromised update auto-installed | Pin exact versions |

## Cryptographic Failures

| Mistake | Impact | Fix |
|---------|--------|-----|
| MD5/SHA-256 for passwords | Rainbow table attacks | bcrypt, argon2id, scrypt |
| HTTP for sensitive data | MITM intercepts credentials | TLS everywhere + HSTS |
| Using ECB mode for encryption | Patterns visible in ciphertext | GCM or other authenticated encryption modes |

## Security Misconfiguration

| Mistake | Impact | Fix |
|---------|--------|-----|
| DEBUG mode in production | Stack traces reveal internals | Environment-aware config |
| Missing security headers (CSP, HSTS) | XSS, clickjacking | Security headers middleware |
| Default credentials on services | Trivial unauthorized access | Change defaults; enforce strong credentials at deploy |

## Logging Failures

| Mistake | Impact | Fix |
|---------|--------|-----|
| Not logging auth events | Attacks go undetected | Log all auth with timestamp, IP; alert anomalies |
| Logging PII/tokens | Logs become breach vector | Redaction middleware |
| No integrity protection on logs | Attacker erases evidence | Append-only storage; ship to external SIEM |

---

## References

- OWASP Top 10 (2021): https://owasp.org/Top10/
- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/
- RFC 7519 (JWT): https://datatracker.ietf.org/doc/html/rfc7519
- Auth0 JWT Best Practices: https://auth0.com/docs/secure/tokens/json-web-tokens
- NIST SP 800-63B (Digital Identity): https://pages.nist.gov/800-63-3/sp800-63b.html
- Socket.dev Supply Chain Research: https://socket.dev/blog
- CWE/SANS Top 25 (2023): https://cwe.mitre.org/top25/archive/2023/2023_top25_list.html
