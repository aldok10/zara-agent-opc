# Caching

Activate when: cache, revalidate, ISR, stale data, fetch options, use cache, cacheTag, cacheLife, unstable_cache.

## Version-Dependent Model

**Check Next.js version first.** The caching model is fundamentally different between v15 and v16.

## Next.js 16 Model (October 2025+)

Everything is **dynamic by default**. Cache explicitly with `'use cache'` directive.

### `'use cache'` Directive

```tsx
// Page-level: entire page is cached
'use cache'

export default async function ProductsPage() {
  const products = await db.product.findMany()
  return <ProductList items={products} />
}
```

```tsx
// Function-level: only this function is cached
async function getUser(id: string) {
  'use cache'
  cacheLife('hours')        // TTL preset
  cacheTag(`user-${id}`)   // invalidation tag
  return db.user.findUnique({ where: { id } })
}
```

### Invalidation (v16)

```tsx
import { updateTag } from 'next/cache'

// In Server Action
async function updateUser(id: string, data: FormData) {
  'use server'
  await db.user.update({ where: { id }, data: parseData(data) })
  updateTag(`user-${id}`)  // invalidates all 'use cache' with this tag
}
```

### cacheLife Presets

| Preset | Stale | Revalidate | Expire |
|--------|-------|-----------|--------|
| `'seconds'` | 0 | 1s | 60s |
| `'minutes'` | 5min | 1min | 1h |
| `'hours'` | 5min | 1h | 1d |
| `'days'` | 5min | 1d | 7d |
| `'weeks'` | 5min | 1w | 30d |
| `'max'` | 5min | 30d | forever |

---

## Next.js 15 Model (still relevant for v15 projects)

## Fetch Caching Options

```tsx
// No caching (DEFAULT in Next.js 15)
const data = await fetch(url)

// Cache indefinitely until revalidated
const data = await fetch(url, { cache: 'force-cache' })

// Time-based revalidation (seconds)
const data = await fetch(url, { next: { revalidate: 3600 } })

// Tag-based revalidation
const data = await fetch(url, { next: { tags: ['products'] } })

// Never cache, always fresh
const data = await fetch(url, { cache: 'no-store' })
```

## Decision Matrix

| Scenario | Strategy | Config |
|----------|----------|--------|
| Static content (docs, blog) | Static + ISR | `revalidate: 3600` or `force-cache` |
| User-specific data | No cache | Default (no option needed) |
| Shared data, updates occasionally | Tag-based | `tags: ['entity']` + `revalidateTag` |
| Real-time data | No cache | Default |
| Expensive computation | `unstable_cache` | With tags for invalidation |
| Static at build time | `generateStaticParams` | `force-cache` |

## On-Demand Revalidation

```tsx
// In a Server Action or Route Handler
import { revalidateTag, revalidatePath } from 'next/cache'

// Revalidate all fetches tagged 'products'
revalidateTag('products')

// Revalidate a specific path
revalidatePath('/products')

// Revalidate a layout (all child pages)
revalidatePath('/dashboard', 'layout')
```

## unstable_cache (v15 only, deprecated in v16)

```tsx
import { unstable_cache } from 'next/cache'

// v15 pattern: wrap non-fetch data for persistent caching
const getCachedUser = unstable_cache(
  async (userId: string) => {
    return db.user.findUnique({ where: { id: userId } })
  },
  ['user-by-id'],  // cache key parts
  {
    tags: ['users'],
    revalidate: 900, // 15 minutes
  }
)
// In v16: replace with 'use cache' + cacheLife + cacheTag
```

## 'use cache' Directive (v15: experimental, v16: stable)

```tsx
// v16: stable, primary caching mechanism
// v15: requires experimental.dynamicIO in next.config
async function getProducts() {
  'use cache'
  cacheLife('hours')
  cacheTag('products')
  return db.product.findMany()
}
```

## React cache() (Request Deduplication)

```tsx
import { cache } from 'react'

// Same call in layout + page = one actual execution
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})
```

## Route Segment Config

```tsx
// Force entire route segment behavior
export const dynamic = 'force-dynamic'    // never cache
export const dynamic = 'force-static'     // always static
export const revalidate = 3600            // ISR interval
export const fetchCache = 'force-cache'   // cache all fetches in segment
```

## Common Mistakes

1. Assuming fetch is cached (Next.js 14 behavior) — it's NOT in 15.
2. Using `revalidate: 0` thinking it means "no cache" — use `cache: 'no-store'` or just omit cache options.
3. Mixing `cache: 'force-cache'` with `revalidate` in same fetch — use `next: { revalidate }` instead.
4. Not tagging fetches — makes on-demand revalidation impossible.
5. Using `revalidatePath('/')` thinking it invalidates everything — it only invalidates that exact path.
6. Caching user-specific data — stale data leak between users.
7. Forgetting React `cache()` is per-request only — not persistent across requests.
