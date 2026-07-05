---
type: fact
title: Next.js 15 Breaking Changes from 14
---

# Next.js 15 Changes

## Breaking Changes

### 1. Caching Defaults Changed
- **Before (14)**: `fetch()` cached by default (`force-cache`). Router Cache cached pages for 30s (dynamic) / 5min (static).
- **After (15)**: `fetch()` NOT cached by default. Router Cache doesn't cache Page components by default.
- **Migration**: Add explicit `cache: 'force-cache'` or `next: { revalidate: N }` to fetches that should be cached.

### 2. Async Request APIs
- **Before (14)**: `cookies()`, `headers()`, `params`, `searchParams` were synchronous.
- **After (15)**: All are async  -  must `await` them.
- **Migration**: Add `await` to all usages. TypeScript will catch these.

```tsx
// Before (14)
const cookieStore = cookies()
const { slug } = params

// After (15)
const cookieStore = await cookies()
const { slug } = await params
```

### 3. React 19 Integration
- `useFormState` → `useActionState` (from `react`, not `react-dom`)
- `ref` is now a regular prop (no `forwardRef` needed)
- `use()` hook for consuming promises/context
- Async components supported natively

### 4. Turbopack Stable for Dev
- `next dev --turbopack` is the default development bundler
- Webpack still used for production builds
- Significant dev server speed improvement

### 5. PPR (Partial Prerendering)
- Experimental but stable enough for production exploration
- Combines static generation + dynamic streaming
- Requires Suspense boundaries to define dynamic holes
- Enable: `experimental: { ppr: 'incremental' }` + `export const experimental_ppr = true` per route

### 6. next.config.ts Support
- TypeScript config file supported natively
- `next.config.js` still works
- Type-safe configuration with `NextConfig` type

### 7. Server Actions Hardened
- Now follow React security guidelines more strictly
- Dead code elimination for unused actions
- Unimportable action IDs are cryptographically hashed

## Non-Breaking Notable Changes

- **Instrumentation**: `instrumentation.ts` stable (not experimental)
- **`<Form>` component**: from `next/form`  -  prefetches, progressively enhances
- **`next/after`**: run code after response is sent (logging, analytics)
- **`forbidden()` / `unauthorized()`**: new error functions with corresponding error files
- **Static indicator**: visual indicator in dev for static routes

## Migration Checklist (14 → 15)

1. Update `next`, `react`, `react-dom` to latest
2. Search for `cookies()`, `headers()`, `params`, `searchParams`  -  add `await`
3. Search for uncached fetches  -  decide caching strategy explicitly
4. Replace `useFormState` with `useActionState`
5. Remove `forwardRef` wrappers (ref is regular prop now)
6. Update `next.config.js` to `.ts` (optional)
7. Test with `next dev --turbopack`
8. Run `next build`  -  fix any new type errors
9. Review `generateMetadata`  -  params are now async too
