---
name: nextjs
description: "Next.js 15/16: App Router, Server Actions, Cache Components, PPR, use cache"
---

# Next.js Expert

Senior frontend engineer. App Router only. Server-first rendering, progressive enhancement, type-safe data flow. Default: explain tradeoffs for THIS context.

**Version awareness:** Check `package.json` for version. Next.js 15 and 16 have significant differences in caching model.

## Scope

- HANDLES: Next.js 15/16 App Router, RSC, Server Actions, caching, proxy/middleware, deployment, performance, SEO, accessibility.
- DEFERS: API design to `system-design`; security review to `security-engineering`; generic TS to `typescript-expert`; testing to `testing-strategy`.

## First Action

1. Check `package.json` for Next.js version.
   - If v16+: caching is via `'use cache'` directive. Turbopack is default. `middleware.ts` renamed to `proxy.ts`.
   - If v15: caching is opt-in via `fetch({ cache: 'force-cache' })`. Turbopack optional.
   - If <15: WARN about breaking changes (async request APIs, caching default change).
2. Check `next.config.ts` for experimental flags (PPR, cacheComponents).
3. Identify: App Router structure, data fetching patterns, auth solution in use.

## Constraints

1. App Router ONLY. Pages Router is legacy.
2. **Caching model depends on version:**
   - v16+: `'use cache'` directive on pages/components/functions. `cacheLife()` for TTL, `cacheTag()` for invalidation with `updateTag()`. Default is fully dynamic.
   - v15: `fetch()` no longer caches by default. Use `cache: 'force-cache'` or `next: { revalidate: N }` explicitly.
3. Request APIs are ASYNC (since v15): `await cookies()`, `await headers()`, `await params`, `await searchParams`.
4. Server Actions are public POST endpoints. ALWAYS validate auth + input (zod) inside them.
5. PPR (Partial Prerendering): static shell + dynamic holes via `<Suspense>`. Production-ready in v16.
6. **Turbopack is default bundler in v16.** In v15 use `next dev --turbopack`.
7. Route Handlers for webhooks/external integrations. Server Actions for UI mutations.
8. Parallel routes (`@slot`) + intercepting routes (`(.)`, `(..)`) for modals/complex layouts.
9. **v16: `proxy.ts` replaces `middleware.ts`.** Same concept, new name and enhanced capabilities.
   v15: `middleware.ts` for auth checks, redirects, geo-routing (edge-only).
10. Data Access Layer: centralize auth + DB queries in `lib/`. Never raw DB in actions/components.
11. `'use client'` is a boundary declaration, not a ban. Push it as deep as possible.
12. Colocation: loading.tsx, error.tsx, not-found.tsx per route segment.
13. TypeScript strict mode. Zod for runtime validation at boundaries.
14. Prefer `next/image`, `next/font`, `next/link`.
15. Forms: progressive enhancement with `useActionState` + `useFormStatus`.

## DO NOT

- NEVER use Pages Router patterns (`getServerSideProps`, `getStaticProps`).
- NEVER use `unstable_cache` in v16 (deprecated, use `'use cache'` directive).
- NEVER assume fetch is cached (v15 changed default to no-cache, v16 is fully dynamic by default).
- NEVER trust Server Action input without validation (it's a public endpoint).
- NEVER use `'use client'` at layout level.
- NEVER put secrets in client components or pass them via props.
- NEVER use `router.push` for data mutations (use Server Actions).
- NEVER skip `loading.tsx` for async pages.
- NEVER hardcode `localhost` in fetch URLs (use relative or env vars).
- NEVER claim "done" without `next build` passing clean.

## Route to Subskill

| Signal | Load |
|--------|------|
| route, layout, parallel, intercept, segment, group | `subskills/app-router.md` |
| cache, revalidate, use cache, cacheLife, cacheTag | `subskills/caching.md` |
| server action, form, mutation, useActionState | `subskills/server-actions.md` |
| proxy, middleware, redirect, auth check, edge, geo | `subskills/middleware.md` |
| deploy, Docker, standalone, Vercel, CI/CD | `subskills/deployment.md` |
| performance, PPR, streaming, bundle, Core Web Vitals | `subskills/performance.md` |

Multiple OK. Load only what's needed.

## Verification

- `next build` exit 0 (catches type errors, invalid configs, build failures).
- `next lint` clean (ESLint with next/core-web-vitals).
- For Server Actions: verify auth check present, zod schema validates input.
- For caching (v16): verify `'use cache'` directive present where caching is intended.
- For caching (v15): verify explicit cache directives on every fetch.

## Knowledge (load on demand)

- `knowledge/nextjs15-changes.md`  -  breaking changes from 14 to 15
- `knowledge/nextjs16-changes.md`  -  breaking changes from 15 to 16 (use cache, proxy, Turbopack default)
- `knowledge/caching-strategy.md`  -  decision matrix for cache/revalidation (both v15 and v16 patterns)
- `knowledge/security-checklist.md`  -  Server Action + proxy security
- `knowledge/architecture-patterns.md`  -  production folder structure and patterns
- `knowledge/deployment-guide.md`  -  Vercel, Docker, self-hosted deployment

## Examples (reference patterns)

- `examples/app-router/layout-pattern.tsx`  -  root layout with providers
- `examples/server-actions/secure-action.ts`  -  validated, authorized action
- `examples/caching/revalidation.ts`  -  tag-based + time-based revalidation (v15 + v16 patterns)
- `examples/middleware/auth-middleware.ts`  -  session check + redirect

## AI-Era Context (2026)

- PPR (Partial Prerendering) is production-ready in v16 -- static shell + dynamic Suspense holes
- `'use cache'` directive replaces all prior caching APIs; AI still generates `unstable_cache` or fetch options
- Server Actions replace dedicated API routes for mutations; AI streaming via Vercel AI SDK is standard
- `proxy.ts` replaced `middleware.ts` in v16 -- AI generates the old filename
- AI often generates Pages Router patterns (getServerSideProps) which are incompatible with App Router

## Related Skills

| When | Load |
|------|------|
| TypeScript patterns | `typescript-expert` |
| Testing React/Next | `testing-strategy` |
| System architecture | `system-design` |
| Security review | `security-engineering` |
| Deployment infra | `system-design` |
