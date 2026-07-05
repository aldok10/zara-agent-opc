# CDN Caching

CDN and edge caching strategies. Cache-Control headers, Vary, stale-while-revalidate, purging, edge compute.

## Rules

1. Set explicit `Cache-Control` on every response -- never rely on CDN defaults (vary by provider)
2. Use `s-maxage` for CDN TTL separate from browser TTL (`max-age`)
3. `stale-while-revalidate` for non-critical content -- serve stale, refresh async in background
4. `Vary` header must list ALL dimensions that change response -- omitting causes cache pollution
5. Minimize `Vary` dimensions -- each unique combination is a separate cache entry (combinatorial explosion)
6. `private` for user-specific responses -- prevents CDN from serving personalized data to others
7. Use surrogate keys (Fastly) or cache tags (Cloudflare) for targeted purging at scale
8. Purge by tag/key, not by URL pattern -- pattern purging misses variants and is slow
9. `no-store` for sensitive data (auth tokens, PII) -- `no-cache` still stores, just revalidates
10. ETag for conditional requests -- 304 saves bandwidth, even if TTL expired
11. `immutable` for versioned static assets (fingerprinted filenames) -- prevents revalidation on refresh
12. Edge compute (Workers, Lambda@Edge) for dynamic cache keys -- personalize without full origin fetch

## Header Recipes

### Static Assets (versioned filename: `app.a1b2c3.js`)
```
Cache-Control: public, max-age=31536000, immutable
```

### API Response (shared, short-lived)
```
Cache-Control: public, s-maxage=60, max-age=0, stale-while-revalidate=300
Vary: Accept-Encoding
```

### Personalized Page (no CDN cache, browser cache OK)
```
Cache-Control: private, max-age=0, must-revalidate
ETag: "user-123-v42"
```

### HTML Page (CDN caches, browser revalidates)
```
Cache-Control: public, s-maxage=3600, max-age=0, stale-while-revalidate=86400
Surrogate-Key: page-home locale-en
Vary: Accept-Encoding, Accept-Language
```

### No Caching (sensitive)
```
Cache-Control: no-store
```

## Purging Strategies

| Method | Use Case | Latency |
|--------|----------|---------|
| Surrogate key / tag purge | Content update, deploy | Seconds |
| URL purge | Single page fix | Seconds |
| Prefix purge | Section redesign | Seconds-minutes |
| Full purge | Major deploy, incident | Minutes (avoid) |
| TTL expiry | Normal rotation | Passive |
| Stale-while-revalidate | Graceful refresh | Zero downtime |

## Anti-Patterns

- `Vary: *` -- disables caching entirely (never cache this response)
- `Vary: Cookie` on public content -- every unique cookie = separate cache entry (millions)
- Missing `Vary: Accept-Encoding` -- serving gzipped content to non-gzip clients
- Short `s-maxage` on high-traffic pages without `stale-while-revalidate` -- thundering herd on expiry
- Purging on every write without batching -- overwhelms purge API rate limits
- Using query strings for cache busting (`?v=123`) -- many CDNs ignore/strip query strings by default

## Edge Compute Patterns

| Pattern | Description |
|---------|-------------|
| Personalization at edge | Inject user-specific content into cached shell |
| A/B test routing | Cache N variants, select at edge by cookie/header |
| Geographic content | Different cache key per country/region |
| Auth at edge | Validate JWT at edge, only forward to origin if valid |
| Request coalescing | Edge holds duplicate requests, single origin fetch |

## Verification

- [ ] All responses have explicit `Cache-Control` header
- [ ] `Vary` header minimal and correct (test with different Accept-Encoding, user agents)
- [ ] Sensitive endpoints return `no-store` (verify with `curl -I`)
- [ ] Cache HIT ratio >80% on CDN dashboard for static assets
- [ ] Purge latency measured and within SLA
- [ ] No `Vary: Cookie` on public cacheable responses
- [ ] Static assets use content-hash filenames + `immutable`
