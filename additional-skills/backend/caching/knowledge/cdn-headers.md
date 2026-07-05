# CDN Cache Headers

HTTP caching headers reference. Cache-Control directives, Vary, ETag, conditional requests.

## Cache-Control Directives

| Directive | Applies To | Meaning |
|-----------|-----------|---------|
| `public` | Response | Any cache (CDN, proxy, browser) may store |
| `private` | Response | Only browser may store (not CDN/proxy) |
| `no-cache` | Both | Store allowed, but MUST revalidate before use |
| `no-store` | Both | Do not store at all (sensitive data) |
| `max-age=N` | Both | Fresh for N seconds (browser TTL) |
| `s-maxage=N` | Response | CDN/proxy TTL (overrides max-age for shared caches) |
| `must-revalidate` | Response | After max-age expires, must revalidate (no stale) |
| `proxy-revalidate` | Response | Like must-revalidate but only for shared caches |
| `immutable` | Response | Never revalidate (even on user refresh) -- use with fingerprinted URLs |
| `stale-while-revalidate=N` | Response | Serve stale for N seconds while refreshing in background |
| `stale-if-error=N` | Response | Serve stale for N seconds if origin returns 5xx |
| `no-transform` | Response | Proxies must not modify content (no image compression) |

## Vary Header

Tells caches which request headers create distinct cache entries:
```
Vary: Accept-Encoding              -- gzip vs brotli vs identity
Vary: Accept-Language              -- per-language cache entries
Vary: Accept-Encoding, Accept-Language  -- combinatorial entries
```

- Each unique combination of Vary headers = separate cache entry
- `Vary: *` = never cache (effectively disables caching)
- Keep Vary dimensions minimal to maximize cache efficiency
- Never `Vary: Cookie` on public responses (each user = separate entry)

## ETag and Conditional Requests

```
-- Server response:
HTTP/1.1 200 OK
ETag: "abc123"
Cache-Control: max-age=0, must-revalidate

-- Client revalidation:
GET /resource
If-None-Match: "abc123"

-- Server (unchanged):
HTTP/1.1 304 Not Modified
-- (no body, saves bandwidth)

-- Server (changed):
HTTP/1.1 200 OK
ETag: "def456"
[full body]
```

- Strong ETag: byte-for-byte identical (`"abc123"`)
- Weak ETag: semantically equivalent (`W/"abc123"`)
- Use Last-Modified / If-Modified-Since for time-based (less precise than ETag)

## Common Recipes

### Versioned static asset (`app.a1b2c3.js`)
```
Cache-Control: public, max-age=31536000, immutable
```

### HTML page (CDN caches 1h, browser always revalidates)
```
Cache-Control: public, s-maxage=3600, max-age=0, must-revalidate
ETag: "page-v42"
Vary: Accept-Encoding
```

### API response (shared cache 60s, stale OK for 5min during refresh)
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300, stale-if-error=3600
Vary: Accept-Encoding, Authorization
```

### Personalized response (browser only, short TTL)
```
Cache-Control: private, max-age=60
```

### Sensitive data (no caching anywhere)
```
Cache-Control: no-store
Pragma: no-cache
```

### CDN-cached with surrogate keys (Fastly/Varnish)
```
Cache-Control: public, s-maxage=86400
Surrogate-Key: product-123 category-electronics
Surrogate-Control: max-age=86400
```

## Header Precedence

1. `no-store` — trumps everything, never cache
2. `no-cache` — may store but must revalidate on every use
3. `s-maxage` — overrides `max-age` for shared caches (CDN)
4. `max-age` — freshness lifetime for all caches
5. `Expires` header — legacy, ignored if `Cache-Control` present

## Debugging

```bash
# Check response headers
curl -sI https://example.com/resource | grep -i cache

# Verify CDN cache status (varies by provider)
# Cloudflare: cf-cache-status: HIT|MISS|EXPIRED|DYNAMIC
# Fastly: x-cache: HIT|MISS
# CloudFront: x-cache: Hit from cloudfront

# Force cache bypass
curl -H "Cache-Control: no-cache" https://example.com/resource
```
