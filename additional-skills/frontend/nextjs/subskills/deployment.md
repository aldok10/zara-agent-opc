# Deployment

Activate when: deploy, Docker, standalone, Vercel, self-host, CI/CD, build output, environment variables.

## Core Principles

1. **`output: 'standalone'`** for Docker/self-hosted — creates minimal Node.js server with only needed dependencies.
2. **Multi-stage Docker builds** — separate build from runtime for small images.
3. **`HOSTNAME=0.0.0.0`** — required for containerized deployments (not localhost).
4. **Environment variables**: build-time (`NEXT_PUBLIC_*`) vs runtime (server-only). Never expose secrets to client.
5. **Health checks** — add `/api/health` Route Handler for orchestrators.

## Docker Pattern (Multi-Stage)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

## next.config.ts for Standalone

```tsx
import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  // Copies only necessary node_modules into .next/standalone
}

export default config
```

## Environment Variables

| Type | Prefix | Available | Example |
|------|--------|-----------|---------|
| Build-time public | `NEXT_PUBLIC_` | Client + Server | `NEXT_PUBLIC_API_URL` |
| Runtime server-only | None | Server only | `DATABASE_URL`, `AUTH_SECRET` |
| Runtime public | `NEXT_PUBLIC_` | Baked at build | Cannot change at runtime |

**Pattern for runtime config:**
```tsx
// lib/env.ts (server only)
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
```

## Health Check

```tsx
// app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'healthy', timestamp: Date.now() })
}

export const dynamic = 'force-dynamic'
```

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: 'pnpm'
  - run: pnpm install --frozen-lockfile
  - run: pnpm lint
  - run: pnpm test
  - run: pnpm build
  - run: docker build -t app:${{ github.sha }} .
  - run: docker push app:${{ github.sha }}
```

## Decision Table

| Target | Setup |
|--------|-------|
| Vercel | Zero-config, just push. Add env vars in dashboard. |
| Docker / K8s | `output: 'standalone'`, multi-stage Dockerfile |
| AWS (ECS/Fargate) | Standalone + ALB health check on `/api/health` |
| Cloudflare | Edge runtime only, no Node.js APIs |
| Static export | `output: 'export'` — no server features |

## Caching Headers in Production

```tsx
// next.config.ts
const config: NextConfig = {
  output: 'standalone',
  headers: async () => [
    {
      source: '/:all*(svg|jpg|png|webp|avif)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
}
```

## Common Mistakes

1. Missing `HOSTNAME=0.0.0.0` in container — server listens on localhost only.
2. Forgetting to copy `public/` and `.next/static` in Docker — missing assets.
3. Using `NEXT_PUBLIC_` for secrets — they're embedded in client bundle.
4. Not using `--frozen-lockfile` in CI — non-deterministic builds.
5. Skipping health checks — orchestrator can't determine readiness.
6. Running as root in container — security risk.
