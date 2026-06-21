# Authentication Security Patterns

## Session-Based Auth

Server stores session state, client holds only a session ID cookie.

```
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
```

Key flags:
- `HttpOnly` - prevents JS access (XSS mitigation)
- `Secure` - HTTPS only
- `SameSite=Strict` - CSRF protection (use `Lax` if cross-site navigation needed)

When to use: traditional web apps, server-rendered pages, apps where you control both frontend and backend.

## JWT Best Practices

```
Access token:  15 min max lifetime
Refresh token: 7-30 days, one-time use, rotated on each refresh
```

Storage: HttpOnly cookie. Never localStorage (XSS = full account takeover).

```javascript
// Verify BOTH signature and claims
const payload = jwt.verify(token, publicKey, {
  algorithms: ['ES256'],
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
  clockTolerance: 30
});
```

Signing algorithms:
- **ES256/RS256** - asymmetric, use for distributed systems (services verify without signing key)
- **HS256** - symmetric, only when single service both signs and verifies

Always include: `iss`, `aud`, `exp`, `iat`, `sub`. Never store sensitive data in payload (it's base64, not encrypted).

## OAuth 2.1 / OIDC

OAuth 2.1 consolidates best practices:

```
- PKCE required for ALL clients (not just public)
- Implicit flow removed
- Resource Owner Password flow removed
- Refresh tokens: sender-constrained or one-time use
```

```javascript
// PKCE flow
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// Authorization request includes code_challenge
// Token request includes code_verifier
```

Scoped tokens: request minimum scopes needed. `openid profile email` not `openid *`.

## Password Storage

```python
# Preferred: Argon2id
from argon2 import PasswordHasher
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
hash = ph.hash(password)
ph.verify(hash, password)

# Acceptable: bcrypt (cost 12+)
import bcrypt
hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

Never: MD5, SHA1, SHA256 (even with salt), plain text.

Argon2id parameters (OWASP 2025): memory 64MB, iterations 3, parallelism 4.

## MFA

Priority order:
1. **Passkeys/WebAuthn** - phishing-resistant, best UX
2. **TOTP** (Google Authenticator, Authy) - widely supported
3. **Hardware keys** (YubiKey) - highest security, lower adoption
4. **SMS** - last resort, vulnerable to SIM swap

```javascript
// WebAuthn registration (server-side)
const options = generateRegistrationOptions({
  rpName: 'Example Corp',
  rpID: 'example.com',
  userID: user.id,
  userName: user.email,
  authenticatorSelection: {
    residentKey: 'preferred',
    userVerification: 'preferred'
  }
});
```

Always provide recovery codes (one-time use, stored hashed).

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| JWT in localStorage | XSS = full token theft | HttpOnly cookie |
| No refresh token rotation | Stolen token = permanent access | One-time use + rotation |
| Long-lived access tokens (24h+) | Wide attack window | 15 min max |
| Missing CSRF on session auth | Cross-site state changes | SameSite + CSRF token |
| Trusting client token claims | Privilege escalation | Always verify server-side |
| HS256 with weak/shared secret | Token forgery | Use asymmetric (ES256) |
| No `aud`/`iss` validation | Token confusion attacks | Validate all claims |
| Refresh token in URL params | Leaks via referrer/logs | Body or cookie only |
