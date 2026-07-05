---
type: subskill
title: "Testing Node.js"
---

# Testing Node.js

node:test: the built-in test runner. Zero dependencies, full mock support, snapshots, coverage, watch mode. Production-ready since Node 20, fully mature in Node 24+.

## Core API

```typescript
import { test, describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

describe('UserService', () => {
  let service: UserService;

  before(() => { /* once before all tests in this suite */ });
  beforeEach(() => { service = new UserService(mockDb); });

  it('creates a user with valid data', async () => {
    const user = await service.create({ name: 'Alice', email: 'a@b.com' });
    assert.equal(user.name, 'Alice');
    assert.match(user.id, /^[0-9a-f-]{36}$/);
  });

  it('rejects invalid email', async () => {
    await assert.rejects(
      () => service.create({ name: 'Bob', email: 'invalid' }),
      { code: 'VALIDATION_ERROR' },
    );
  });
});
```

## Running Tests

```bash
# Run all tests
node --test

# Pattern matching
node --test 'tests/**/*.test.ts'

# With tsx for TypeScript
node --import tsx --test 'src/**/*.test.ts'

# Watch mode
node --test --watch

# Coverage
node --test --experimental-test-coverage

# Specific test by name
node --test --test-name-pattern="creates a user"

# Reporter
node --test --test-reporter=spec
```

## Mocking

```typescript
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test('mocking a method', async (t) => {
  const db = { findUser: async (id: string) => ({ id, name: 'Real' }) };

  // Mock a method on an object
  t.mock.method(db, 'findUser', async (id: string) => ({ id, name: 'Mocked' }));

  const result = await db.findUser('123');
  assert.equal(result.name, 'Mocked');
  assert.equal(db.findUser.mock.calls.length, 1);
  assert.deepEqual(db.findUser.mock.calls[0].arguments, ['123']);
});

test('mocking a module', async (t) => {
  // Mock timers
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let called = false;
  setTimeout(() => { called = true; }, 1000);
  t.mock.timers.tick(1000);
  assert.equal(called, true);
});

test('spy without replacing', async (t) => {
  const fn = t.mock.fn((x: number) => x * 2);
  assert.equal(fn(3), 6);
  assert.equal(fn.mock.calls.length, 1);
});
```

## Snapshot Testing

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('user serialization snapshot', async (t) => {
  const user = { id: '1', name: 'Alice', createdAt: '2024-01-01' };
  // First run: creates snapshot. Subsequent runs: compares against it.
  assert.snapshot(JSON.stringify(user, null, 2), 'user-json');
});

// Update snapshots: node --test --test-update-snapshots
```

## Subtests and Context

```typescript
test('database operations', async (t) => {
  const db = await setupTestDb();
  t.after(() => db.close()); // cleanup after this test

  await t.test('insert', async () => {
    const result = await db.insert({ name: 'test' });
    assert.ok(result.id);
  });

  await t.test('query', async () => {
    const rows = await db.query('SELECT * FROM items');
    assert.ok(rows.length > 0);
  });
});
```

## Testing HTTP (Fastify inject)

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('API integration', async (t) => {
  const app = await buildApp({ testing: true });
  t.after(() => app.close());

  await t.test('GET /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { status: 'ok' });
  });

  await t.test('POST /users requires body', async () => {
    const res = await app.inject({ method: 'POST', url: '/users', payload: {} });
    assert.equal(res.statusCode, 422);
  });
});
```

## Testing Hono

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

test('Hono routes', async (t) => {
  await t.test('GET /health', async () => {
    const res = await app.request('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });

  await t.test('POST /users', async () => {
    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', email: 'a@b.com' }),
    });
    assert.equal(res.status, 201);
  });
});
```

## Hooks and Lifecycle

```typescript
import { test, before, after } from 'node:test';

// Global setup/teardown
let server: TestServer;

before(async () => { server = await startTestServer(); });
after(async () => { await server.close(); });

test('uses shared server', async () => {
  const res = await fetch(`${server.url}/api/data`);
  // ...
});
```

## Coverage

```bash
# Built-in coverage
node --test --experimental-test-coverage --test-coverage-include='src/**'

# Exclude test files from coverage
node --test --experimental-test-coverage --test-coverage-exclude='**/*.test.ts'

# With c8 for more features (lcov, html reports)
npx c8 --reporter=lcov --reporter=text node --test
```

## Best Practices

1. One assertion per logical concept -- but multiple asserts on same object is fine
2. Use `t.after()` for cleanup instead of try/finally -- cleaner, always runs
3. Prefer `assert.rejects()` over try/catch for async errors
4. Use `t.mock.method()` over manual stubs -- auto-restores after test
5. Name tests as behavior: "creates user with valid data" not "test create"
6. Use `--test-concurrency` to control parallelism (default: os.availableParallelism())
7. Isolate state: each test gets fresh instances, no shared mutable state
8. Use `t.diagnostic()` for debug output that only shows on failure
