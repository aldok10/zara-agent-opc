---
type: subskill
title: "Mocking & Service Virtualization"
---

# Mocking & Service Virtualization

## MSW (Mock Service Worker)

```typescript
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({ id: params.id, name: "Test User" });
  }),
  http.post("/api/orders", async ({ request }) => {
    const body = await request.json();
    if (!body.items?.length) {
      return HttpResponse.json({ error: "No items" }, { status: 400 });
    }
    return HttpResponse.json({ orderId: "ord-123" }, { status: 201 });
  }),
];

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Override for specific test
it("handles server error", async () => {
  server.use(
    http.get("/api/users/:id", () => HttpResponse.json(null, { status: 500 }))
  );
  // test error handling...
});
```

- Works in both browser (Service Worker) and Node.js (request interception)
- `onUnhandledRequest: "error"` catches unmocked calls early

## WireMock

```json
{
  "request": {
    "method": "GET",
    "urlPathPattern": "/api/products/[a-z0-9-]+",
    "headers": { "Accept": { "contains": "application/json" } }
  },
  "response": {
    "status": 200,
    "jsonBody": { "id": "{{request.path.[2]}}", "name": "Widget" },
    "transformers": ["response-template"]
  }
}
```

- **Stateful scenarios**: model state machines (e.g., order: created -> paid -> shipped)
- **Fault injection**: `"fault": "MALFORMED_RESPONSE_CHUNK"` for resilience testing
- **Priorities**: specific stubs override general ones via `"priority": 1`
- **Verify**: `GET /__admin/requests` to assert expected calls were made

## Prism (OpenAPI Mock Server)

```bash
# Automatic mock from spec - no code needed
prism mock openapi.yaml --port 4010

# Dynamic mode: generates random valid responses per schema
prism mock openapi.yaml --dynamic

# Validation proxy: forward to real API, validate req/res against spec
prism proxy openapi.yaml http://localhost:3000 --errors
```

- Zero config: reads examples from spec, falls back to schema-generated data
- Use as development dependency while provider team builds the real API

## nock (Node.js HTTP Interception)

```typescript
import nock from "nock";

it("retries on 503", async () => {
  nock("https://api.payment.com")
    .post("/charge")
    .reply(503)
    .post("/charge")
    .reply(200, { chargeId: "ch-1" });

  const result = await paymentClient.charge({ amount: 100 });
  expect(result.chargeId).toBe("ch-1");
  expect(nock.isDone()).toBe(true); // all interceptors consumed
});
```

- Scope to specific test; `nock.cleanAll()` in afterEach
- `nock.recorder.rec()` for record mode to capture real responses

## Testcontainers (When NOT to Mock)

```typescript
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer;
beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = container.getConnectionUri();
  await runMigrations();
}, 60_000);
afterAll(() => container.stop());
```

**Use real services when:**
- Testing database queries (joins, transactions, constraints)
- Message broker behavior (ordering, dead letter queues)
- Cache invalidation patterns
- Auth provider integration (Keycloak container)

**Mock when:**
- Third-party APIs with usage costs or rate limits
- Simulating specific failure modes
- Unit testing business logic in isolation
- CI speed matters and real service is slow to start

## Stateful Mock Patterns

```typescript
// Simulate CRUD sequence
let store: Record<string, any> = {};

const handlers = [
  http.post("/api/items", async ({ request }) => {
    const body = await request.json();
    const id = crypto.randomUUID();
    store[id] = { id, ...body };
    return HttpResponse.json(store[id], { status: 201 });
  }),
  http.get("/api/items/:id", ({ params }) => {
    const item = store[params.id as string];
    if (!item) return HttpResponse.json(null, { status: 404 });
    return HttpResponse.json(item);
  }),
  http.delete("/api/items/:id", ({ params }) => {
    delete store[params.id as string];
    return new HttpResponse(null, { status: 204 });
  }),
];
```

## Record/Replay

- **nock recorder**: `nock.recorder.rec({ output_objects: true })` captures fixtures
- **Polly.js**: record HTTP interactions, replay in CI, expire after TTL
- **VCR pattern**: first run hits real API and saves cassette; subsequent runs replay
- Refresh recordings periodically (weekly cron) to catch provider drift
