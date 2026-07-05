---
type: fact
title: "Next.js deployment patterns: Vercel, Docker, Node, static, edge"
---

# Next.js Deployment Guide

## Vercel (Zero-Config)

Default platform. Automatic:
- Edge/Node function splitting per route
- ISR with global CDN invalidation
- Preview deployments per PR
- Analytics, Speed Insights, Web Vitals

Environment variables: Settings > Environment Variables. Use per-environment (Production/Preview/Development).

```bash
# CLI deploy
npx vercel              # preview
npx vercel --prod       # production
```

Tips:
- `vercel.json` only needed for rewrites/headers/redirects beyond `next.config.ts`
- Function timeout: 10s (Hobby), 60s (Pro), 900s (Enterprise)
- Middleware runs at edge globally, <128KB limit

## Docker (Standalone Output)

Enable standalone output in `next.config.ts`:
```ts
// next.config.ts
export default {
  output: 'standalone',
}
```

Complete multi-stage Dockerfile:
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

Image size: ~120MB (vs ~1GB without standalone). Includes only used node_modules.

## Custom Node Server

When needed: WebSocket support, custom metrics, legacy integration, non-standard ports.

```ts
// server.ts
import { createServer } from 'node:http'
import { parse } from 'node:url'
import next from 'next'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  }).listen(3000, () => {
    console.log('> Ready on http://localhost:3000')
  })
})
```

Limitations: loses automatic static optimization, ISR requires custom cache handler, no streaming in some cases.

## Static Export

```ts
// next.config.ts
export default {
  output: 'export',
}
```

Generates `out/` directory with static HTML/CSS/JS.

**Limitations** (features NOT supported):
- Server Components with dynamic data
- Server Actions
- Middleware
- ISR / revalidate
- `headers()`, `cookies()`, `searchParams` in server components
- Dynamic routes without `generateStaticParams`
- Image optimization (use external loader)

**Use when**: documentation sites, landing pages, fully client-side SPAs, S3/CloudFront hosting.

## Edge vs Node Runtime

Set per-route:
```ts
export const runtime = 'edge'   // or 'nodejs' (default)
```

| Factor | Edge | Node |
|--------|------|------|
| Cold start | ~0ms | 250ms+ |
| Max duration | 30s (Vercel) | 60-900s |
| APIs | Web APIs subset | Full Node.js |
| Binary deps | Not supported | Supported |
| File system | Not available | Available |
| Streaming | Yes | Yes |
| DB connections | HTTP-only (Neon, PlanetScale) | TCP + pooling |
| Size limit | 1-4MB (varies by platform) | No practical limit |

**Choose Edge**: auth checks, redirects, A/B tests, geolocation, light transforms.
**Choose Node**: DB queries (non-HTTP), file operations, heavy computation, native modules, external libraries with binary deps.

## Environment Variables

### Rules

| Prefix | Available in | Bundled into client | Secret-safe |
|--------|-------------|--------------------:|:-----------:|
| `NEXT_PUBLIC_` | Server + Client | Yes (inlined at build) | No |
| No prefix | Server only | No | Yes |

```ts
// Server Component / Server Action / Route Handler
process.env.DATABASE_URL           // available
process.env.NEXT_PUBLIC_API_URL    // available

// Client Component
process.env.NEXT_PUBLIC_API_URL    // available (inlined at build)
process.env.DATABASE_URL           // undefined (not exposed)
```

### Build-time vs Runtime

`NEXT_PUBLIC_` vars are **inlined at build time**. Changing them requires rebuild.

For runtime env vars on server:
```ts
// These are read at runtime (server only)
const dbUrl = process.env.DATABASE_URL // read fresh each request
```

For runtime public vars (rare, avoid if possible):
```tsx
// app/layout.tsx - pass from server to client
export default function Layout({ children }) {
  return (
    <html>
      <body>
        <script dangerouslySetInnerHTML={{
          __html: `window.__ENV__=${JSON.stringify({ API_URL: process.env.RUNTIME_API_URL })}`
        }} />
        {children}
      </body>
    </html>
  )
}
```

### .env File Priority (highest to lowest)
1. `.env.$(NODE_ENV).local` (e.g., `.env.production.local`)
2. `.env.local` (NOT loaded in test)
3. `.env.$(NODE_ENV)` (e.g., `.env.production`)
4. `.env`

Never commit `.env.local` or files with secrets. Add to `.gitignore`.
