# Hono Edge

Hono: ultralight web framework for multi-runtime deployment. Same code runs on Cloudflare Workers, Deno, Bun, Node.js, AWS Lambda. Middleware-centric, type-safe RPC mode.

## Core Principles

1. Multi-runtime first -- write once, deploy anywhere via adapters
2. Middleware composition -- small, composable middleware over monolithic plugins
3. Zero dependencies -- Hono core has no external deps
4. Web Standard APIs -- Request/Response, no proprietary abstractions

## Basic Structure

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

app.post('/users',
  zValidator('json', z.object({ name: z.string(), email: z.string().email() })),
  async (c) => {
    const data = c.req.valid('json'); // fully typed
    const user = await createUser(data);
    return c.json(user, 201);
  }
);

export default app;
```

## Adapters (Runtime-specific entry points)

```typescript
// Node.js
import { serve } from '@hono/node-server';
import app from './app.js';
serve({ fetch: app.fetch, port: 3000 });

// Cloudflare Workers (wrangler.toml points to this)
export default app;

// Bun
export default { fetch: app.fetch, port: 3000 };

// AWS Lambda
import { handle } from 'hono/aws-lambda';
export const handler = handle(app);
```

## Middleware

```typescript
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { rateLimiter } from 'hono-rate-limiter';

app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', timing());
app.use('/api/*', cors({ origin: ['https://app.example.com'] }));
```

Custom middleware:

```typescript
import type { MiddlewareHandler } from 'hono';

export const authMiddleware: MiddlewareHandler<{ Variables: { userId: string } }> = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ code: 'UNAUTHORIZED' }, 401);
  const payload = await verifyToken(token);
  c.set('userId', payload.sub);
  await next();
};
```

## RPC Mode (Type-safe client)

```typescript
// server
const routes = app
  .get('/users', async (c) => c.json(await getUsers()))
  .post('/users', zValidator('json', createUserSchema), async (c) => {
    return c.json(await createUser(c.req.valid('json')), 201);
  });

export type AppType = typeof routes;

// client (separate package or frontend)
import { hc } from 'hono/client';
import type { AppType } from '../server/app.js';

const client = hc<AppType>('http://localhost:3000');
const res = await client.users.$post({ json: { name: 'Alice', email: 'a@b.com' } });
const user = await res.json(); // fully typed response
```

## Cloudflare Workers Specifics

```typescript
import { Hono } from 'hono';

type Bindings = { DB: D1Database; KV: KVNamespace; AI: Ai };

const app = new Hono<{ Bindings: Bindings }>();

app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM users LIMIT 50').all();
  return c.json(results);
});

app.get('/cache/:key', async (c) => {
  const value = await c.env.KV.get(c.req.param('key'));
  if (!value) return c.notFound();
  return c.text(value);
});
```

## Route Groups

```typescript
const api = new Hono();
api.route('/users', usersApp);
api.route('/orders', ordersApp);

const app = new Hono();
app.route('/api/v1', api);
app.get('/', (c) => c.text('Root'));
```

## Error Handling

```typescript
import { HTTPException } from 'hono/http-exception';

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ code: err.message, status: err.status }, err.status);
  }
  console.error(err);
  return c.json({ code: 'INTERNAL_ERROR' }, 500);
});

app.notFound((c) => c.json({ code: 'NOT_FOUND', message: `${c.req.path} not found` }, 404));
```

## Testing

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from './app.js';

test('GET /health returns ok', async () => {
  const res = await app.request('/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { status: 'ok' });
});

test('POST /users validates input', async () => {
  const res = await app.request('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '' }),
  });
  assert.equal(res.status, 400);
});
```

## When Hono vs Fastify

| Factor | Hono | Fastify |
|--------|------|---------|
| Edge/multi-runtime | Yes | Node-only |
| Full-featured (sessions, CORS, etc.) | Bring your own | Batteries included |
| Performance (Node) | Very fast | Fastest |
| Ecosystem plugins | Growing | Mature |
| Bundle size | ~14KB | N/A (server) |
| Type-safe RPC client | Built-in | No |
