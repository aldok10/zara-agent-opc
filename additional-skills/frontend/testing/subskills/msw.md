---
name: msw
trigger: "API mocking, network interception, MSW handlers, GraphQL mocking, test isolation"
---

# MSW (Mock Service Worker) v2

## Activation

User needs API mocking for tests, development-time mocking, or network interception at the service worker level.

## Core Principles

- Mock at network level, not at import level  -  tests hit real fetch/axios code
- Handlers define API contract  -  reusable across tests and dev
- Per-test overrides for error states and edge cases
- Same handlers work in browser (service worker) and Node (interceptor)
- MSW v2 uses `http.*` and `graphql.*` namespaces

## Decision Table

| Scenario | Approach |
|----------|----------|
| REST API mock | `http.get/post/put/patch/delete` handlers |
| GraphQL mock | `graphql.query/mutation` handlers |
| Error scenario | `server.use()` override in specific test |
| Delay/timeout | `delay()` in response |
| Dynamic response | Read `request` body/params in handler |
| Test isolation | `server.resetHandlers()` in afterEach |
| Dev environment | Browser integration with `worker.start()` |

## Patterns

### Setup (Node  -  for Vitest/Jest)

```ts
// src/test/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```ts
// src/test/setup.ts
import { server } from './server';
import { afterAll, afterEach, beforeAll } from 'vitest';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### REST Handlers

```ts
// src/test/handlers.ts
import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ]);
  }),

  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Alice',
      email: 'alice@example.com',
    });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '3', ...body }, { status: 201 });
  }),

  http.delete('/api/users/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### Error Scenario Override

```ts
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';

test('shows error state on 500', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    })
  );

  // render component, assert error UI
});
```

### GraphQL Handlers

```ts
import { graphql, HttpResponse } from 'msw';

export const graphqlHandlers = [
  graphql.query('GetUser', ({ variables }) => {
    return HttpResponse.json({
      data: {
        user: { id: variables.id, name: 'Alice' },
      },
    });
  }),

  graphql.mutation('CreateUser', async ({ variables }) => {
    return HttpResponse.json({
      data: {
        createUser: { id: '3', name: variables.name },
      },
    });
  }),
];
```

### Network Scenarios

```ts
// Slow response
http.get('/api/data', async () => {
  await delay(3000);
  return HttpResponse.json({ data: 'slow' });
});

// Network error
http.get('/api/data', () => {
  return HttpResponse.error();
});

// Infinite loading (never resolves)
http.get('/api/data', () => {
  return delay('infinite');
});
```

### Browser Setup (dev mode)

```ts
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// main.tsx (conditional)
if (process.env.NODE_ENV === 'development') {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
```
