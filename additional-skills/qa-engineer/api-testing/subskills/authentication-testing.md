# Authentication Testing

## Token Lifecycle Testing

```typescript
describe("Token lifecycle", () => {
  it("valid token: returns 200 with user context", async () => {
    const token = await getValidToken({ sub: "user-1", role: "admin" });
    const res = await api.get("/profile").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("user-1");
  });

  it("expired token: returns 401 with clear error", async () => {
    const token = signJwt({ sub: "user-1" }, { expiresIn: "-1h" });
    const res = await api.get("/profile").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("revoked token: returns 401 even if signature valid", async () => {
    const token = await getValidToken({ sub: "user-1" });
    await revokeToken(token);
    const res = await api.get("/profile").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("malformed token: returns 401, no stack trace leaked", async () => {
    const res = await api.get("/profile").set("Authorization", "Bearer not.a.jwt");
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty("stack");
  });
});
```

## Role-Based Access Control

```typescript
const matrix = [
  { role: "admin", endpoint: "DELETE /users/42", expected: 200 },
  { role: "user", endpoint: "DELETE /users/42", expected: 403 },
  { role: "anonymous", endpoint: "DELETE /users/42", expected: 401 },
  { role: "user", endpoint: "GET /users/me", expected: 200 },
  { role: "anonymous", endpoint: "GET /users/me", expected: 401 },
];

matrix.forEach(({ role, endpoint, expected }) => {
  it(`${role} on ${endpoint} returns ${expected}`, async () => {
    const [method, path] = endpoint.split(" ");
    const token = role === "anonymous" ? null : await tokenFor(role);
    const req = api[method.toLowerCase()](path);
    if (token) req.set("Authorization", `Bearer ${token}`);
    const res = await req;
    expect(res.status).toBe(expected);
  });
});
```

## OAuth2 Flows Testing

- **Authorization Code**: simulate redirect, exchange code for token, verify PKCE challenge
- **Client Credentials**: machine-to-machine; test with valid/invalid client_id+secret pairs
- **Refresh Token**: exchange refresh token for new access token; verify old access token invalidated
- Test token introspection endpoint returns correct `active` field
- Verify scopes restrict access: token with `read:users` cannot `write:users`

## JWT Validation Checklist

| Check | Test Case |
|-------|-----------|
| Signature | Token signed with wrong key returns 401 |
| Algorithm | `alg: none` attack rejected |
| Expiry (`exp`) | Token past expiry rejected |
| Not Before (`nbf`) | Token used before nbf rejected |
| Audience (`aud`) | Token for different service rejected |
| Issuer (`iss`) | Token from unknown issuer rejected |
| Subject (`sub`) | Token without sub treated as anonymous |

## API Key Patterns

```typescript
// Header-based (preferred)
it("valid API key in header", async () => {
  const res = await api.get("/data").set("X-API-Key", validKey);
  expect(res.status).toBe(200);
});

// Query parameter (legacy, avoid for new APIs)
it("API key in query param still works", async () => {
  const res = await api.get(`/data?api_key=${validKey}`);
  expect(res.status).toBe(200);
});

// Verify key rotation: old key rejected after rotation
it("rotated key no longer valid", async () => {
  await rotateKey(validKey);
  const res = await api.get("/data").set("X-API-Key", validKey);
  expect(res.status).toBe(401);
});
```

## Rate Limiting Per Authentication Tier

- Anonymous: 10 req/min; authenticated user: 100 req/min; premium: 1000 req/min
- Test: send N+1 requests, verify 429 response with `Retry-After` header
- Verify rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Test that rate limits reset correctly after window expires

## CORS and CSRF Verification

```typescript
it("CORS: allows configured origins only", async () => {
  const res = await api.options("/data").set("Origin", "https://evil.com");
  expect(res.headers["access-control-allow-origin"]).not.toBe("https://evil.com");
});

it("CSRF: state-changing request without token returns 403", async () => {
  const res = await api.post("/transfer").send({ amount: 100 });
  expect(res.status).toBe(403);
});

it("CSRF: valid token in header passes", async () => {
  const csrfToken = await getCsrfToken();
  const res = await api.post("/transfer")
    .set("X-CSRF-Token", csrfToken)
    .send({ amount: 100 });
  expect(res.status).toBe(200);
});
```
