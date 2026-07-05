---
type: subskill
title: "Subskill: API Security"
---

# Subskill: API Security

> Activate when: rate limit, input validation, output encoding, CORS, CSP, API key, OAuth vs key, mTLS, request signing, idempotency, GraphQL, throttling, WAF.

**Core**: An API is your largest attack surface. Every endpoint is untrusted until the request is authenticated, authorized, validated, and rate-limited. Fail closed.

## Rate Limiting & Throttling

- Per-identity (user/API key) and per-IP limits. Global + per-endpoint (stricter on auth, search, write).
- Algorithms: token bucket (burst-friendly) or sliding window. Enforce at edge/gateway, not just app.
- Return `429` with `Retry-After`; expose `RateLimit-*` headers. Add quotas for expensive operations.

## Input Validation

- Validate at every boundary: type, length, range, format, allowlist. Reject unknown fields (fail closed).
- Schema-validate request bodies (JSON Schema, Zod, Pydantic, OpenAPI). Validate deeply  --  nested objects and arrays too.
- Treat AI/LLM-produced input as untrusted (prompt injection, A04).

## Output Encoding

- Encode per context (HTML, JS, URL, SQL) at the point of output. Set `Content-Type` explicitly with `charset`.
- Never reflect raw input. See `secure-coding.md` for XSS/injection specifics.

## CORS

- Explicit origin allowlist  --  never `Access-Control-Allow-Origin: *` with credentials.
- Restrict methods/headers; short `Access-Control-Max-Age`. Validate the `Origin` header server-side.

## Security Headers / CSP

```
Content-Security-Policy: default-src 'self'; object-src 'none'; frame-ancestors 'none'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```
Prefer nonce/hash-based CSP over `unsafe-inline`. `frame-ancestors` replaces `X-Frame-Options`.

## API Keys vs OAuth

- **API keys**: coarse, long-lived, machine identity. Scope + rotate + hash at rest. OK for internal/partner service auth.
- **OAuth 2.1**: user-delegated access, scoped, short-lived. Use for anything acting on a user's behalf. Don't use raw API keys for user auth.

## mTLS (service-to-service)

- Mutual TLS: both sides present certs. Use for internal service mesh (see `zero-trust.md`). Short-lived certs via SPIFFE/SPIRE, auto-rotated.

## Request Signing & Idempotency

- Sign requests (HMAC over method+path+body+timestamp+nonce) for webhooks/high-value APIs; reject stale timestamps to block replay.
- **Idempotency keys**: client-supplied `Idempotency-Key` header; server dedupes retries on writes (payments) to prevent double-processing.

## GraphQL-Specific

- **Depth limiting**: cap nested query depth to stop recursive abuse.
- **Complexity analysis**: assign cost per field, reject over budget.
- Disable introspection in production. Rate-limit by query cost, not request count.
- Enforce field-level authorization  --  a single deep query can bypass naive endpoint auth.

## Verification

- All endpoints require auth (or explicitly documented public).
- Schema validation + rate limits on every route.
- Security headers present; CORS allowlist verified.

## Delegates To

- **authentication**  --  OAuth/JWT flows.
- **zero-trust**  --  mTLS, per-request verification.
- **secure-coding**  --  injection/encoding details.
