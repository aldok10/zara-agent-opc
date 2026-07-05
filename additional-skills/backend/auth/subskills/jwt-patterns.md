# JWT Patterns

## Context

JWTs are bearer credentials for stateless authorization. They trade server-side lookup for cryptographic verification. Design claims for authorization decisions, keep tokens small, and protect against theft with sender-constraining and short lifetimes.

## Rules

1. Access tokens: max 15 minutes expiry, minimal claims (sub, aud, iss, exp, iat, scope/permissions)
2. Refresh tokens: opaque strings stored server-side, not JWTs  -  no reason to make them self-contained
3. Use asymmetric signing (ES256 preferred, RS256 acceptable) for multi-service architectures; symmetric (HS256) only for single-service
4. Always validate: `alg` matches expected, `exp` not past, `iss` matches known issuer, `aud` includes this service, signature valid
5. Reject `alg:none` explicitly  -  whitelist allowed algorithms, never trust header's stated algorithm
6. JWE (encrypted JWT) required when claims contain sensitive attributes  -  use A256GCM or A128CBC-HS256
7. Keep token payload under 1KB  -  large tokens cause header size issues, slow every request
8. Key rotation: publish new key to JWKS, sign with new key, keep old key valid for max token lifetime + clock skew, then remove
9. DPoP binding: include `cnf.jkt` claim to bind token to client's proof-of-possession key
10. `jti` (JWT ID) enables revocation checks and replay detection  -  include for tokens that can be revoked
11. Never put credentials, secrets, or refresh tokens inside JWT claims
12. Nested JWTs (signed then encrypted) when both integrity and confidentiality needed across untrusted intermediaries

## Claims Design

### Access Token (API authorization)
```json
{
  "iss": "https://auth.example.com",
  "sub": "user_abc123",
  "aud": "https://api.example.com",
  "exp": 1720000900,
  "iat": 1720000000,
  "scope": "read:orders write:orders",
  "org_id": "org_xyz",
  "roles": ["order_manager"],
  "jti": "unique-token-id"
}
```

### Service-to-Service Token
```json
{
  "iss": "https://auth.example.com",
  "sub": "service:payment-processor",
  "aud": "https://billing.internal.example.com",
  "exp": 1720000300,
  "iat": 1720000000,
  "scope": "billing:charge billing:refund",
  "jti": "unique-token-id"
}
```

## Key Rotation Procedure

```
1. Generate new key pair, assign new kid
2. Add public key to JWKS endpoint (old + new both published)
3. Start signing new tokens with new kid
4. Wait: max_access_token_lifetime + clock_skew (typically 20min)
5. Remove old public key from JWKS
6. Archive old private key (compliance retention)
```

## Anti-Patterns

- Stuffing user profile data into access tokens (use OIDC userinfo endpoint)
- Using JWT as session cookie replacement without revocation strategy
- Symmetric keys shared across services (compromised service = all tokens forged)
- Not validating audience  -  token intended for Service A accepted by Service B
- Infinite-lived JWTs or >1hr access tokens without sender-constraining
- Using `kid` from untrusted JWT to select verification key without allowlist

## Token Size Optimization

- Use short claim names for custom claims (e.g., `org` not `organization_identifier`)
- Reference permissions by role ID, resolve at resource server
- Move volatile data to introspection endpoint, not token body
- ES256 signatures are ~50% smaller than RS256

## Verification

- Expired token returns 401 with clear error code
- Token with wrong audience is rejected even if signature valid
- `alg:none` token is rejected
- Key rotation produces no auth failures during overlap window
- DPoP-bound token rejected without valid DPoP proof
- Token exceeding size limit flagged during issuance
