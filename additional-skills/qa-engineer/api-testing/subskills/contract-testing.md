---
type: subskill
title: "Contract Testing"
---

# Contract Testing

## Pact V4 Workflow

### Consumer Side (Write Expectations)

```typescript
// PactV4 is aliased as Pact in @pact-foundation/pact v13+
import { Pact, Matchers } from '@pact-foundation/pact';
const { like, timestamp, string } = Matchers;

const pact = new Pact({
  consumer: "OrderService",
  provider: "InventoryService",
});

pact
  .addInteraction()
  .given("product SKU-123 exists with stock > 0")
  .uponReceiving("a request to reserve inventory")
  .withRequest("POST", "/inventory/reserve", (builder) => {
    builder.headers({ "Content-Type": "application/json" });
    builder.jsonBody({ sku: "SKU-123", quantity: 1 });
  })
  .willRespondWith(200, (builder) => {
    builder.jsonBody({
      reservationId: like("res-uuid"),
      expiresAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX"),
    });
  });
```

### Provider Side (Verify)

```typescript
const verifier = new Verifier({
  providerBaseUrl: "http://localhost:3001",
  pactBrokerUrl: process.env.PACT_BROKER_URL,
  provider: "InventoryService",
  providerVersion: gitSha,
  publishVerificationResult: true,
  stateHandlers: {
    "product SKU-123 exists with stock > 0": async () => {
      await seedProduct({ sku: "SKU-123", stock: 10 });
    },
  },
});
await verifier.verifyProvider();
```

## Pact Broker

- **Publish**: `pact-broker publish ./pacts --consumer-app-version=$GIT_SHA --branch=$BRANCH`
- **Can-I-Deploy**: `pact-broker can-i-deploy --pacticipant=OrderService --version=$GIT_SHA --to-environment=production`
- **Webhooks**: trigger provider verification on new pact published; notify on verification failure

## Provider States

- Setup: seed database/fixtures matching the `given()` description
- Teardown: clean state after verification to avoid test pollution
- Parameterized states: `given("user exists", { id: "user-42" })` for dynamic data
- No-state interactions: test behavior when preconditions are NOT met (404 paths)

## Pending Pacts & WIP Pacts

- **Pending pacts**: new consumer expectations don't break provider CI; failures are warnings until first successful verification
- **WIP pacts**: automatically include pacts from feature branches in provider verification without explicit configuration
- Both enable safe iteration: consumer can push expectations before provider implements them

## Specmatic: OpenAPI as Executable Contract

```bash
# Backward compatibility check
specmatic compare --older=openapi-v1.yaml --newer=openapi-v2.yaml

# Contract test from spec (no consumer code needed)
specmatic test --contract=openapi.yaml --host=localhost --port=3001

# Stub server from spec
specmatic stub --contract=openapi.yaml --port=9000
```

- Uses OpenAPI/AsyncAPI spec directly as the contract
- Generates tests automatically from spec examples and schema
- No broker needed; spec lives in version control

## Decision Tree: Pact vs Specmatic

| Criteria | Pact | Specmatic |
|----------|------|-----------|
| Consumer drives contract | Yes (consumer-first) | No (spec-first) |
| Multiple consumers, one provider | Ideal (per-consumer contracts) | Single contract for all |
| OpenAPI already authoritative | Overhead (duplicates spec) | Direct fit |
| Need backward compat CI gate | Via broker + can-i-deploy | Built-in compare |
| Event-driven (async) | Pact message support | AsyncAPI support |
| Team maturity | Higher (workflow discipline) | Lower (just maintain spec) |

**Choose Pact** when consumer teams need autonomy and provider has many consumers with different needs.
**Choose Specmatic** when OpenAPI spec is already the single source of truth and you want zero additional contract artifacts.

## CI Integration Pattern

```yaml
# Provider pipeline
steps:
  - run: pact-broker can-i-deploy --pacticipant=InventoryService --version=$SHA --to-environment=production
  - run: specmatic compare --older=main:openapi.yaml --newer=openapi.yaml
  - if: failure
    run: echo "Breaking change detected" && exit 1
```
