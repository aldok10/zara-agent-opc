# Subskill: Authentication

> Activate when: OAuth, OIDC, JWT, PKCE, session, MFA, passkey, WebAuthn, token, login, refresh token, SSO.

**Core**: Authentication proves identity; do it once, correctly, with short-lived credentials. Prefer standards over bespoke flows. Never conflate authentication (who you are) with authorization (what you may do).

## OAuth 2.1 + OIDC

- OAuth 2.1 consolidates best practices: **PKCE mandatory** for all clients, no implicit grant, no password grant, exact redirect URI matching.
- Use **Authorization Code + PKCE** for web/mobile/SPA. Use **Client Credentials** for service-to-service.
- OIDC layers identity (ID token) on OAuth (access token). Use OIDC when you need to authenticate a user, OAuth alone for API authorization.

## PKCE (Proof Key for Code Exchange)

```
code_verifier  = random 43-128 char string
code_challenge = base64url(SHA256(code_verifier))
# send challenge on /authorize, verifier on /token
```
Defends against authorization code interception. Required even for confidential clients under 2.1.

## JWT

- **Claims**: set `iss`, `aud`, `sub`, `exp`, `iat`, `nbf`, `jti`. Validate all on every request.
- **Signing**: asymmetric (RS256/ES256/EdDSA) so verifiers need only the public key. Reject `alg: none`. Pin allowed algorithms  --  never trust the header's `alg`.
- **Rotation**: publish keys via JWKS endpoint with `kid`; rotate signing keys on a schedule and support overlap.
- **Expiration**: access tokens 5-15 min. JWTs are hard to revoke  --  keep them short and pair with a revocation list for high-value sessions.

## Session Management

- Server-side sessions (opaque IDs) are easiest to revoke; JWTs favor stateless scale. Choose per revocation needs.
- Regenerate session ID on privilege change (login, role elevation) to prevent fixation.
- Idle + absolute timeouts. Bind session to device/IP signals where feasible.

## Token Storage

- Web: **httpOnly + Secure + SameSite=Strict cookies** for tokens. Prevents XSS theft.
- Avoid `localStorage` for tokens  --  readable by any XSS. If unavoidable (SPA), keep access token in memory, refresh token in httpOnly cookie.
- Native/mobile: OS keychain/keystore, never plaintext.

## Refresh Token Rotation

- Issue a new refresh token on every use; invalidate the prior one.
- Detect reuse of a rotated token → assume theft → revoke the entire token family and force re-auth.
- Bind refresh tokens to the client (DPoP or mTLS) to prevent replay.

## MFA & Passkeys

- MFA: TOTP or push; avoid SMS (SIM-swap). Enforce for admin/high-risk actions (step-up auth).
- **Passkeys / WebAuthn** are phishing-resistant (public-key, origin-bound). Prefer as primary factor. Support platform (Touch ID/Windows Hello) and roaming (security key) authenticators.

## Common Failures (OWASP A07)

| Failure | Fix |
|---------|-----|
| Credential stuffing | Rate limit, breach-password check, MFA |
| `alg: none` / algorithm confusion | Pin allowed algs, reject none |
| Long-lived tokens, no revocation | Short TTL + rotation + revocation list |
| Token in localStorage | httpOnly cookie |
| No fixation protection | Regenerate session on auth |

## Delegates To

- **zero-trust**  --  continuous verification, device trust.
- **secure-coding**  --  CSRF protection for cookie-based sessions.
- **@shield**  --  auth flow review.
