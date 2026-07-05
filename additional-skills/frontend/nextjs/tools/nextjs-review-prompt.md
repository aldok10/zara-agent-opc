---
type: tool
title: "Next.js Code Review"
---

# Next.js Code Review

## Purpose

Review Next.js application code for correctness, performance, and adherence to App Router patterns. Focus on React Server Components, caching strategy, routing, and data fetching.

## When to Use

- Reviewing Next.js pages, layouts, or route handlers
- Evaluating RSC vs client component boundaries
- Debugging caching or revalidation behavior
- Reviewing data fetching patterns and loading states

## Prompt Template

Given the following Next.js code:

```
[paste page/layout/route handler/component code]
```

File path: `[e.g., app/dashboard/page.tsx]`

Review for:

1. **Server vs Client**: Is the server/client boundary correct? Are `'use client'` directives placed at the right level? Is unnecessary client-side code avoided?
2. **Data Fetching**: Is data fetched on the server where possible? Are parallel fetches used (`Promise.all`)? Is the waterfall minimized? Are Suspense boundaries placed well?
3. **Caching**: Is `fetch` cache behavior explicit? Are `revalidate` values appropriate? Is `unstable_cache` or `cache()` used correctly? Is on-demand revalidation set up for mutations?
4. **Routing**: Are route segments organized logically? Are parallel routes or intercepting routes used where beneficial? Are loading/error/not-found boundaries present?
5. **Metadata**: Is metadata exported or generated? Are OG images handled? Is the page title dynamic where needed?
6. **Performance**: Are images using `next/image`? Is font loading optimized? Are client bundles minimal? Is streaming leveraged?
7. **Security**: Are server actions validated? Is user input sanitized? Are environment variables server-only?

Context:
- Next.js version: [14/15]
- Router: [App Router / Pages Router]
- Deployment: [Vercel/self-hosted/edge]
- Data source: [API/DB/CMS]

## Output Format

```
## Next.js Review

### Issues
- [severity] [file:line]  -  [issue]  -  [fix]

### Component Boundaries
- [components that should move server→client or client→server]

### Caching Strategy
- [current behavior]  -  [recommended behavior]

### Data Fetching
- [waterfall/parallel assessment]  -  [optimization]

### Verdict
[approve / request changes / needs architecture discussion]
```
