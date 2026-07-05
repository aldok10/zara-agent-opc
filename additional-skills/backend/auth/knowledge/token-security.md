# Token Security

## Threat Model

| Attack | Vector | Mitigation |
|--------|--------|------------|
| Token theft (XSS) | localStorage/sessionStorage exfiltration | httpOnly cookies, CSP |
| Token theft (network) | MitM, insecure transport | TLS, HSTS, cert pinning |
| Token replay | Stolen token reused from different client | DPoP, mTLS binding, short expiry |
| Token leak (logs) | Tokens in URLs, error messages, headers logged | Body-only transport, log sanitization |
| Refresh token theft | Persistent storage compromise | Rotation + reuse detection |
| Key compromise | Signing key leaked | Short tokens + fast rotation, HSM storage |

## Storage Strategies by Platform

### Browser (SPA)
- Access token: in-memory variable (lost on tab close)
- Refresh: httpOnly Secure SameSite=Strict cookie to BFF
- Pattern: Backend-for-Frontend (BFF) holds tokens server-side
- Fallback: httpOnly cookie for access token (increases cookie size)

### Mobile (iOS/Android)
- Access token: in-memory or Keychain/Keystore (encrypted at rest)
- Refresh: Keychain (iOS) or EncryptedSharedPreferences (Android)
- Never: SharedPreferences (Android unencrypted), UserDefaults (iOS unencrypted)

### Server-side
- Access token: in-memory, per-request scope
- Refresh: encrypted in database or secrets manager
- Service credentials: vault with lease, injected at runtime

## DPoP Binding (Token Sender-Constraining)

Prevents stolen tokens from being used by attacker:

```
Client:
1. Generate ephemeral ES256 key pair (per session)
2. For each request, create DPoP proof JWT:
   Header: {"typ": "dpop+jwt", "alg": "ES256", "jwk": <public_key>}
   Payload: {"htm": "POST", "htu": "https://api.example.com/data", "iat": now, "jti": random}
3. Sign with private key
4. Send as DPoP header alongside Authorization: DPoP <access_token>

Server:
1. Extract DPoP proof from header
2. Verify proof signature with embedded public key
3. Verify htm matches request method, htu matches request URL
4. Verify iat is recent (within 60s)
5. Verify jti is unique (replay protection)
6. Verify public key thumbprint matches token's cnf.jkt claim
```

## Refresh Token Rotation with Reuse Detection

```
Normal flow:
  Client → refresh_token_1 → Server returns access_token + refresh_token_2
  Client → refresh_token_2 → Server returns access_token + refresh_token_3

Theft detected (reuse):
  Attacker → refresh_token_1 (already consumed) → Server detects reuse
  Server revokes entire token family (all refresh tokens for this grant)
  Legitimate client's next request with refresh_token_3 also fails → forced re-auth
```

Implementation: store token family ID + consumed flag. Any consumed token reuse = revoke family.

## Short-Lived Token + Introspection

For immediate revocation without refresh delay:
- Access token: 5 minute expiry (no revocation list needed)
- Resource server: validate signature + expiry (fast, no network call)
- For admin-initiated revocation: token introspection endpoint (active: true/false)
- Tradeoff: latency on every request vs revocation speed

## Key Hierarchy

```
Root CA (offline, HSM)
└── Signing Key (per-environment)
    └── Access Tokens (audience-specific)
    └── Refresh Tokens (opaque, server-stored)
    └── ID Tokens (OIDC, audience = client)
```

## Monitoring

- Alert: sudden spike in token validation failures (key compromise, clock skew)
- Alert: refresh token reuse detected (active attack)
- Alert: tokens issued for unknown/unregistered clients
- Metric: token lifetime vs actual usage (tune expiry to real patterns)
- Log: all token revocation events with reason and actor
