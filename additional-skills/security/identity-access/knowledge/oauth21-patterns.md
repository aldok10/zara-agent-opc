# OAuth 2.1 Patterns

Modern authorization patterns including PKCE, DPoP, and token binding for secure token flows.

## OAuth 2.1 Summary

OAuth 2.1 consolidates best practices from OAuth 2.0 + security BCPs into a single spec. Key changes from 2.0:

- **PKCE required** for all clients (not just public)
- **Implicit grant removed** -- use authorization code + PKCE instead
- **Resource Owner Password Credentials (ROPC) removed**
- **Bearer tokens must be sender-constrained** when possible (DPoP)
- **Refresh tokens** must be sender-constrained or one-time-use (rotation)
- **Redirect URIs** must use exact match (no wildcards)

## Authorization Code + PKCE Flow

```
┌────────┐                              ┌────────────┐
│ Client │                              │   AuthZ    │
│  (SPA/ │                              │   Server   │
│ Mobile)│                              │            │
└───┬────┘                              └─────┬──────┘
    │                                         │
    │ 1. Generate code_verifier (random)      │
    │    code_challenge = SHA256(verifier)     │
    │                                         │
    │ 2. GET /authorize                       │
    │    ?response_type=code                  │
    │    &client_id=xxx                       │
    │    &redirect_uri=https://app/callback   │
    │    &scope=openid profile                │
    │    &state=random_csrf                   │
    │    &code_challenge=abc...               │
    │    &code_challenge_method=S256          │
    ├────────────────────────────────────────►│
    │                                         │
    │ 3. User authenticates + consents        │
    │                                         │
    │◄────────────────────────────────────────┤
    │ 4. Redirect to callback                 │
    │    ?code=auth_code&state=random_csrf    │
    │                                         │
    │ 5. POST /token                          │
    │    grant_type=authorization_code        │
    │    &code=auth_code                      │
    │    &redirect_uri=https://app/callback   │
    │    &code_verifier=original_verifier     │
    ├────────────────────────────────────────►│
    │                                         │
    │◄────────────────────────────────────────┤
    │ 6. { access_token, refresh_token, id_token }
    │                                         │
```

### Why PKCE Everywhere

Even confidential clients benefit:
- Protects against authorization code interception
- Defense-in-depth against compromised TLS
- Prevents cross-site request forgery on token endpoint
- No downside -- minimal implementation cost

## DPoP (Demonstration of Proof-of-Possession)

Sender-constrained tokens that cannot be replayed if stolen.

### How It Works
1. Client generates ephemeral key pair (asymmetric)
2. Client creates DPoP proof JWT signed with private key
3. Proof includes: HTTP method, target URI, unique jti, iat
4. Token endpoint binds access token to client's public key (via `cnf` claim)
5. Resource server validates DPoP proof matches token's bound key

### DPoP Proof Structure
```json
{
  "typ": "dpop+jwt",
  "alg": "ES256",
  "jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "..."
  }
}
{
  "jti": "unique-id",
  "htm": "POST",
  "htu": "https://api.example.com/resource",
  "iat": 1700000000,
  "ath": "sha256_of_access_token"
}
```

### Benefits
- Stolen tokens are useless without the private key
- Prevents token replay across different endpoints
- Works with bearer infrastructure (backwards compatible via header)

## Token Binding Patterns

### Access Token Best Practices
- Short-lived (5-15 minutes)
- Audience-restricted (`aud` claim matches resource server)
- Scoped to minimum required permissions
- DPoP-bound when client supports it
- Opaque to clients (JWT or reference -- client doesn't care)

### Refresh Token Security
- One-time use with rotation (each use returns new refresh token)
- Detect reuse: if old refresh token used, revoke entire family
- Bound to client (confidential) or DPoP key (public)
- Absolute expiration (e.g., 30 days) regardless of activity
- Grace period for network issues (accept old token for ~3 seconds)

### ID Token (OpenID Connect)
- Used for authentication only -- never as API authorization
- Validate: issuer, audience, expiration, nonce (if applicable)
- Contains user claims for the client, not for resource servers
- Short-lived, never refreshed (re-authenticate for new ID token)

## Token Storage by Client Type

| Client Type | Access Token | Refresh Token |
|------------|-------------|---------------|
| SPA (browser) | Memory only | BFF pattern (HttpOnly cookie) or none |
| Mobile native | Secure Enclave/Keystore | Secure Enclave/Keystore |
| Server-side | Memory/encrypted store | Encrypted database |
| CLI tool | Memory during session | OS keychain |

### BFF (Backend-for-Frontend) Pattern
For SPAs, the most secure pattern:
- Tokens never touch the browser
- Backend holds tokens, proxies API calls
- Session between SPA and BFF uses HttpOnly/Secure/SameSite cookie
- Eliminates XSS token theft entirely

## Security Checklist

- [ ] PKCE (S256) on all authorization code flows
- [ ] Exact redirect URI matching (no wildcards/patterns)
- [ ] State parameter validated (CSRF prevention)
- [ ] DPoP implemented for high-security APIs
- [ ] Refresh token rotation enabled
- [ ] Token reuse detection with family revocation
- [ ] Access tokens audience-restricted
- [ ] No tokens in URL query parameters or logs
- [ ] PAR (Pushed Authorization Requests) for sensitive flows
- [ ] Token introspection for opaque token validation

## 2026 Context

- OAuth 2.1 RFC finalized -- no excuse for implicit flow
- DPoP adoption growing: major providers (Auth0, Okta, Azure) support it natively
- Transaction tokens (RFC draft) for service-to-service delegation chains
- RAR (Rich Authorization Requests) for fine-grained consent beyond scopes
- GNAP (Grant Negotiation and Authorization Protocol) emerging for next-gen use cases
- Passkeys + OAuth: WebAuthn as authentication, OAuth for authorization remains best practice
