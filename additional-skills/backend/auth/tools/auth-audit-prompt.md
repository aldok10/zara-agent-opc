---
type: tool
title: "Auth Security Audit"
---

# Auth Security Audit

## Purpose

Systematic security audit of an existing authentication system. Identifies weaknesses in session management, token handling, MFA coverage, and credential storage against current best practices.

## When to Use

- Periodic security review of auth infrastructure
- After a security incident involving credentials or sessions
- Before compliance certification (SOC 2, ISO 27001, PCI DSS)
- Evaluating an inherited or legacy auth system
- Validating auth changes before production deployment

## Prompt Template

```
CONTEXT:
- Auth mechanism: [JWT | session cookie | OAuth 2.1 | SAML | API keys]
- Identity provider: [self-hosted | Auth0 | Cognito | Keycloak | Okta]
- Token storage (client): [httpOnly cookie | localStorage | memory | secure enclave]
- Token storage (server): [Redis | database | in-memory]
- Password hashing: [argon2id | bcrypt | scrypt | PBKDF2 | unknown]
- MFA methods: [TOTP | WebAuthn | SMS | push | none]
- Session config: [access TTL | refresh TTL | idle timeout | absolute timeout]

AUDIT CHECKLIST:
1. Credential storage
   - [ ] Hashing algorithm strength (argon2id preferred, bcrypt acceptable)
   - [ ] Salt uniqueness per credential
   - [ ] Timing-safe comparison for verification
   - [ ] Credential rotation policy

2. Token security
   - [ ] Access token TTL <= 15 minutes
   - [ ] Refresh token rotation on use (one-time use)
   - [ ] Token binding (fingerprint, IP, device)
   - [ ] Revocation mechanism (blocklist or short-lived + introspection)
   - [ ] JWK rotation schedule

3. Session management
   - [ ] Concurrent session limits
   - [ ] Session invalidation on password change
   - [ ] Forced logout capability (admin + user)
   - [ ] Session fixation prevention (regenerate ID on auth)
   - [ ] Idle timeout enforcement

4. MFA coverage
   - [ ] MFA enforced for privileged operations
   - [ ] Recovery flow does not bypass MFA
   - [ ] Phishing-resistant option available (WebAuthn)
   - [ ] Rate limiting on MFA attempts

5. Transport and headers
   - [ ] Secure flag on cookies
   - [ ] SameSite attribute set
   - [ ] HSTS enabled
   - [ ] CORS restricted to known origins

EVIDENCE REQUIRED:
- Configuration snippets (redact secrets)
- Token sample (redacted payload structure)
- Session store TTL settings
- Rate limiting rules
```

## Output Format

```
## Auth Audit: [system name]

### Risk Summary
- Critical: [count]
- High: [count]
- Medium: [count]
- Low: [count]

### Findings
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | ... | critical/high/med/low | ... | ... |

### Immediate Actions (Critical/High)
1. [Action with implementation guidance]

### Improvement Roadmap
| Priority | Change | Effort | Risk Reduction |
|----------|--------|--------|----------------|
| ... | ... | ... | ... |

### Compliant Areas
- [What's already well-implemented]
```
