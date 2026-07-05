---
type: subskill
title: "Subskill: Testing"
---

# Subskill: Testing

## Activation

Triggered when task involves: component testing, unit tests, integration tests, e2e, vitest, playwright, testing library, test setup.

## Core Principles

1. **Vitest + @testing-library/svelte** for component/unit tests.
2. **Playwright** for e2e and visual regression.
3. **Test behavior, not implementation**  -  assert what user sees, not internal state.
4. **Svelte 5 testing** requires `@testing-library/svelte` v5+ for runes support.

## Decision Table

| Test Type | Tool | When |
|-----------|------|------|
| Component rendering | `@testing-library/svelte` + vitest | Props, slots, events |
| Reactive logic (.svelte.ts) | vitest + `svelte/reactivity` | Shared state, derived |
| Form actions | vitest + supertest or direct handler call | Server mutations |
| Load functions | vitest (unit) | Data fetching logic |
| User flows | Playwright | Multi-page, auth, forms |
| Accessibility | `@testing-library/svelte` + axe | A11y compliance |

## Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
  },
});
```

```typescript
// src/tests/setup.ts
import '@testing-library/jest-dom/vitest';
```

## Patterns

### Component Test

```typescript
// src/lib/components/Counter.test.ts
import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Counter from './Counter.svelte';

test('renders initial count', () => {
  render(Counter, { props: { initial: 5 } });
  expect(screen.getByText('Count: 5')).toBeInTheDocument();
});

test('increments on click', async () => {
  render(Counter, { props: { initial: 0 } });
  const button = screen.getByRole('button', { name: /increment/i });
  await fireEvent.click(button);
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### Testing Reactive State (.svelte.ts)

```typescript
// src/lib/stores/counter.test.ts
import { expect, test } from 'vitest';
import { flushSync } from 'svelte';
import { getCount, increment, reset } from './counter.svelte';

test('increment updates count', () => {
  reset();
  expect(getCount()).toBe(0);
  flushSync(() => increment());
  expect(getCount()).toBe(1);
});
```

### Testing with Snippets/Children

```typescript
// For components that accept children snippet
import { render, screen } from '@testing-library/svelte';
import Wrapper from './Wrapper.svelte';
import TestHost from './TestHost.test.svelte';

test('renders children', () => {
  // Create a test host component that passes snippets
  render(TestHost);
  expect(screen.getByText('child content')).toBeInTheDocument();
});
```

### Load Function Test

```typescript
// src/routes/posts/page.server.test.ts
import { expect, test, vi } from 'vitest';
import { load } from './+page.server';

test('returns posts from database', async () => {
  const mockDb = { query: vi.fn().mockResolvedValue([{ id: 1, title: 'Test' }]) };
  const result = await load({
    locals: { db: mockDb },
    depends: vi.fn(),
  } as any);

  expect(result.posts).toHaveLength(1);
  expect(mockDb.query).toHaveBeenCalled();
});
```

### Form Action Test

```typescript
// src/routes/login/page.server.test.ts
import { expect, test, vi } from 'vitest';
import { actions } from './+page.server';

test('returns fail on missing fields', async () => {
  const formData = new FormData();
  formData.set('email', 'test@example.com');
  // password missing

  const result = await actions.default({
    request: new Request('http://localhost', {
      method: 'POST',
      body: formData,
    }),
    cookies: { set: vi.fn(), get: vi.fn() },
  } as any);

  expect(result?.status).toBe(400);
});
```

### Playwright E2E

```typescript
// tests/e2e/login.test.ts
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: /log in/i }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Welcome')).toBeVisible();
});

test('shows error on invalid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: /log in/i }).click();

  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  await expect(page).toHaveURL('/login');
});
```

## Rules

- Never test implementation details (internal state, effect execution count).
- Always use `screen` queries  -  prefer `getByRole` > `getByText` > `getByTestId`.
- Use `fireEvent` for simple events, `userEvent` for complex interactions.
- Mock external deps (fetch, DB) at boundary, not inside components.
- E2E tests own the full stack  -  no mocking.
- Every new component gets at minimum a render test with default props.
