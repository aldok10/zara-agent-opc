---
type: fact
title: "Contract Testing Patterns"
---

# Contract Testing Patterns

## What is Contract Testing?

Contract testing verifies that API consumers and providers agree on the interface (the "contract"). Unlike integration tests that test behavior, contract tests verify the shape of communication.

## Consumer-Driven Contracts (CDC)

### Pact Workflow

1. **Consumer** writes a test defining expected interactions
2. Pact generates a contract file (pact.json)
3. Contract is shared with the provider (Pact Broker or file)
4. **Provider** verifies it can fulfill all consumer contracts

### Consumer Side (JavaScript)
```typescript
import { PactV4 } from '@pact-foundation/pact';

const provider = new PactV4({
  consumer: 'OrderUI',
  provider: 'OrderService',
});

describe('Order API', () => {
  it('returns an order by ID', async () => {
    await provider
      .addInteraction()
      .given('order 123 exists')
      .uponReceiving('a request for order 123')
      .withRequest('GET', '/orders/123', (builder) => {
        builder.headers({ Accept: 'application/json' });
      })
      .willRespondWith(200, (builder) => {
        builder
          .headers({ 'Content-Type': 'application/json' })
          .jsonBody({
            id: '123',
            status: 'pending',
            items: [{ sku: 'ABC', quantity: 2 }]
          });
      })
      .executeTest(async (mockServer) => {
        const client = new OrderClient(mockServer.url);
        const order = await client.getOrder('123');
        expect(order.id).toBe('123');
      });
  });
});
```

### Provider Side (Verification)
```typescript
import { Verifier } from '@pact-foundation/pact';

const opts = {
  providerBaseUrl: 'http://localhost:3000',
  pactBrokerUrl: 'https://broker.example.com',
  provider: 'OrderService',
  providerVersion: process.env.GIT_SHA,
  publishVerificationResult: true,
  stateHandlers: {
    'order 123 exists': async () => {
      await seedDatabase({ id: '123', status: 'pending' });
    }
  }
};

new Verifier(opts).verifyProvider();
```

## Provider-Driven Contracts

### OpenAPI Schema Validation
```typescript
import SwaggerParser from '@apidevtools/swagger-parser';

// Validate response matches schema
const schema = await SwaggerParser.validate('./openapi.yaml');
const endpoint = schema.paths['/orders/{id}'].get;
const responseSchema = endpoint.responses['200'].content['application/json'].schema;

// Use ajv to validate actual response against schema
import Ajv from 'ajv';
const ajv = new Ajv();
const validate = ajv.compile(responseSchema);
const valid = validate(actualResponse.data);
expect(valid).toBe(true);
```

### Prism (Stoplight) Mock + Validation
```bash
# Mock server from OpenAPI spec
prism mock openapi.yaml

# Validate real server against spec
prism proxy openapi.yaml http://localhost:3000
```

## Schema Validation Tools

| Tool | Approach | Language |
|------|----------|----------|
| Pact | Consumer-driven contracts | Multi-language |
| Dredd | API Blueprint / OpenAPI | Node.js |
| Schemathesis | Property-based API testing | Python |
| Spectral | OpenAPI linting | Node.js |
| Prism | Mock + validation | Node.js |

## Pact Broker Workflow

```
Consumer PR → Run consumer tests → Publish pact → Trigger provider verify
                                                         ↓
Provider PR → can-i-deploy check ← Verification result stored
                    ↓
              Deploy if all green
```

### can-i-deploy
```bash
# Check if safe to deploy consumer
pact-broker can-i-deploy \
  --pacticipant OrderUI \
  --version $GIT_SHA \
  --to-environment production
```

## When to Use What

| Scenario | Approach |
|----------|----------|
| Multiple consumers, one provider | Pact (CDC) |
| Public API with OpenAPI spec | Schema validation |
| Internal microservices | Pact or schema validation |
| GraphQL APIs | Consumer-driven with schema introspection |
| Event-driven (async) | Pact message contracts |

## Anti-Patterns

1. **Over-specification**: Testing exact field values instead of types/structure
2. **Missing provider states**: Contracts that assume data exists without setup
3. **Testing provider logic**: Contracts should verify shape, not business rules
4. **Ignoring versioning**: Not tagging contracts with consumer versions
5. **Manual contract sharing**: Use a broker, not file copies
