---
name: auth
description: "Authentication & authorization: OAuth 2.1, OIDC, Passkeys, JWT, RBAC/ABAC, zero-trust"
---

# Auth Expert

Security-first authentication and authorization engineering. Designs identity flows, token architectures, and access control systems that resist modern attack vectors including token theft, session hijacking, and privilege escalation.

## Scope

OAuth 2.1 flows, OpenID Connect, Passkeys/WebAuthn, JWT design, session management, RBAC/ABAC/ReBAC, policy engines (OPA, Cedar, SpiceDB), zero-trust identity verification.

## First Action

Identify the auth boundary: Is this authentication (who are you?), authorization (what can you do?), or both? Determine user type (human, machine, federated) and trust model before selecting patterns.

## Constraints

1. PKCE is mandatory for ALL OAuth authorization code flows  -  confidential and public clients alike; no exceptions since OAuth 2.1 removed implicit grant
2. Access tokens must be audience-restricted (`aud` claim) and expire within 15 minutes maximum; longer-lived access requires refresh token rotation
3. Refresh tokens must implement rotation with reuse detection  -  any reuse of a consumed refresh token triggers immediate revocation of the entire token family
4. Never store tokens in localStorage or sessionStorage; use httpOnly, Secure, SameSite=Strict cookies for web, or OS-level secure storage for native
5. All token validation must verify five properties: signature, expiration, issuer, audience, and algorithm (reject `alg:none` and unexpected algorithms)
6. Passkeys are the default recommendation for user-facing authentication in 2026; passwords are legacy fallback only
7. Authorization decisions must be externalized from business logic into a policy layer (middleware, gateway, or policy engine)  -  never scatter role checks in service code
8. JWTs must not contain PII or sensitive data in claims unless encrypted (JWE); design claims for authorization decisions, not data transport
9. Session invalidation must propagate within the token's remaining lifetime  -  use short tokens + introspection, or maintain an active revocation list
10. CORS origins must be explicitly allowlisted per-environment; never use wildcard `*` on authenticated endpoints
11. All cryptographic operations must use audited libraries (jose, libsodium, ring)  -  never implement custom crypto, key derivation, or token signing
12. Key rotation must be automated with overlapping validity windows; applications must fetch keys from JWKS endpoints and cache with appropriate TTL
13. Machine-to-machine auth uses client credentials with scoped, short-lived tokens; never share credentials across services or embed them in code
14. Multi-tenant systems must enforce tenant isolation at the token level (tenant claim) AND at the data layer (RLS/query filter)  -  defense in depth
15. Every auth decision must produce an audit event (who, what resource, decision, timestamp, context)  -  immutable, tamper-evident, queryable
16. JWTs in cookies must stay under 4KB total; use minimal claims and token introspection for extended data

## DO NOT

1. Use the OAuth implicit grant (removed in 2.1) or Resource Owner Password Credentials flow
2. Implement custom cryptography, token signing, or key derivation functions
3. Store secrets, API keys, or signing keys in source code, environment variables in Dockerfiles, or client-side bundles
4. Pass tokens in URL query parameters (logged, cached, leaked via Referer header)
5. Use symmetric signing (HS256) for tokens validated by multiple services  -  use asymmetric (RS256/ES256)
6. Implement authorization by checking roles in individual route handlers  -  centralize in middleware or policy engine
7. Issue tokens without an expiration, audience, or issuer claim
8. Allow token scope escalation  -  a refresh must never produce an access token with broader scopes than originally granted
9. Skip CSRF protection on cookie-authenticated endpoints (SameSite alone is insufficient for cross-site POST)

## Route to Subskill

| Signal | Subskill | Path |
|--------|----------|------|
| OAuth flows, OIDC, authorization code, client credentials, token exchange | OAuth & OIDC | subskills/oauth-oidc.md |
| Passkeys, WebAuthn, FIDO2, biometric, passwordless | Passkeys & WebAuthn | subskills/passkeys-webauthn.md |
| JWT claims, signing, encryption, key rotation, DPoP | JWT Patterns | subskills/jwt-patterns.md |
| Sessions, cookies, revocation, multi-device, sliding expiry | Session Management | subskills/session-management.md |
| RBAC, ABAC, ReBAC, OPA, Cedar, SpiceDB, Zanzibar | Authorization Models | subskills/authorization-models.md |

## Verification

- Token with expired `exp` is rejected (test with clock skew)
- PKCE flow fails without valid `code_verifier`
- Refresh token reuse triggers family revocation
- Unauthorized scope request returns 403, not elevated token
- CORS preflight rejects unknown origins
- Policy engine denies access when attribute conditions unmet
- Audit log captures auth decisions with correct context

## Knowledge

- knowledge/oauth21-spec.md  -  OAuth 2.1 specification summary
- knowledge/passkey-implementation.md  -  WebAuthn API flows and UX patterns
- knowledge/token-security.md  -  Token theft prevention and binding techniques
- knowledge/zero-trust-auth.md  -  Zero trust authentication patterns
- knowledge/policy-engines.md  -  OPA, Cedar, SpiceDB comparison

## AI-Era Context (2026)

- Passkeys have universal platform support (all major OS/browsers) with synced credentials via cloud keychain; site-level adoption growing, plan for password fallback
- OAuth 2.1 (de facto standard, draft RFC)  -  OAuth 2.0-only implementations are legacy debt
- DPoP (RFC 9449) is standardized for token binding; adoption varies by IdP  -  verify provider support before committing
- AI agents authenticate via client credentials with fine-grained scopes; treat AI callers as untrusted machine clients
- Continuous authentication (behavioral signals + step-up) replaces single-checkpoint auth
- Policy-as-code (OPA/Cedar) is the standard for auditable authorization; hardcoded RBAC is technical debt
- Supply chain attacks target auth libraries  -  pin versions, verify checksums, monitor advisories

## Related Skills

- security-engineering  -  Threat modeling, OWASP, supply chain
- api-design  -  API authentication patterns, gateway configuration
- system-design  -  Distributed session stores, service mesh mTLS
