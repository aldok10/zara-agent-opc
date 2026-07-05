# Subskill: API Testing

> Activate when: API test, contract, Pact, schema validation, OpenAPI, REST, GraphQL, gRPC, WebSocket, SSE, Supertest, Postman, Newman, Specmatic, schemathesis
>
> Schema-first. Contract at boundaries. Error paths as thorough as happy paths. Mock external, test internal.

## Golden Rules

1. Contract tests at every service boundary (consumer-driven with Pact, spec-driven with Specmatic)
2. Validate response schema, not just status codes
3. Error paths tested as thoroughly as happy paths (4xx, 5xx, timeouts)
4. Schema-first: OpenAPI/AsyncAPI/protobuf is the source of truth
5. Test idempotency for PUT/DELETE and verify Idempotency-Key for POST
6. Auth tests: expired tokens, wrong roles, missing headers
7. Rate limiting and retry behavior verified
8. Mock external dependencies, never your own services
9. Property-based testing to find edge cases humans miss

## Contract Testing (Pact V4)

```typescript
// Consumer test - Pact V4 builder pattern (PactV4 aliased as Pact in v13+)
import { Pact, Matchers } from '@pact-foundation/pact';
const { like, string, email } = Matchers;

const pact = new Pact({ consumer: 'web-app', provider: 'user-api' });

pact.addInteraction()
  .given('user 123 exists')
  .uponReceiving('get user 123')
  .withRequest('GET', '/api/users/123')
  .willRespondWith(200, builder => {
    builder.jsonBody(like({ id: '123', name: string(), email: email() }));
  })
  .executeTest(async (mockServer) => {
    const res = await fetch(`${mockServer.url}/api/users/123`);
    expect(res.status).toBe(200);
  });
```

**Pact rules:**
- Match by type, not exact value (loose contracts)
- Static data only -- no random values
- Provider states for setup ("user exists with id 123")
- Version contracts with consumer app version + git SHA

**Contract broker CI:**
- `can-i-deploy` gate before production deploys
- Pending pacts: new consumers don't break provider builds until verified
- WIP pacts: provider verifies in-progress contracts without failing
- Webhook triggers provider verification on new pact published

## Specmatic (OpenAPI-as-Contract)

```bash
# Backward compatibility check (CI gate)
specmatic backward-compatibility-check --old old-openapi.yaml --new openapi.yaml

# Contract-as-test: auto-generate tests from spec
specmatic test --contract openapi.yaml --host localhost --port 3000
```

Use Specmatic when: both sides own the spec, no broker infra wanted, or testing backward compatibility of schema changes.

## Schema Validation

```typescript
// OpenAPI response validation
import { validate } from '@seriousme/openapi-schema-validator';

test('response matches OpenAPI schema', async () => {
  const response = await request(app).get('/api/users');
  const result = validate(response.body, schema.paths['/users'].get.responses['200']);
  expect(result.errors).toHaveLength(0);
});

// Spectral linting: spectral lint openapi.yaml --ruleset .spectral.yml
```

## Property-Based API Testing

```bash
# Schemathesis: auto-generate from OpenAPI, find edge cases
schemathesis run http://localhost:3000/openapi.json --stateful=links --hypothesis-max-examples=200
```

```typescript
// fast-check for custom property tests
fc.assert(fc.asyncProperty(
  fc.record({ name: fc.string(1, 100), age: fc.integer(0, 150) }),
  async (payload) => {
    const res = await request(app).post('/api/users').send(payload);
    expect([200, 400]).toContain(res.status); // never 500
  }
));
```

## GraphQL Testing

- **Query depth limiting**: verify deeply nested queries return 400/depth error
- **Complexity analysis**: queries exceeding cost threshold rejected before execution
- **N+1 detection**: trace resolver calls, assert DataLoader batching
- **Persisted queries**: unknown query hashes rejected; allowlist enforced in production
- Test both `errors[]` array and partial `data` responses

## gRPC Testing

- **Protobuf schema validation**: `buf breaking` for backward compatibility
- **Streaming types**: test unary, server-stream, client-stream, bidi independently
- **Deadline propagation**: set short deadlines, verify `DEADLINE_EXCEEDED` status
- **Metadata/headers**: auth tokens, trace IDs propagated correctly
- Use `grpcurl` or `buf curl` for smoke tests; language clients for integration

## WebSocket / SSE Testing

- **Connection lifecycle**: open, message exchange, graceful close, abnormal close
- **Reconnection**: client reconnects with last event ID (SSE) or sequence (WS)
- **Backpressure**: server handles slow consumers without OOM
- **Message ordering**: verify sequence numbers arrive in order under load
- **Auth**: token expiry mid-connection triggers close frame with reason

## Pagination Testing

| Scenario | Verify |
|----------|--------|
| Cursor-based | next cursor valid, prev cursor works, stable under writes |
| Offset-based | offset+limit bounds, negative offset rejected |
| Empty page | returns empty array, not 404 |
| Last page | no next cursor/link, correct total if provided |
| Concurrent writes | no duplicates or skips across pages |

## Idempotency Verification

```typescript
test('POST with Idempotency-Key is retry-safe', async () => {
  const key = randomUUID();
  const res1 = await request(app).post('/api/payments')
    .set('Idempotency-Key', key).send(payload);
  const res2 = await request(app).post('/api/payments')
    .set('Idempotency-Key', key).send(payload);
  expect(res1.body.id).toBe(res2.body.id); // same resource
  expect(res2.status).toBe(res1.status);    // same status
});
```

## API Versioning Testing

- **URL-based** (`/v1/`, `/v2/`): old version still works after new deployed
- **Header-based** (`Accept: application/vnd.api+json;version=2`): missing version defaults correctly
- **Deprecation headers**: `Deprecation: true`, `Sunset: <date>` present on old versions
- **Breaking change detection**: run contract tests across versions

## Error Path Testing

```typescript
test('401 on expired token', async () => {
  const res = await request(app).get('/api/protected')
    .set('Authorization', 'Bearer expired-token');
  expect(res.status).toBe(401);
  expect(res.body).toMatchObject({ code: 'TOKEN_EXPIRED' });
});

test('504 on upstream timeout', async () => {
  nock('http://external').get('/slow').delay(5000).reply(200);
  const res = await request(app).get('/api/proxy-slow');
  expect(res.status).toBe(504);
});
```

## Service Mocking

| Tool | Use Case |
|------|----------|
| MSW | Frontend API mocking at network level |
| WireMock | JVM service virtualization |
| Prism (Stoplight) | Mock server from OpenAPI spec |
| nock | Node.js HTTP interception |
| Testcontainers | Real service in Docker (DB, queue) |

## Anti-Patterns

- Asserting only HTTP status (validate body + headers)
- Hardcoding auth tokens (use fixtures/env vars)
- Skipping contracts ("we own both" -- still break independently)
- Testing against production APIs in CI
- Ignoring Content-Type and cache headers
- One giant integration test instead of focused contract + schema tests

## AI-Era Context (2026)

AI generates contract tests directly from OpenAPI specs, produces property-based fuzzing scenarios automatically, and detects schema drift between spec and implementation. Schemathesis + AI identifies stateful test sequences that expose business logic flaws. However, AI-generated API tests often assert only status codes without validating response bodies, headers, or side effects. Schema drift detection is automated but interpreting whether drift is intentional (feature) or accidental (bug) requires human judgment.

## Knowledge

- `subskills/contract-testing.md` -- Pact and Specmatic patterns
- `subskills/schema-validation.md` -- OpenAPI validation and Spectral linting
- `subskills/authentication-testing.md` -- auth flow testing patterns
- `subskills/mocking.md` -- service virtualization and stubbing

## Delegates To

- **security-testing** for auth vulnerability testing
- **performance-testing** for API load testing
- **chaos-engineering** for timeout/failure injection
