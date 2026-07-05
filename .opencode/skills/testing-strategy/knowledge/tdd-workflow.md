# TDD Workflow

## Red-Green-Refactor Cycle

### Red: Write a Failing Test

- Write the smallest test that describes desired behavior
- Run it. It MUST fail. If it passes, your test is wrong.
- The failure message should clearly describe what's missing.

### Green: Make It Pass

- Write the MINIMUM code to make the test pass
- It's okay to hardcode, use shortcuts, or be ugly
- The goal is passing, not elegance

### Refactor: Clean Up

- Now improve the code without changing behavior
- Tests stay green throughout refactoring
- Remove duplication, improve names, extract abstractions

```typescript
// RED
test('calculates order total with tax', () => {
  const order = { items: [{ price: 100 }, { price: 50 }], taxRate: 0.1 };
  expect(calculateTotal(order)).toBe(165);
});

// GREEN (minimal implementation)
function calculateTotal(order: { items: { price: number }[]; taxRate: number }) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + order.taxRate);
}

// REFACTOR (if needed -- in this case, minimal code is already clean)
```

## Outside-In vs Inside-Out TDD

### Outside-In (London School)

Start from the outermost layer (controller/handler), mock collaborators, work inward.

```typescript
// Start with acceptance test
test('POST /orders creates order and returns 201', async () => {
  const response = await request(app)
    .post('/orders')
    .send({ userId: 'u1', items: [{ productId: 'p1', qty: 2 }] });
  expect(response.status).toBe(201);
  expect(response.body.orderId).toBeDefined();
});

// Then unit test handler with mocked service
test('OrderHandler calls OrderService.create', async () => {
  const mockService = { create: vi.fn().mockResolvedValue({ id: 'o1' }) };
  const handler = new OrderHandler(mockService);
  await handler.create(req, res);
  expect(mockService.create).toHaveBeenCalledWith('u1', [{ productId: 'p1', qty: 2 }]);
});

// Then unit test service with mocked repo
// Then implement repo against real DB (integration test)
```

Best for: web applications, API layers, when design emerges from usage.

### Inside-Out (Chicago School)

Start from the domain/core logic, no mocks, build outward.

```typescript
// Start with domain logic
test('Order calculates total correctly', () => {
  const order = Order.create('u1', [
    { productId: 'p1', price: 1000, qty: 2 },
    { productId: 'p2', price: 500, qty: 1 },
  ]);
  expect(order.total).toBe(2500);
});

// Then build repository
test('OrderRepository persists and retrieves', async () => {
  const repo = new OrderRepository(testDb);
  const order = Order.create('u1', [{ productId: 'p1', price: 1000, qty: 1 }]);
  await repo.save(order);
  const retrieved = await repo.findById(order.id);
  expect(retrieved.total).toBe(1000);
});

// Then build handler on top of real service + repo
```

Best for: complex domain logic, algorithms, data transformations.

## When to TDD vs When Not To

### TDD is valuable for:
- Business logic with clear rules
- Algorithms and data transformations
- Bug fixes (write failing test first)
- API contracts
- State machines

### TDD is less valuable for:
- Exploratory prototypes (you'll throw it away)
- UI layout (visual testing is better)
- Integration glue code (integration tests are better)
- One-off scripts

## Test Doubles

| Type | Purpose | Example |
|------|---------|---------|
| Stub | Returns canned answers | `getUser: () => ({ id: '1', name: 'Test' })` |
| Mock | Verifies interactions | `expect(mock.save).toHaveBeenCalledWith(...)` |
| Spy | Wraps real implementation, records calls | `vi.spyOn(service, 'process')` |
| Fake | Working implementation (simplified) | In-memory database, fake HTTP server |

```typescript
// Stub: fixed return value
const userRepo = { findById: vi.fn().mockResolvedValue({ id: '1', name: 'Alice' }) };

// Mock: verify interaction
const emailService = { send: vi.fn() };
await handler.resetPassword('alice@test.com');
expect(emailService.send).toHaveBeenCalledWith('alice@test.com', expect.stringContaining('reset'));

// Spy: observe without replacing
const spy = vi.spyOn(logger, 'warn');
await processOrder(invalidOrder);
expect(spy).toHaveBeenCalledWith(expect.stringContaining('invalid'));

// Fake: lightweight real implementation
class FakeUserRepository implements UserRepository {
  private users = new Map<string, User>();
  async save(user: User) { this.users.set(user.id, user); }
  async findById(id: string) { return this.users.get(id) ?? null; }
}
```

### When to Use Which

- Stubs: when you need a dependency to return specific data
- Mocks: when the interaction IS the behavior (sending email, publishing event)
- Spies: when you want real behavior but need to verify it happened
- Fakes: for integration-like tests without external infrastructure

## Practical Example: TDD a User Service

### Iteration 1: Create user

```typescript
// RED
test('creates user with hashed password', async () => {
  const service = new UserService(new FakeUserRepo(), new FakeHasher());
  const user = await service.create({ email: 'a@b.com', password: 'secret' });
  expect(user.email).toBe('a@b.com');
  expect(user.passwordHash).not.toBe('secret');
});

// GREEN
class UserService {
  constructor(private repo: UserRepository, private hasher: Hasher) {}
  async create(input: { email: string; password: string }) {
    const passwordHash = await this.hasher.hash(input.password);
    const user = { id: crypto.randomUUID(), email: input.email, passwordHash };
    await this.repo.save(user);
    return user;
  }
}
```

### Iteration 2: Prevent duplicate emails

```typescript
// RED
test('rejects duplicate email', async () => {
  const service = new UserService(new FakeUserRepo(), new FakeHasher());
  await service.create({ email: 'a@b.com', password: 'secret' });
  await expect(service.create({ email: 'a@b.com', password: 'other' }))
    .rejects.toThrow('Email already registered');
});

// GREEN (add to create method)
async create(input: { email: string; password: string }) {
  const existing = await this.repo.findByEmail(input.email);
  if (existing) throw new Error('Email already registered');
  // ... rest
}
```

### Iteration 3: Validate email format

```typescript
// RED
test('rejects invalid email', async () => {
  const service = new UserService(new FakeUserRepo(), new FakeHasher());
  await expect(service.create({ email: 'not-an-email', password: 'secret' }))
    .rejects.toThrow('Invalid email');
});

// GREEN
async create(input: { email: string; password: string }) {
  if (!input.email.includes('@')) throw new Error('Invalid email');
  // ... rest
}
```

Each iteration: one test, one behavior, one small code change. Build confidence incrementally.
