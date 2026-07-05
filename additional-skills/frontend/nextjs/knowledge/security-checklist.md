---
type: policy
title: Next.js Security Checklist
---

# Security Checklist

## Server Actions (Critical)

Every Server Action is a public HTTP POST endpoint. Anyone can call it with any payload.

### Required in EVERY Server Action

1. **Authenticate**: verify session/token exists and is valid
2. **Authorize**: verify user has permission for THIS operation on THIS resource
3. **Validate input**: parse with zod schema, reject invalid
4. **Accept minimal data**: IDs only, fetch fresh data server-side
5. **Rate limit**: protect against abuse (middleware or per-action)

### Template

```tsx
'use server'

import { z } from 'zod'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'archived']),
})

export async function updateItem(prevState: unknown, formData: FormData) {
  // 1. Rate limit
  const ip = (await headers()).get('x-forwarded-for') ?? 'unknown'
  if (!await rateLimit(ip, 'updateItem', 10)) {
    return { error: 'Too many requests' }
  }

  // 2. Authenticate
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  // 3. Validate
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input' }

  // 4. Authorize (ownership check)
  const item = await db.item.findUnique({ where: { id: parsed.data.id } })
  if (!item || item.ownerId !== session.user.id) {
    return { error: 'Forbidden' }
  }

  // 5. Mutate
  await db.item.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } })
  revalidateTag('items')
  return { success: true }
}
```

## Environment Variables

| Rule | Reason |
|------|--------|
| Never prefix secrets with `NEXT_PUBLIC_` | They get bundled into client JS |
| Validate env at startup with zod | Fail fast on missing config |
| Use different secrets per environment | Limit blast radius |
| Rotate secrets regularly | Reduce exposure window |

## Middleware Security

- Only check session existence/basic validity in middleware
- Full authorization in Server Components/Actions (middleware has limited crypto)
- Always exclude public paths from auth checks
- Set security headers in middleware or next.config

## Security Headers

```tsx
// next.config.ts
const config: NextConfig = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        },
      ],
    },
  ],
}
```

## Data Exposure Prevention

1. **Never pass full DB objects to client**  -  select only needed fields
2. **DTO pattern**: transform server data before sending to client components
3. **`server-only` package**: mark files that should never be imported client-side
4. **Taint API**: `experimental_taintObjectReference` to prevent accidental prop passing

```tsx
// lib/data/user.ts
import 'server-only' // Build error if imported in client component

export async function getUserForClient(id: string) {
  const user = await db.user.findUnique({ where: { id } })
  // Only return safe fields
  return { id: user.id, name: user.name, avatar: user.avatar }
}
```

## Route Handler Security

```tsx
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = (await headers()).get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Verify webhook signature (prevents spoofing)
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

  // Process event...
  return NextResponse.json({ received: true })
}
```

## CSRF Protection

- Server Actions have built-in CSRF protection (Origin header check)
- Route Handlers do NOT  -  verify Origin/Referer for state-changing endpoints
- Webhooks: verify signatures from provider

## Common Vulnerabilities

| Vulnerability | Prevention |
|---------------|-----------|
| Missing auth in Server Action | Always check session first |
| IDOR (accessing other users' data) | Ownership check after auth |
| XSS via user content | Never use `dangerouslySetInnerHTML` without sanitization |
| Secret exposure | `server-only` imports, no `NEXT_PUBLIC_` for secrets |
| Open redirect | Validate redirect URLs against allowlist |
| SSRF in fetch | Validate/allowlist URLs before server-side fetch |
| Prototype pollution | Use zod `.strict()` to reject unknown keys |
