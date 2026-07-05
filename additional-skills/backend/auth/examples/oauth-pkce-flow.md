---
type: example
title: "OAuth 2.1 PKCE Flow  -  Step by Step"
---

# OAuth 2.1 PKCE Flow  -  Step by Step

## Prerequisites
- Client registered with AS (client_id, redirect_uri)
- HTTPS on all endpoints
- Crypto library available (for SHA-256 + base64url)

## Step 1: Generate PKCE Verifier and Challenge

```typescript
// Generate code_verifier: 43-128 characters from unreserved set [A-Z,a-z,0-9,-._~]
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64url(array); // 43 chars
}

// Generate code_challenge: BASE64URL(SHA256(code_verifier))
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64url(new Uint8Array(digest));
}

const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);
// Store codeVerifier in session (server-side) or memory (SPA)
```

## Step 2: Authorization Request

```http
GET /authorize
  ?response_type=code
  &client_id=app_123
  &redirect_uri=https://app.example.com/callback
  &scope=openid profile email
  &state=random-csrf-token
  &nonce=random-replay-prevention
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
Host: auth.example.com
```

Store `state` and `nonce` in session for verification on callback.

## Step 3: User Authenticates

User enters credentials (or uses passkey) at authorization server. AS validates identity, checks consent, generates authorization code.

## Step 4: Authorization Code Callback

```http
HTTP/1.1 302 Found
Location: https://app.example.com/callback
  ?code=SplxlOBeZQQYbYS6WxSbIA
  &state=random-csrf-token
```

Client verifies:
- `state` matches stored value (CSRF protection)
- `code` is present (no error parameter)

## Step 5: Token Exchange

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https://app.example.com/callback
&client_id=app_123
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

For confidential clients, also include client authentication (private_key_jwt or client_secret_post).

## Step 6: Token Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "8xLOxBtZp8",
  "scope": "openid profile email",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Step 7: Validate ID Token

```typescript
import * as jose from 'jose';

const JWKS = jose.createRemoteJWKSet(
  new URL('https://auth.example.com/.well-known/jwks.json')
);

const { payload } = await jose.jwtVerify(idToken, JWKS, {
  issuer: 'https://auth.example.com',
  audience: 'app_123',
});

// Verify nonce matches stored value
if (payload.nonce !== storedNonce) {
  throw new Error('ID token replay detected');
}
```

## Step 8: Use Access Token

```http
GET /api/userinfo HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

## Step 9: Refresh Token Rotation

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=8xLOxBtZp8
&client_id=app_123
```

Response includes NEW refresh token. Old one is invalidated. Reuse of old token = compromise signal → revoke family.

## Security Checklist

- [ ] code_verifier is 43+ characters, cryptographically random
- [ ] code_challenge_method is S256 (never plain)
- [ ] state is per-request, verified on callback
- [ ] nonce is included and verified in id_token
- [ ] Redirect URI is exact match (no patterns)
- [ ] Authorization code used once, within 60 seconds
- [ ] Refresh token stored securely, rotated on use
- [ ] Access token validated: sig + exp + iss + aud + alg
