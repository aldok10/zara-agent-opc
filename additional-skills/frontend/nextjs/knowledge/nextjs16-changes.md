---
type: fact
title: "Next.js 16 Breaking Changes (from 15)"
---

# Next.js 16 Changes (Released October 21, 2025)

## Key Breaking Changes

### 1. Caching: `'use cache'` Directive (biggest change)

v15 model: fetch-level caching with `cache: 'force-cache'` and `unstable_cache`.
v16 model: **Everything is dynamic by default.** Opt-in caching via `'use cache'` directive.

```tsx
// Page-level caching
'use cache'

export default async function Page() {
  const data = await fetchData() // cached because page has 'use cache'
  return <div>{data}</div>
}
```

```tsx
// Function-level caching
async function getUser(id: string) {
  'use cache'
  cacheLife('hours') // TTL: hours
  cacheTag(`user-${id}`) // invalidation tag
  return db.user.findUnique({ where: { id } })
}
```

```tsx
// Invalidation
import { updateTag } from 'next/cache'

async function updateUser(id: string, data: UserData) {
  'use server'
  await db.user.update({ where: { id }, data })
  updateTag(`user-${id}`) // replaces revalidateTag
}
```

### 2. `unstable_cache` Deprecated

Replace with `'use cache'` + `cacheLife` + `cacheTag`:

```tsx
// v15 (deprecated)
import { unstable_cache } from 'next/cache'
const getData = unstable_cache(
  async () => fetchData(),
  ['key'],
  { revalidate: 3600, tags: ['data'] }
)

// v16 (new)
async function getData() {
  'use cache'
  cacheLife('hours')
  cacheTag('data')
  return fetchData()
}
```

### 3. Middleware Renamed to Proxy

`middleware.ts` at project root becomes `proxy.ts`. Same pattern, new name + enhanced capabilities.

```tsx
// proxy.ts (was middleware.ts)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

### 4. Turbopack is Default Bundler

No more `--turbopack` flag needed. Turbopack is the default in v16.
- `next dev` uses Turbopack automatically
- File-system caching for faster subsequent builds (beta)
- Webpack still available via `--webpack` flag if needed for plugin compatibility

### 5. PPR (Partial Prerendering) Production-Ready

No longer experimental. Enable in next.config.ts:

```ts
// next.config.ts
const config: NextConfig = {
  cacheComponents: true, // enables PPR + Cache Components model
}
```

### 6. Sync Request APIs Fully Removed

`cookies()`, `headers()`, `params`, `searchParams` synchronous variants completely removed.
Must use `await`. No more temporary compatibility shim from v15.

## Migration Checklist (15 to 16)

1. Rename `middleware.ts` to `proxy.ts`
2. Replace `unstable_cache` with `'use cache'` directive + `cacheLife` + `cacheTag`
3. Replace `revalidateTag()` with `updateTag()`
4. Replace `revalidatePath()` with `updateTag()` on relevant cache tags
5. Remove `--turbopack` flag from dev scripts (it's default now)
6. Enable `cacheComponents: true` in `next.config.ts` if using PPR
7. Ensure all request API calls are properly awaited (sync shims removed)
8. Update `next.config.ts` to use new config shape

## `cacheLife` Presets

| Preset | Stale | Revalidate | Expire |
|--------|-------|-----------|--------|
| `'seconds'` | 0 | 1s | 60s |
| `'minutes'` | 5min | 1min | 1h |
| `'hours'` | 5min | 1h | 1d |
| `'days'` | 5min | 1d | 7d |
| `'weeks'` | 5min | 1w | 30d |
| `'max'` | 5min | 30d | forever |

Custom profiles in `next.config.ts`:

```ts
const config: NextConfig = {
  cacheLife: {
    dashboard: { stale: 60, revalidate: 300, expire: 3600 }
  }
}
```
