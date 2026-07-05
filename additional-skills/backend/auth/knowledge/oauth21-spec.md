# OAuth 2.1 Specification Summary

## Key Differences from OAuth 2.0

| Change | OAuth 2.0 | OAuth 2.1 |
|--------|-----------|-----------|
| PKCE | Optional extension | Mandatory for all authorization code flows |
| Implicit grant | Available | Removed entirely |
| ROPC grant | Available | Removed entirely |
| Bearer tokens | Default | Sender-constraining recommended (DPoP) |
| Refresh tokens | Optional rotation | Rotation required for public clients |
| Redirect URIs | Pattern matching allowed | Exact string match only |
| Client authentication | Secret in body/header | Asymmetric methods recommended (private_key_jwt) |

## Grants Available in OAuth 2.1

### Authorization Code (with PKCE)
- Use: interactive users (web, mobile, SPA, desktop)
- Flow: redirect to AS → user auth → code returned → exchange code for tokens
- PKCE required for both public and confidential clients

### Client Credentials
- Use: machine-to-machine, service accounts, background jobs
- Flow: direct POST to /token with client authentication
- No user context, no refresh token

### Device Authorization (RFC 8628)
- Use: input-constrained devices (TV, IoT, CLI)
- Flow: device gets user_code → user enters at verification_uri → device polls for token

### Token Exchange (RFC 8693)
- Use: delegation, impersonation, cross-service token translation
- Flow: present existing token, receive new token with different audience/scope

## Security Requirements

1. TLS required for all endpoints (authorization, token, redirect)
2. Redirect URI: exact match, no wildcard, registered per client
3. Authorization codes: single-use, max 60 second lifetime, bound to client + redirect_uri
4. State parameter: mandatory, cryptographically random, tied to user session
5. Token endpoint: confidential clients must authenticate; prefer private_key_jwt over client_secret
6. Access tokens: should be audience-restricted; resource servers validate aud claim
7. Refresh tokens: bound to client, rotated on use (public), revocable, no scope escalation

## Token Endpoint Responses

### Success
```json
{
  "access_token": "eyJ...",
  "token_type": "DPoP",
  "expires_in": 900,
  "refresh_token": "opaque-string",
  "scope": "read write"
}
```

### Error
```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired or already used"
}
```

## OIDC Layer (on top of OAuth 2.1)

- Adds `openid` scope to trigger id_token issuance
- id_token: JWT proving user identity TO THE CLIENT (not resource server)
- UserInfo endpoint: profile data retrieval with access_token
- Discovery: `/.well-known/openid-configuration` for all endpoints and supported features
- Claims: standard (sub, email, name, picture) + custom
- nonce: required in id_token to prevent replay (maps to auth request)

## DPoP (RFC 9449)

Sender-constrains tokens by binding to client's ephemeral key pair:
- Client generates proof JWT on each request
- Token includes `cnf.jkt` (confirmation key thumbprint)
- Resource server verifies proof matches token binding
- Prevents stolen token reuse (attacker lacks private key)
