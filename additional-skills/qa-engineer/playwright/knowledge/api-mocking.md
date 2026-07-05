---
type: fact
title: "Playwright API Mocking and Route Handling"
---

# Playwright API Mocking and Route Handling

## page.route() Basics

Intercept and mock network requests in Playwright tests.

```typescript
import { test, expect } from '@playwright/test';

test('displays mocked user data', async ({ page }) => {
  // Intercept API call and return mock data
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),
    });
  });

  await page.goto('/users');
  await expect(page.getByText('Alice')).toBeVisible();
  await expect(page.getByText('Bob')).toBeVisible();
});
```

## Route Matching Patterns

```typescript
// Exact URL
await page.route('https://api.example.com/users', handler);

// Glob pattern
await page.route('**/api/users/**', handler);

// Regex
await page.route(/\/api\/users\/\d+/, handler);

// Function matcher
await page.route(
  (url) => url.pathname.startsWith('/api') && url.searchParams.has('page'),
  handler
);
```

## Response Types

### Static JSON
```typescript
await page.route('**/api/products', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ products: [], total: 0 }),
  });
});
```

### From File
```typescript
await page.route('**/api/products', async (route) => {
  await route.fulfill({ path: './fixtures/products.json' });
});
```

### Error Responses
```typescript
// HTTP error
await page.route('**/api/data', async (route) => {
  await route.fulfill({
    status: 500,
    body: JSON.stringify({ error: 'Internal server error' }),
  });
});

// Network failure
await page.route('**/api/data', async (route) => {
  await route.abort('connectionfailed');
});

// Timeout simulation (delay then abort)
await page.route('**/api/data', async (route) => {
  await new Promise(r => setTimeout(r, 30000));
  await route.abort('timedout');
});
```

### Delayed Response
```typescript
await page.route('**/api/data', async (route) => {
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ data: 'loaded' }),
  });
});
```

## Modify Real Responses (Spy Pattern)

```typescript
// Let request go through, modify the response
await page.route('**/api/users', async (route) => {
  const response = await route.fetch(); // Make the real request
  const json = await response.json();
  
  // Inject test data into real response
  json.push({ id: 999, name: 'Injected Test User' });
  
  await route.fulfill({
    response, // Preserve headers, status
    body: JSON.stringify(json),
  });
});
```

## Request Assertions

```typescript
test('submits correct data', async ({ page }) => {
  let requestBody: any;
  
  await page.route('**/api/orders', async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ status: 201, body: JSON.stringify({ id: 'new-1' }) });
  });

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Place Order' }).click();

  expect(requestBody).toEqual({
    items: [{ sku: 'WIDGET-1', quantity: 2 }],
    shipping: 'standard',
  });
});
```

## Wait for Network Requests

```typescript
test('waits for data to load', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Wait for specific request to complete
  const response = await page.waitForResponse('**/api/dashboard/stats');
  expect(response.status()).toBe(200);
  
  // Or wait for request to be made
  const request = await page.waitForRequest('**/api/analytics');
  expect(request.method()).toBe('POST');
});

// Wait for multiple requests
test('parallel data loading', async ({ page }) => {
  const [stats, notifications] = await Promise.all([
    page.waitForResponse('**/api/stats'),
    page.waitForResponse('**/api/notifications'),
    page.goto('/dashboard'), // Triggers both requests
  ]);
  
  expect(stats.status()).toBe(200);
  expect(notifications.status()).toBe(200);
});
```

## Context-Level Routing (All Pages)

```typescript
test('mock across navigations', async ({ context, page }) => {
  // Route at context level persists across page navigations
  await context.route('**/api/feature-flags', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ darkMode: true, newUI: false }),
    });
  });

  await page.goto('/page-1'); // Mock applies
  await page.goto('/page-2'); // Still applies
});
```

## Conditional Mocking

```typescript
let callCount = 0;

await page.route('**/api/status', async (route) => {
  callCount++;
  if (callCount <= 2) {
    await route.fulfill({ body: JSON.stringify({ status: 'pending' }) });
  } else {
    await route.fulfill({ body: JSON.stringify({ status: 'complete' }) });
  }
});
```

## HAR Recording and Replay

```typescript
// Record network traffic
await page.routeFromHAR('tests/data/api.har', {
  url: '**/api/**',
  update: true, // Record mode: saves real responses to HAR
});

// Replay from recorded HAR (subsequent runs)
await page.routeFromHAR('tests/data/api.har', {
  url: '**/api/**',
  update: false, // Replay mode: serve from HAR file
});
```

## Common Patterns

### Loading State Verification
```typescript
test('shows spinner during load', async ({ page }) => {
  await page.route('**/api/data', async (route) => {
    await new Promise(r => setTimeout(r, 1000));
    await route.fulfill({ body: '[]' });
  });

  await page.goto('/list');
  await expect(page.getByTestId('spinner')).toBeVisible();
  await expect(page.getByTestId('spinner')).not.toBeVisible();
});
```

### Auth Token Refresh
```typescript
test('retries on 401 with refreshed token', async ({ page }) => {
  let firstCall = true;
  
  await page.route('**/api/protected', async (route) => {
    if (firstCall) {
      firstCall = false;
      await route.fulfill({ status: 401 });
    } else {
      await route.fulfill({ body: JSON.stringify({ data: 'ok' }) });
    }
  });

  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({ body: JSON.stringify({ token: 'new-token' }) });
  });

  await page.goto('/protected-page');
  await expect(page.getByText('ok')).toBeVisible();
});
```

### Cleanup
```typescript
// Remove route handler
const handler = async (route: Route) => { /* ... */ };
await page.route('**/api/data', handler);

// Later: remove it
await page.unroute('**/api/data', handler);
// Or remove all handlers for URL:
await page.unroute('**/api/data');
```
