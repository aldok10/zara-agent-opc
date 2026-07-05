---
type: tool
title: "Auth Flow Design"
---

# Auth Flow Design

## Purpose

Design and evaluate authentication/authorization flows. Covers OAuth 2.1, passkeys/WebAuthn, session management, token lifecycle, and access control patterns.

## When to Use

- Designing a new auth system or login flow
- Adding a new auth method (passkeys, social login, MFA)
- Reviewing token storage, rotation, or revocation strategy
- Evaluating session management for security gaps

## Prompt Template

```
CONTEXT:
- Auth type: [OAuth 2.1 | passkeys/WebAuthn | session-based | API keys | mTLS]
- Grant flow: [authorization code + PKCE | client credentials | device code]
- Token format: [JWT | opaque | reference]
- Storage: [httpOnly cookie | secure storage | memory]
- Session duration: [access TTL / refresh TTL / absolute timeout]
- MFA: [TOTP | WebAuthn | SMS | none]
- Clients: [SPA | mobile | server-to-server | CLI]

EVALUATE:
1. Token lifecycle: issuance, validation, refresh, revocation
2. Storage security: XSS/CSRF mitigation, secure flags
3. Session management: concurrent sessions, forced logout, idle timeout
4. Credential handling: hashing algorithm, salt, pepper
5. OAuth compliance: PKCE enforcement, state param, redirect validation
6. Passkey flow: registration ceremony, authentication ceremony, resident keys
7. Privilege escalation: step-up auth, scope narrowing
8. Audit trail: login events, token usage, anomaly detection

THREAT MODEL:
- Token theft (XSS, network interception)
- Session fixation/hijacking
- Replay attacks
- Credential stuffing/brute force
- Phishing (redirect manipulation)
```

## Output Format

```
## Auth Design: [system/flow name]

### Flow Diagram
[Text-based flow: Actor -> System -> Provider]

### Security Assessment
| Threat | Mitigation | Status |
|--------|-----------|--------|
| ...    | ...       | covered/gap |

### Recommendations
1. [Specific change with rationale]
2. ...

### Token Lifecycle
- Access: [TTL, storage, validation method]
- Refresh: [TTL, rotation policy, revocation]
- Session: [timeout strategy, binding]
```
