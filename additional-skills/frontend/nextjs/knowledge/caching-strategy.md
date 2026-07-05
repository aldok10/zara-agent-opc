---
type: decision
title: Next.js 15 Caching Strategy Guide
---

# Caching Strategy

## The New Default (Next.js 15)

Nothing is cached unless you explicitly opt in. This is the opposite of Next.js 14.

## Layers of Caching

| Layer | What | Default | Control |
|-------|------|---------|---------|
| Request Memoization | React `cache()` deduplicates same fetch in single render | Active | `cache()` wrapper |
| Data Cache | Persistent fetch cache across requests | OFF | `cache: 'force-cache'` or `next: { revalidate }` |
| Full Route Cache | Static HTML/RSC payload at build time | Static routes only | `dynamic` export |
| Router Cache | Client-side cache of visited routes | Pages NOT cached | `staleTimes` config |

## Decision Framework

### When to Cache

| Signal | Cache Strategy |
|--------|---------------|
| Data shared across all users, rarely changes | `cache: 'force-cache'` + `tags` |
| Data shared, updates on known schedule | `next: { revalidate: seconds }` |
| Data changes on write (CRUD) | `next: { tags: ['entity'] }` + `revalidateTag` on mutation |
| Data from CMS with webhooks | Tags + webhook Route Handler calls `revalidateTag` |
| Expensive computation, same inputs | `unstable_cache` with key + tags |
| Build-time data (known at deploy) | `generateStaticParams` + `force-cache` |

### When NOT to Cache

| Signal | Reason |
|--------|--------|
| User-specific data (profile, cart, notifications) | Stale data leaks between users |
| Real-time data (stock prices, live scores) | Requires freshness |
| Auth-gated data that varies per user | Per-user caching is complex and risky |
| Data that changes every request | Cache hit rate would be ~0% |
| POST/mutation responses | Should always be fresh |

## Revalidation Patterns

### Time-Based
```tsx
// Revalidate every hour
fetch(url, { next: { revalidate: 3600 } })
```
Good for: content that updates on a schedule (blog posts, product catalog).

### On-Demand (Tag-Based)
```tsx
// Tag the fetch
fetch(url, { next: { tags: ['products', `product-${id}`] } })

// Invalidate after mutation
'use server'
revalidateTag('products')       // All products
revalidateTag(`product-${id}`)  // Specific product
```
Good for: CRUD operations, CMS webhooks, admin updates.

### On-Demand (Path-Based)
```tsx
revalidatePath('/products')           // Specific page
revalidatePath('/dashboard', 'layout') // Layout + all children
```
Good for: when you don't have granular tags set up.

## Router Cache Configuration

```tsx
// next.config.ts
const config: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,   // Don't cache dynamic pages (default in 15)
      static: 300,  // Cache static pages for 5 min on client
    },
  },
}
```

## Common Patterns

### CMS Webhook Revalidation
```tsx
// app/api/webhooks/cms/route.ts
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const secret = request.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, slug } = await request.json()
  revalidateTag(type)          // e.g., 'blog-post'
  revalidateTag(`${type}-${slug}`)
  return NextResponse.json({ revalidated: true })
}
```

### Data Access Layer with Caching
```tsx
// lib/data/products.ts
import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'

export const getProducts = unstable_cache(
  async () => db.product.findMany({ where: { active: true } }),
  ['products-list'],
  { tags: ['products'], revalidate: 3600 }
)

export const getProduct = unstable_cache(
  async (id: string) => db.product.findUnique({ where: { id } }),
  ['product-detail'],
  { tags: ['products'], revalidate: 3600 }
)
```

## Anti-Patterns

1. Caching user-specific data without user-scoped keys  -  data leak.
2. Setting `revalidate: 0` thinking it disables cache  -  just don't add cache option.
3. Caching without tags  -  can never invalidate precisely.
4. Over-caching (everything cached)  -  stale bugs that are hard to diagnose.
5. Under-caching (nothing cached)  -  unnecessary load on DB/APIs.
