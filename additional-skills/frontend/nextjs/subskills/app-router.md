# App Router

Activate when: route structure, layouts, parallel routes, intercepting routes, route groups, segments, metadata.

## Core Principles

1. **Layouts are persistent** — they don't re-render on navigation. Use for shared UI + data fetching that spans child routes.
2. **Server Components by default** — only add `'use client'` when you need interactivity, browser APIs, or hooks.
3. **Colocation** — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` per segment.
4. **Route groups** `(name)` — organize without affecting URL. Use for auth boundaries, feature grouping.
5. **Parallel routes** `@slot` — render multiple pages simultaneously. Use for dashboards, modals.
6. **Intercepting routes** `(.)path` — show route in context (modal) while preserving direct URL access.

## File Convention

| File | Purpose | Server/Client |
|------|---------|---------------|
| `layout.tsx` | Persistent wrapper, shared data | Server (default) |
| `page.tsx` | Route UI | Server (default) |
| `loading.tsx` | Suspense fallback | Server |
| `error.tsx` | Error boundary | Client (required) |
| `not-found.tsx` | 404 UI | Server |
| `template.tsx` | Re-renders on nav (rare) | Server |
| `default.tsx` | Parallel route fallback | Server |
| `route.ts` | API endpoint (no UI) | Server |

## Decision Table: Layout vs Template vs Page

| Need | Use |
|------|-----|
| Shared UI that persists across child navigations | `layout.tsx` |
| Shared UI that re-mounts on every navigation | `template.tsx` |
| Route-specific content | `page.tsx` |
| Auth boundary for route group | `layout.tsx` in `(auth)` group |

## Parallel Routes Pattern

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">{children}</div>
      <div>{analytics}</div>
      <div>{team}</div>
    </div>
  )
}
// Slots: app/dashboard/@analytics/page.tsx, app/dashboard/@team/page.tsx
```

## Intercepting Routes Pattern (Modal)

```
app/
  feed/
    page.tsx              ← feed list
  photo/
    [id]/
      page.tsx            ← full photo page (direct URL)
  feed/
    (.)photo/[id]/
      page.tsx            ← intercepted: shows as modal over feed
```

## Metadata API

```tsx
// Static
export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'User dashboard',
}

// Dynamic
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  return { title: product.name, description: product.description }
}
```

## Async Params (Next.js 15 Breaking Change)

```tsx
// CORRECT (Next.js 15)
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { slug } = await params
  const { q } = await searchParams
  // ...
}

// WRONG — will error in Next.js 15
export default function Page({ params }: { params: { slug: string } }) {
  // params is now a Promise, not a plain object
}
```

## Route Groups for Auth Boundaries

```
app/
  (public)/
    layout.tsx            ← no auth required
    page.tsx              ← landing
    pricing/page.tsx
  (authenticated)/
    layout.tsx            ← checks session, redirects if unauthenticated
    dashboard/page.tsx
    settings/page.tsx
  (admin)/
    layout.tsx            ← checks admin role
    admin/page.tsx
```

## Common Mistakes

1. Fetching same data in layout + page — use React cache or pass via context.
2. Putting `'use client'` on layout — all children become client components.
3. Missing `default.tsx` for parallel routes — causes 404 on soft navigation.
4. Not awaiting `params`/`searchParams` — runtime error in Next.js 15.
5. Using `redirect()` in try/catch — redirect throws, catch swallows it.
