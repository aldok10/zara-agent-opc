# Middleware

Activate when: middleware, redirect, auth check, edge runtime, geo-routing, A/B testing, headers, rewrites.

## Core Principles

1. **Single file**: `middleware.ts` at project root (next to `app/`).
2. **Edge Runtime only**  -  no Node.js APIs (no `fs`, no `crypto.randomBytes`, limited `Buffer`).
3. **Runs on EVERY request** unless filtered by `matcher` config.
4. **Fast and light**  -  don't do DB queries or heavy computation. Check tokens/cookies only.
5. **Auth pattern**: verify session cookie/token existence → redirect if missing. Full validation in Server Component/Action.
6. **Compose via early returns**  -  check conditions sequentially, return response or `NextResponse.next()`.

## Structure

```tsx
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Logic here
  return NextResponse.next()
}

// REQUIRED: limit which routes trigger middleware
export const config = {
  matcher: [
    // Match all paths except static files and API routes you want to skip
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
}
```

## Decision Table

| Need | Approach |
|------|----------|
| Auth gate (redirect unauthenticated) | Check session cookie, redirect to /login |
| Role-based access | Check role in token/cookie, redirect or 403 |
| Geo-routing | `request.geo?.country` → rewrite to locale path |
| A/B testing | Set cookie if absent, rewrite to variant |
| Maintenance mode | Check env var, return custom response |
| Rate limiting (basic) | NOT recommended in middleware (use Route Handler or external) |
| Bot detection | Check User-Agent, return 403 or challenge |
| CORS preflight | Handle OPTIONS, set headers |

## Auth Pattern

```tsx
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/login', '/register', '/forgot-password', '/api/webhooks']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check session
  const token = request.cookies.get('session-token')?.value
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Optionally decode JWT to check expiry (edge-compatible libs only)
  // Full verification happens in Server Components/Actions

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

## Headers & Rewrites

```tsx
export function middleware(request: NextRequest) {
  // Add request headers (readable in Server Components via headers())
  const headers = new Headers(request.headers)
  headers.set('x-pathname', request.nextUrl.pathname)
  headers.set('x-search-params', request.nextUrl.searchParams.toString())

  // Rewrite (change destination without changing URL)
  if (request.nextUrl.pathname === '/old-page') {
    return NextResponse.rewrite(new URL('/new-page', request.url))
  }

  return NextResponse.next({ request: { headers } })
}
```

## Geo-Routing

```tsx
export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US'
  const locale = countryToLocale[country] || 'en'

  // Rewrite to localized path
  if (!request.nextUrl.pathname.startsWith(`/${locale}`)) {
    return NextResponse.rewrite(
      new URL(`/${locale}${request.nextUrl.pathname}`, request.url)
    )
  }

  return NextResponse.next()
}
```

## Edge Runtime Constraints

**Available**: `fetch`, `crypto.subtle`, `TextEncoder/Decoder`, `URL`, `Headers`, `Request/Response`, `cookies`, `structuredClone`, `atob/btoa`, `setTimeout`.

**NOT Available**: `fs`, `path`, `child_process`, `net`, `crypto.randomBytes` (use `crypto.getRandomValues`), Node.js streams, most npm packages that use Node APIs.

**Edge-compatible auth libs**: `jose` (JWT), `@edge-runtime/*`, lightweight cookie parsers.

## Common Mistakes

1. Doing DB queries in middleware  -  use it only for routing decisions based on cookies/headers.
2. Missing `matcher`  -  middleware runs on every request including static files.
3. Using Node.js-only libraries  -  will fail at edge runtime.
4. Full JWT validation with secret rotation  -  keep middleware checks lightweight, validate fully in server.
5. Forgetting `NextResponse.next()`  -  request hangs.
6. Infinite redirect loops  -  ensure login page is excluded from auth check.
