---
type: fact
title: "Next.js 15 production architecture patterns"
---

# Next.js Architecture Patterns

## Folder Structure

```
app/
  (marketing)/        # route group: no /marketing in URL
    page.tsx
  (app)/
    dashboard/
      page.tsx
      loading.tsx
      error.tsx
  api/                # route handlers (prefer server actions for mutations)
  layout.tsx
  global-error.tsx
lib/
  db.ts              # database client
  auth.ts            # auth helpers (Data Access Layer)
  actions/           # shared server actions
  validators.ts     # zod schemas
components/
  ui/                # design system primitives
  features/          # feature-specific components
types/
  index.ts           # shared type definitions
public/
middleware.ts        # auth, redirects, i18n
```

Key rules:
- `app/` = routing only. Minimal logic in page/layout files.
- `lib/` = business logic, data access, utilities.
- `components/` = UI, split by reusability scope.

## Data Access Layer (DAL)

Centralize all DB access + auth checks in `lib/`. Never call DB directly from components.

```ts
// lib/dal.ts
import { cache } from 'react'
import { cookies } from 'next/headers'
import { db } from './db'
import { verifySession } from './auth'

export const getCurrentUser = cache(async () => {
  const session = await verifySession(await cookies())
  if (!session) return null
  return db.user.findUnique({ where: { id: session.userId } })
})

export const getProject = cache(async (id: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  const project = await db.project.findUnique({ where: { id } })
  if (project?.ownerId !== user.id) throw new Error('Forbidden')
  return project
})
```

Benefits: single auth boundary, `cache()` deduplicates per request, testable in isolation.

## Server Action Organization

### Inline (simple, co-located)
```tsx
// app/posts/page.tsx
async function createPost(formData: FormData) {
  'use server'
  // one-off action, tightly coupled to this page
}
```

### Module (shared across pages)
```ts
// lib/actions/posts.ts
'use server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/dal'
import { postSchema } from '@/lib/validators'

export async function createPost(prevState: unknown, formData: FormData) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Unauthorized' }
  const parsed = postSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  await db.post.create({ data: { ...parsed.data, authorId: user.id } })
  revalidatePath('/posts')
  return { success: true }
}
```

Decision: inline for single-use, module for reused across pages, `lib/actions/` for complex multi-step.

## Route Grouping Strategies

```
app/
  (auth)/login/page.tsx        # shared auth layout (no nav)
  (auth)/register/page.tsx
  (dashboard)/layout.tsx       # sidebar + nav layout
  (dashboard)/projects/page.tsx
  (marketing)/layout.tsx       # marketing header/footer
  (marketing)/pricing/page.tsx
```

Groups share layouts without affecting URL. Use for: different nav structures, auth boundaries, loading states.

## Parallel Data Fetching

Never waterfall independent data requests.

```tsx
// app/dashboard/page.tsx
export default async function Dashboard() {
  // Parallel: all start simultaneously
  const [user, projects, notifications] = await Promise.all([
    getCurrentUser(),
    getProjects(),
    getNotifications(),
  ])
  return <DashboardView user={user} projects={projects} notifications={notifications} />
}
```

For independent sections with different loading times, use parallel routes:
```
app/dashboard/
  @analytics/page.tsx    # loads independently
  @activity/page.tsx     # loads independently
  layout.tsx             # receives both as props
```

```tsx
// app/dashboard/layout.tsx
export default function Layout({ children, analytics, activity }) {
  return <div>{children}{analytics}{activity}</div>
}
```

## Error Handling Hierarchy

```
app/
  global-error.tsx     # catches root layout errors (must include <html><body>)
  error.tsx            # catches app-level errors
  dashboard/
    error.tsx          # catches dashboard segment errors
    projects/
      error.tsx        # most specific: project errors
      not-found.tsx    # 404 for this segment
```

```tsx
// app/dashboard/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

Rules:
- `error.tsx` must be `'use client'` (error boundaries are client components).
- Errors bubble up to nearest `error.tsx`.
- `not-found.tsx` is triggered by `notFound()` calls.
- `global-error.tsx` only fires in production.

## Type-safe URL Params

```tsx
// app/projects/[id]/page.tsx
type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab, page } = await searchParams
  // Validate
  const projectId = z.string().uuid().parse(id)
  const currentPage = z.coerce.number().min(1).default(1).parse(page)
  // ...
}
```

In Next.js 15, `params` and `searchParams` are Promises (must await).

For client-side URL state:
```tsx
'use client'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'

function Filters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    params.set(key, value)
    replace(`${pathname}?${params.toString()}`)
  }
}
```
