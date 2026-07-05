---
type: example
title: "CDN Cache Headers Examples"
---

# CDN Cache Headers Examples

HTTP response header configurations for common caching scenarios.

## Static Assets (Fingerprinted)

Files with content hash in name: `app.a1b2c3.js`, `styles.d4e5f6.css`

```http
HTTP/2 200
Content-Type: application/javascript
Cache-Control: public, max-age=31536000, immutable
Content-Encoding: br
```

Why: filename changes on content change, so cache forever. `immutable` prevents revalidation on browser refresh.

## HTML Pages (CDN-Cached, Browser Revalidates)

```http
HTTP/2 200
Content-Type: text/html; charset=utf-8
Cache-Control: public, s-maxage=3600, max-age=0, stale-while-revalidate=86400
ETag: "page-home-v42"
Vary: Accept-Encoding
Surrogate-Key: page-home locale-en
```

Why: CDN holds for 1h (`s-maxage`), browser always checks freshness (`max-age=0`). CDN can serve stale for 24h while refreshing in background. ETag enables 304 responses. Surrogate-Key enables targeted purge.

## API Responses (Short-Lived, Public)

```http
HTTP/2 200
Content-Type: application/json
Cache-Control: public, s-maxage=30, max-age=0, stale-while-revalidate=300, stale-if-error=3600
Vary: Accept-Encoding, Accept
```

Why: CDN caches 30s, serves stale up to 5min during refresh, serves stale up to 1h if origin errors. Browser never caches (always gets CDN-fresh or validates).

## Personalized API Response

```http
HTTP/2 200
Content-Type: application/json
Cache-Control: private, max-age=60, must-revalidate
ETag: "user-123-v7"
Vary: Authorization
```

Why: `private` prevents CDN/proxy caching. Browser caches 60s. ETag allows efficient revalidation after expiry.

## Sensitive Data (Auth Tokens, PII)

```http
HTTP/2 200
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache
```

Why: `no-store` prevents any cache from storing. `Pragma` for HTTP/1.1 backward compatibility. Use for login responses, tokens, PII.

## User-Uploaded Media (Long-Lived, Purge on Update)

```http
HTTP/2 200
Content-Type: image/webp
Cache-Control: public, max-age=604800, stale-while-revalidate=86400
Surrogate-Key: media user-123-avatar
```

Why: 7-day cache, 1-day stale grace period. Surrogate key enables instant purge when user uploads new avatar.

## GraphQL/POST Responses (Uncacheable by Default)

```http
HTTP/2 200
Content-Type: application/json
Cache-Control: no-store
```

Why: POST responses are not cached by HTTP spec. Make explicit with `no-store`. For cacheable GraphQL queries, use GET with query params and apply API caching headers.

## Service Worker Precache Manifest

```http
HTTP/2 200
Content-Type: application/json
Cache-Control: no-cache
ETag: "manifest-v3"
```

Why: `no-cache` allows storage but forces revalidation every time. Service worker always checks for new manifest, gets 304 if unchanged.

## Comparison Table

| Scenario | Cache-Control | CDN TTL | Browser TTL | Notes |
|----------|--------------|---------|-------------|-------|
| Versioned static | `public, immutable, max-age=1y` | 1 year | 1 year | Filename changes = new URL |
| HTML page | `public, s-maxage=1h, max-age=0` | 1 hour | 0 (revalidate) | ETag for 304 |
| API (public) | `public, s-maxage=30s` | 30s | 0 | stale-while-revalidate |
| API (private) | `private, max-age=60` | None | 60s | Per-user data |
| Sensitive | `no-store` | None | None | Never cache |
| Media | `public, max-age=7d` | 7 days | 7 days | Purge on update |

## Anti-Patterns to Avoid

```http
# BAD: Vary on Cookie for public content (each cookie = separate entry)
Vary: Cookie, Accept-Encoding

# BAD: No explicit caching headers (CDN uses heuristic, unpredictable)
# (missing Cache-Control entirely)

# BAD: Using Expires with Cache-Control (Expires is ignored, confusing)
Cache-Control: max-age=3600
Expires: Thu, 01 Dec 2025 16:00:00 GMT

# BAD: max-age for personalized content (CDN caches wrong user's data)
Cache-Control: public, max-age=300
# Missing: "private" directive
```
