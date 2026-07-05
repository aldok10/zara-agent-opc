---
type: subskill
title: "Fastify Patterns"
---

# Fastify Patterns

Fastify 5 architecture: plugins as units of encapsulation, lifecycle hooks for cross-cutting concerns, type providers for schema-driven development.

## Core Principles

1. Everything is a plugin -- routes, services, decorators all wrapped in `fastify-plugin` or scoped
2. Encapsulation by default -- child contexts inherit parent, never leak up
3. Schema-first validation -- JSON Schema or Zod (via type providers) validates at the framework level
4. Serialization matters -- `response` schemas enable fast-json-stringify (2-5x faster than JSON.stringify)

## Plugin Architecture

```typescript
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

// Decorated plugins (shared across scopes) use fp()
const dbPlugin: FastifyPluginAsync<{ connectionString: string }> = async (fastify, opts) => {
  const pool = createPool(opts.connectionString);
  fastify.decorate('db', pool);
  fastify.addHook('onClose', async () => pool.end());
};
export const autoConfig = { connectionString: '' }; // default opts
export default fp(dbPlugin, { name: 'db-plugin' });
```

Scoped plugins (no `fp()` wrapper) create isolated contexts:

```typescript
// routes/users.ts -- naturally scoped
import type { FastifyPluginAsync } from 'fastify';

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // This hook only applies to routes in THIS plugin
  fastify.addHook('onRequest', async (req) => { /* auth check */ });

  fastify.get('/', { schema: listUsersSchema }, listUsersHandler);
  fastify.post('/', { schema: createUserSchema }, createUserHandler);
};
```

## Lifecycle Hooks (order)

1. `onRequest` -- earliest, auth/rate-limiting
2. `preParsing` -- before body parse, content-type handling
3. `preValidation` -- before schema validation, transform input
4. `preHandler` -- after validation, before handler (ACL checks)
5. `preSerialization` -- modify response before serialization
6. `onSend` -- modify payload/headers after serialization
7. `onResponse` -- after response sent, logging/metrics
8. `onError` -- error occurred, custom error formatting

## Type Providers (Zod)

```typescript
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const app = fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.post('/users', {
  schema: {
    body: z.object({ name: z.string().min(1), email: z.string().email() }),
    response: { 201: z.object({ id: z.string().uuid(), name: z.string() }) },
  },
}, async (req, reply) => {
  // req.body is fully typed as { name: string; email: string }
  const user = await createUser(req.body);
  return reply.status(201).send(user);
});
```

## Registration Order

```typescript
// 1. Infrastructure plugins (db, cache, logger config)
await app.register(dbPlugin, { connectionString: config.DATABASE_URL });
await app.register(cachePlugin);

// 2. Decorators and shared utilities
await app.register(authPlugin);

// 3. Application routes (auto-loaded or manual)
await app.register(usersRoutes, { prefix: '/api/users' });
await app.register(ordersRoutes, { prefix: '/api/orders' });
```

## Error Handling

```typescript
app.setErrorHandler(async (error, request, reply) => {
  if (error.validation) {
    return reply.status(422).send({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.validation,
    });
  }
  request.log.error(error);
  return reply.status(error.statusCode ?? 500).send({
    code: error.code ?? 'INTERNAL_ERROR',
    message: error.statusCode && error.statusCode < 500 ? error.message : 'Internal server error',
  });
});
```

## Auto-loading

```typescript
import autoLoad from '@fastify/autoload';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

await app.register(autoLoad, { dir: join(__dirname, 'plugins'), encapsulate: false });
await app.register(autoLoad, { dir: join(__dirname, 'routes') });
```

## Testing

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('POST /users creates user', async () => {
  const app = await buildApp({ testing: true });
  const res = await app.inject({
    method: 'POST',
    url: '/api/users',
    payload: { name: 'Test', email: 'test@example.com' },
  });
  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.ok(body.id);
});
```

## Performance Tips

- Always define `response` schemas -- enables fast-json-stringify
- Use `fastify.inject()` for testing (no TCP overhead)
- Prefer `reply.send()` over returning -- avoids extra wrapping in some cases
- Use `{ logLevel: 'warn' }` on health check routes to reduce log noise
- Enable HTTP/2 for multiplexed connections: `fastify({ http2: true })`
