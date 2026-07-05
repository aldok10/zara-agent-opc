# Contract Testing

## Consumer-Driven Contract Testing

The consumer defines what it expects from the provider. The provider verifies it can fulfill those expectations.

### Why Contract Tests?

- Integration tests are slow, flaky, and require all services running
- Unit tests with mocks can drift from reality
- Contract tests verify the interface agreement without requiring both services online

### Pact Workflow

```
Consumer                              Provider
────────                              ────────
1. Write consumer test        
2. Generate pact file (contract)  →   3. Verify pact against provider
4. Publish to Pact Broker     →   5. Fetch and verify on CI
```

## Consumer Side (Pact)

```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, eachLike, string, integer, iso8601DateTimeWithMillis } = MatchersV3;

const provider = new PactV3({
  consumer: 'OrderService',
  provider: 'UserService',
});

describe('UserService API', () => {
  test('get user by ID', async () => {
    await provider
      .given('user with ID user-123 exists')
      .uponReceiving('a request for user user-123')
      .withRequest({
        method: 'GET',
        path: '/api/users/user-123',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: string('user-123'),
          name: string('Alice'),
          email: string('alice@example.com'),
          createdAt: iso8601DateTimeWithMillis('2024-01-15T10:30:00.000Z'),
        },
      })
      .executeTest(async (mockServer) => {
        const client = new UserClient(mockServer.url);
        const user = await client.getUser('user-123');
        expect(user.id).toBe('user-123');
        expect(user.email).toContain('@');
      });
  });

  test('user not found returns 404', async () => {
    await provider
      .given('no user with ID nonexistent')
      .uponReceiving('a request for nonexistent user')
      .withRequest({
        method: 'GET',
        path: '/api/users/nonexistent',
      })
      .willRespondWith({
        status: 404,
        body: { error: string('User not found') },
      })
      .executeTest(async (mockServer) => {
        const client = new UserClient(mockServer.url);
        await expect(client.getUser('nonexistent')).rejects.toThrow('not found');
      });
  });
});
```

## Provider Verification

```typescript
import { Verifier } from '@pact-foundation/pact';

describe('UserService Provider Verification', () => {
  test('verifies pact with OrderService', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:3000',
      pactBrokerUrl: 'https://pact-broker.mycompany.com',
      provider: 'UserService',
      providerVersion: process.env.GIT_SHA,
      publishVerificationResult: process.env.CI === 'true',
      stateHandlers: {
        'user with ID user-123 exists': async () => {
          await testDb.users.create({
            id: 'user-123',
            name: 'Alice',
            email: 'alice@example.com',
          });
        },
        'no user with ID nonexistent': async () => {
          // No setup needed -- user doesn't exist
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

## Schema Validation vs Behavioral Contracts

### Schema Validation (OpenAPI/JSON Schema)

Verifies structure only: "does the response match the shape?"

```yaml
# openapi.yaml
paths:
  /users/{id}:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      required: [id, name, email]
      properties:
        id: { type: string }
        name: { type: string }
        email: { type: string, format: email }
```

```bash
# Validate response against schema
npx @stoplight/spectral-cli lint openapi.yaml
```

### Behavioral Contracts (Pact)

Verifies behavior: "given state X, when request Y, then response Z."

| Aspect | Schema Validation | Behavioral Contract |
|--------|-------------------|---------------------|
| What it checks | Structure/types | Request-response pairs |
| State handling | No | Yes (provider states) |
| Consumer-specific | No (one schema for all) | Yes (per consumer) |
| Breaking change detection | Partial | Full |
| Complexity | Low | Medium |

### When to Use Which

- **Schema validation**: public APIs, generated clients, simple CRUD
- **Behavioral contracts**: internal microservices, complex interactions, state-dependent responses
- **Both**: schema for structure, contracts for critical flows

## CI/CD Integration

### GitHub Actions

```yaml
# Consumer CI
jobs:
  test:
    steps:
      - run: npm test -- --grep "pact"
      - name: Publish pact
        run: |
          npx pact-broker publish ./pacts \
            --consumer-app-version=${{ github.sha }} \
            --branch=${{ github.ref_name }} \
            --broker-base-url=${{ secrets.PACT_BROKER_URL }} \
            --broker-token=${{ secrets.PACT_BROKER_TOKEN }}

# Provider CI
jobs:
  verify:
    steps:
      - name: Start provider
        run: npm start &
      - name: Verify pacts
        run: npm run test:pact:provider
      - name: Can I Deploy?
        run: |
          npx pact-broker can-i-deploy \
            --pacticipant=UserService \
            --version=${{ github.sha }} \
            --to-environment=production
```

### Can-I-Deploy Check

Before deploying, verify all contracts are satisfied:

```bash
# Check if this version is safe to deploy
pact-broker can-i-deploy \
  --pacticipant="OrderService" \
  --version="abc123" \
  --to-environment="production"

# Output:
# COMPUTER SAYS YES
# All contracts verified successfully
```

## When to Use Contract Tests vs Integration Tests

| Scenario | Use Contract Tests | Use Integration Tests |
|----------|--------------------|-----------------------|
| Verify API shape agreement | Yes | Overkill |
| Test complex multi-step flows | No | Yes |
| Catch breaking changes early | Yes | Too slow for CI |
| Test error handling paths | Yes | Yes (for critical paths) |
| Verify data transformations | Partially | Yes |
| Test with real database | No | Yes |
| Test third-party APIs | Yes (record/replay) | Flaky |

### The Testing Diamond for Microservices

```
         /  E2E  \          (few, critical user journeys)
        / Contract \        (every service boundary)
       / Integration \      (database, cache, queue)
      /     Unit      \     (business logic, algorithms)
```

Contract tests replace most of the "integration between services" layer, keeping the feedback loop fast while ensuring compatibility.
