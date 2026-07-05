# OAuth 2.1 & OpenID Connect

## Context

OAuth 2.1 (draft RFC, de facto standard) consolidates OAuth 2.0 best practices into a single specification. PKCE is mandatory, implicit grant is removed, and bearer tokens should be sender-constrained where possible.

## Rules

1. Authorization Code + PKCE is the only grant for interactive users — public and confidential clients
2. Client Credentials grant for machine-to-machine; scope to minimum required permissions
3. Token Exchange (RFC 8693) for delegation and impersonation across service boundaries
4. DPoP binds tokens to client key pairs — prevents token theft via proof-of-possession
5. State parameter prevents CSRF; use cryptographically random, per-request values
6. Redirect URI must be exact-match registered — no wildcards, no localhost in production
7. Authorization servers must support PKCE `S256` method; reject `plain` in production
8. Token response must include `token_type`, `expires_in`, `scope`; omit refresh tokens for public clients unless rotation is enforced
9. OIDC `id_token` is for the client, `access_token` is for the resource server — never send id_tokens to APIs
10. Discovery document (`.well-known/openid-configuration`) is mandatory; hardcoding endpoints is fragile

## Patterns

### Authorization Code + PKCE
```
1. Client generates code_verifier (43-128 chars, unreserved)
2. Client computes code_challenge = BASE64URL(SHA256(code_verifier))
3. Client redirects to /authorize with code_challenge + method=S256
4. User authenticates, AS returns authorization code to redirect_uri
5. Client exchanges code + code_verifier at /token endpoint
6. AS verifies SHA256(code_verifier) == stored code_challenge
7. AS returns access_token + refresh_token (+ id_token if OIDC)
```

### Token Exchange (service-to-service delegation)
```
POST /token
grant_type=urn:ietf:params:oauth:grant-type:token-exchange
subject_token=<original_access_token>
subject_token_type=urn:ietf:params:oauth:token-type:access_token
requested_token_type=urn:ietf:params:oauth:token-type:access_token
audience=<downstream_service>
scope=<narrowed_scope>
```

### DPoP (Proof-of-Possession)
```
1. Client generates ephemeral key pair (ES256)
2. Client creates DPoP proof JWT: {htm: "POST", htu: "/token", iat, jti}
3. Client sends DPoP header with token request
4. AS binds access_token to client's public key (jkt confirmation)
5. Resource server verifies DPoP proof matches token's cnf.jkt
```

## Anti-Patterns

- Using `response_type=token` (implicit) — removed in OAuth 2.1
- Storing authorization codes for replay — codes are single-use, expire in 60s max
- Requesting all scopes upfront — use incremental consent
- Sharing client_secret across environments — unique per deployment
- Skipping `nonce` in OIDC — enables id_token replay attacks

## Verification

- PKCE flow rejects missing/invalid `code_verifier`
- State mismatch returns error, not silent redirect
- Expired authorization code (>60s) is rejected
- Token exchange produces narrower scope than source token
- DPoP proof with wrong `htm`/`htu` is rejected
- Discovery document endpoints match actual server configuration
