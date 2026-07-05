---
type: tool
title: "Next.js Caching Strategy"
---

# Next.js Caching Strategy

## Purpose

Design caching strategy for Next.js applications covering ISR, route segment configuration, fetch cache, and revalidation patterns. Ensures optimal balance between freshness and performance.

## When to Use

- Choosing between static generation, ISR, and dynamic rendering
- Configuring revalidation intervals for data freshness
- Debugging stale content issues in production
- Optimizing cache hit rates for API routes
- Designing cache invalidation with on-demand revalidation

## Prompt Template

```
CONTEXT:
- Next.js version: [13 | 14 | 15]
- App Router or Pages Router: [app | pages]
- Hosting: [Vercel | self-hosted | AWS | Cloudflare]
- Data sources: [CMS | database | external API | mixed]
- Content freshness need: [real-time | minutes | hours | days]
- Traffic pattern: [low | medium | high, geographic distribution]
- Current issues: [stale data | slow TTFB | high origin load]

CACHING LAYERS:
1. Route segment config
   - export const dynamic = 'force-static' | 'force-dynamic' | 'auto'
   - export const revalidate = [seconds | false]
   - export const fetchCache = 'default-cache' | 'only-cache' | 'force-cache'
   - generateStaticParams for static generation at build

2. Fetch-level caching
   - fetch(url, { cache: 'force-cache' }) - default in App Router
   - fetch(url, { next: { revalidate: 60 } }) - time-based ISR
   - fetch(url, { next: { tags: ['posts'] } }) - tag-based invalidation
   - fetch(url, { cache: 'no-store' }) - always dynamic

3. On-demand revalidation
   - revalidatePath('/path') - purge specific route
   - revalidateTag('tag') - purge by cache tag
   - Webhook handler for CMS/external triggers
   - API route for manual purge

4. ISR (Incremental Static Regeneration)
   - Time-based: revalidate after N seconds
   - Stale-while-revalidate behavior
   - On-demand: webhook-triggered regeneration
   - Fallback: 'blocking' vs dynamic rendering

5. Data cache vs full route cache
   - Data cache: individual fetch results
   - Full route cache: rendered HTML/RSC payload
   - Relationship: dynamic fetch opts out of both
   - unstable_cache for non-fetch data (DB queries)

6. Client-side cache
   - Router cache: prefetched route segments
   - Duration: 30s (dynamic) / 5min (static) in v14
   - Invalidation: router.refresh(), revalidation
   - staleTimes configuration (Next.js 15)

SELF-HOSTED CONSIDERATIONS:
- No automatic CDN (need Cloudflare/CloudFront in front)
- ISR requires persistent file storage or custom cache handler
- Custom cache handler for Redis/DynamoDB backing
- Cache warm-up strategy on deployment

DEBUGGING:
- x-nextjs-cache header (HIT/MISS/STALE)
- Cache-Control headers in response
- Build output: static vs dynamic routes
- Logging fetch cache decisions (next.config: logging.fetches)
```

## Output Format

```
## Caching Strategy: [project/feature]

### Route Classification
| Route | Rendering | Revalidation | Rationale |
|-------|-----------|--------------|-----------|
| / | static | 60s | content changes hourly |
| /products/[id] | ISR | on-demand | CMS webhook |
| /dashboard | dynamic | none | user-specific |

### Fetch Configuration
| Data Source | Cache | Revalidate | Tags |
|-------------|-------|-----------|------|
| ... | ... | ... | ... |

### Invalidation Flow
[Event] -> [Webhook/API] -> [revalidateTag/Path] -> [Cache purged]

### Self-Hosted Setup (if applicable)
- CDN configuration
- Cache handler implementation
- Deployment cache warming

### Monitoring
- Cache hit rate by route
- Revalidation frequency
- Stale content alerts

### Trade-offs
- [Freshness vs performance decisions]
- [Cost implications of caching choices]
```
