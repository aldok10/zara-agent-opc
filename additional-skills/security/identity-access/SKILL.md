---
name: identity-access
description: "Identity and access management: OAuth 2.1, OIDC, RBAC/ABAC, zero trust, passkeys, MFA"
---

# Identity & Access Management

Design and implement identity systems that enforce least privilege through continuous verification.

## Scope

OAuth 2.1 and OIDC implementation, RBAC/ABAC/ReBAC policy design, zero trust identity verification, passkey/WebAuthn authentication, MFA enforcement, session management, token lifecycle, service-to-service auth, identity federation, just-in-time access provisioning.

## First Action

Map the identity architecture -- who authenticates, how tokens flow, where authorization decisions happen -- before changing any auth logic.

## Constraints

1. OAuth 2.1 only -- no implicit flow, no ROPC
2. Tokens: short-lived access (5-15min), refresh with rotation and reuse detection
3. PKCE required for all OAuth clients including confidential
4. Passkeys preferred over passwords; MFA mandatory for privileged access
5. Authorization decisions at the resource server, not the gateway alone
6. RBAC for coarse access; ABAC/ReBAC for fine-grained decisions
7. Service-to-service uses mTLS or workload identity -- never shared secrets
8. Session fixation, CSRF, and replay attacks mitigated by design
9. JWTs validated: signature, issuer, audience, expiry, and scope
10. Privilege escalation paths audited -- no role that grants itself more roles
11. Break-glass access logged, alerted, and time-bound
12. Identity provider (IdP) is single source of truth for user lifecycle
13. Deprovisioning propagates within minutes, not days

## DO NOT

- Store passwords in anything other than argon2id/bcrypt
- Use JWTs as session tokens for web apps without server-side validation
- Allow wildcard scopes or audience
- Implement custom crypto for token signing
- Trust client-side role checks as authorization
- Skip token revocation for logout/deprovisioning
- Use API keys as sole authentication for user-facing services
- Hardcode service credentials in source or config
- Allow unlimited session duration without re-authentication

## Route to Subskill

| Signal | Target |
|--------|--------|
| App vuln in auth flow | appsec |
| Cloud IAM policies | cloud-security |
| Compliance audit for access | compliance |
| Threat model for auth system | threat-modeling |
| Credential compromise | incident-forensics |
| Auth code patterns | secure-code |

## Verification

- [ ] OAuth 2.1 flows implemented with PKCE and token rotation
- [ ] MFA enforced for all privileged accounts
- [ ] Token validation checks all required claims
- [ ] Authorization tested with boundary conditions (role escalation, cross-tenant)
- [ ] Service-to-service auth uses workload identity or mTLS
- [ ] Session management prevents fixation, replay, and unlimited duration
- [ ] Deprovisioning tested end-to-end within SLA
- [ ] Break-glass procedure documented and alerted

## Knowledge

- OAuth 2.1 (RFC 9126, 9396, 9449)
- OpenID Connect Core 1.0
- WebAuthn Level 3
- NIST SP 800-63B (Digital Identity Guidelines)
- Cedar/OPA policy languages
- SCIM 2.0 for provisioning

## AI-Era Context (2026)

- AI agents need scoped identity -- per-task tokens with minimal permissions
- Passkeys adoption mainstream; FIDO2 hardware keys for high-assurance
- Continuous access evaluation (CAEP/SSF) replaces session-based revocation
- Verifiable credentials (W3C) emerging for cross-org identity federation
- Identity threat detection (ITDR) correlates auth anomalies across IdP and apps

## Related Skills

- cloud-security
- secure-code
- threat-modeling
- compliance
