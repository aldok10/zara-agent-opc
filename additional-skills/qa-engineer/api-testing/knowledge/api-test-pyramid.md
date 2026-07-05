---
type: fact
title: "API Test Pyramid"
---

# API Test Pyramid

## Layers of API Testing

### Layer 1: Unit Tests (Base - Most Tests)
Test individual functions that make up the API logic.

**What to test:**
- Request validation/parsing
- Business logic functions
- Data transformation
- Error handling paths
- Middleware logic in isolation

```typescript
// Unit test: validation logic
describe('validateOrderInput', () => {
  it('rejects empty items array', () => {
    const result = validateOrderInput({ items: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('items must not be empty');
  });

  it('rejects negative quantities', () => {
    const result = validateOrderInput({
      items: [{ sku: 'ABC', quantity: -1 }]
    });
    expect(result.valid).toBe(false);
  });
});
```

### Layer 2: Integration Tests (Middle)
Test the API endpoint with real dependencies (database, cache) but no external services.

**What to test:**
- Request → handler → database → response flow
- Authentication/authorization middleware
- Database queries and transactions
- Caching behavior
- Error responses for invalid requests

```typescript
// Integration test: full endpoint with test DB
describe('POST /orders', () => {
  beforeEach(async () => {
    await db.migrate.latest();
    await db.seed.run();
  });

  it('creates an order and returns 201', async () => {
    const response = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ items: [{ sku: 'WIDGET-1', quantity: 2 }] });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.status).toBe('pending');

    // Verify in database
    const order = await db('orders').where('id', response.body.id).first();
    expect(order).toBeDefined();
  });

  it('returns 401 without auth token', async () => {
    const response = await request(app)
      .post('/orders')
      .send({ items: [{ sku: 'WIDGET-1', quantity: 2 }] });

    expect(response.status).toBe(401);
  });

  it('returns 422 for invalid payload', async () => {
    const response = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ items: [] });

    expect(response.status).toBe(422);
    expect(response.body.errors).toBeDefined();
  });
});
```

### Layer 3: Contract Tests (Middle-Upper)
Verify API shape matches consumer expectations. See contract-testing-patterns.md.

### Layer 4: End-to-End API Tests (Top - Fewest)
Test full flows across multiple services in a staging environment.

**What to test:**
- Critical business flows (order → payment → fulfillment)
- Cross-service data consistency
- Timeout and retry behavior
- Rate limiting under real conditions

```typescript
// E2E: multi-service flow
describe('Order Lifecycle', () => {
  it('processes order through payment and fulfillment', async () => {
    // Create order
    const order = await api.post('/orders', { items: [...] });
    expect(order.status).toBe('pending');

    // Process payment
    const payment = await api.post(`/orders/${order.id}/pay`, {
      method: 'card', token: testCardToken
    });
    expect(payment.status).toBe('paid');

    // Wait for async fulfillment
    await waitFor(async () => {
      const updated = await api.get(`/orders/${order.id}`);
      return updated.status === 'shipped';
    }, { timeout: 30000 });
  });
});
```

## Test Distribution Guidelines

| Layer | Percentage | Speed | Stability |
|-------|-----------|-------|-----------|
| Unit | 60-70% | <1ms each | Very high |
| Integration | 20-30% | 10-100ms | High |
| Contract | 5-10% | 100ms-1s | High |
| E2E | 2-5% | 1-30s | Medium |

## What NOT to Test at Each Layer

| Layer | Skip These |
|-------|-----------|
| Unit | HTTP framework behavior, DB driver correctness |
| Integration | Third-party API behavior (mock it) |
| Contract | Business logic, exact data values |
| E2E | Edge cases already covered by lower layers |

## API-Specific Testing Concerns

### Authentication & Authorization
- Valid/expired/malformed tokens
- Role-based access per endpoint
- Token refresh flows

### Pagination
- First page, last page, empty results
- Invalid page/limit values
- Consistency during concurrent writes

### Error Handling
- 400: malformed request body
- 401: missing/invalid auth
- 403: valid auth, insufficient permissions
- 404: resource not found
- 409: conflict (duplicate, stale state)
- 422: valid JSON, invalid semantics
- 429: rate limit exceeded
- 500: unexpected server error (verify no leak of internals)

### Idempotency
- Retry same request with idempotency key
- Verify no duplicate side effects
- Test with concurrent identical requests

### Performance Boundaries
- Response time under normal load
- Payload size limits
- Connection handling (keep-alive, timeouts)
