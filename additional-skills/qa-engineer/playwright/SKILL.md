# Subskill: Playwright

> Activate when: Playwright, browser test, E2E web, locator, getByRole, trace, page object, fixture, auto-wait, component test
>
> Auto-wait over sleep. Semantic locators over CSS. Isolation over shared state. Trace over console.log.

## Golden Rules

1. Locator priority: `getByRole` > `getByText` > `getByTestId` > `getByLabel` > CSS (last resort)
2. Never `page.waitForTimeout()` -- auto-wait handles everything
3. Web-first assertions: `expect(locator).toBeVisible()` auto-retries; `expect(await locator.textContent())` does NOT
4. One behavior per test (arrange-act-assert)
5. Test isolation: no shared state, fresh context per test
6. `test.extend()` for fixtures, not global variables
7. Parallel by default: `fullyParallel: true`
8. Trace on failure: `trace: 'on-first-retry'` in CI
9. Mock external services only, never your own app
10. Seed data via API (`request` fixture), not UI clicks
11. Use `expect.soft()` for non-blocking checks in assertion-heavy tests
12. Tag tests with `@tag` for selective execution

## Locator Strategy

```typescript
// BEST: semantic, resilient, user-facing
page.getByRole('button', { name: 'Submit' })
page.getByRole('heading', { name: /welcome/i })
page.getByLabel('Email address')
page.getByPlaceholder('Search...')

// GOOD: test-id when no semantic option
page.getByTestId('checkout-form')

// Filtering: narrow down locators
page.getByRole('listitem').filter({ hasText: 'Product 1' })
page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Buy' }) })
page.getByRole('row').filter({ hasText: 'John' }).getByRole('button', { name: 'Edit' })

// AVOID: brittle, implementation-coupled
page.locator('.btn-primary')  // CSS class
page.locator('div > span:nth-child(2)')  // DOM structure
```

## Page Object Model (POM) with Fixture Injection

```typescript
// models/checkout.page.ts
import { type Page, type Locator } from '@playwright/test';

export class CheckoutPage {
  readonly submitBtn: Locator;
  readonly total: Locator;

  constructor(private page: Page) {
    this.submitBtn = page.getByRole('button', { name: 'Place order' });
    this.total = page.getByTestId('order-total');
  }

  async goto() { await this.page.goto('/checkout'); }
  async placeOrder() { await this.submitBtn.click(); }
}

// fixtures.ts -- inject POM via fixture
import { test as base } from '@playwright/test';
import { CheckoutPage } from './models/checkout.page';

export const test = base.extend<{ checkoutPage: CheckoutPage }>({
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});

// usage in test
test('completes checkout', async ({ checkoutPage }) => {
  await checkoutPage.goto();
  await checkoutPage.placeOrder();
});
```

## Fixtures: Worker-Scoped & Data Seeding

```typescript
import { test as base } from '@playwright/test';

type WorkerFixtures = { dbPool: Pool };
type TestFixtures = { seededUser: { email: string; id: string } };

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Worker-scoped: created once per worker, shared across tests in that worker
  dbPool: [async ({}, use) => {
    const pool = new Pool({ connectionString: process.env.DB_URL });
    await use(pool);
    await pool.end();
  }, { scope: 'worker' }],

  // API-first data seeding via request fixture
  seededUser: async ({ request }, use) => {
    const res = await request.post('/api/test/users', { data: { role: 'customer' } });
    const user = await res.json();
    await use(user);
    await request.delete(`/api/test/users/${user.id}`);
  },
});
```

## Network Interception

```typescript
// Stub external API
await page.route('**/api/external/**', route =>
  route.fulfill({ json: { data: 'mocked' } })
);

// Assert API was called
const responsePromise = page.waitForResponse('**/api/submit');
await page.getByRole('button', { name: 'Submit' }).click();
const response = await responsePromise;
expect(response.status()).toBe(200);
```

## Soft Assertions & ARIA Snapshots

```typescript
// Soft assertions: continue test after failure, report all at end
test('dashboard displays all widgets', async ({ page }) => {
  await page.goto('/dashboard');
  await expect.soft(page.getByTestId('revenue')).toBeVisible();
  await expect.soft(page.getByTestId('users')).toBeVisible();
  await expect.soft(page.getByTestId('orders')).toContainText('$');
  // test continues even if one fails -- all failures reported
});

// ARIA snapshot: assert accessible tree structure
await expect(page.getByRole('navigation')).toMatchAriaSnapshot(`
  - navigation:
    - link "Home"
    - link "Products"
    - link "Contact"
`);
```

## Clock API (Time-Dependent Features)

```typescript
test('shows expired badge after timeout', async ({ page }) => {
  await page.clock.install({ time: new Date('2024-01-01T10:00:00') });
  await page.goto('/offers');
  await expect(page.getByText('Active')).toBeVisible();

  await page.clock.fastForward('02:00:00'); // advance 2 hours
  await expect(page.getByText('Expired')).toBeVisible();
});
```

## Custom Matchers

```typescript
// fixtures.ts
import { expect, mergeExpects } from '@playwright/test';

const customExpect = expect.extend({
  async toHaveCount(locator: Locator, expected: number) {
    const count = await locator.count();
    return { pass: count === expected, message: () => `Expected ${expected}, got ${count}` };
  },
});

export { customExpect as expect };
```

## Test Tagging & Selective Execution

```typescript
test('fast checkout @smoke @p0', async ({ page }) => { /* ... */ });
test('edge case @regression', async ({ page }) => { /* ... */ });

// CLI: npx playwright test --grep @smoke
// CLI: npx playwright test --grep-invert @regression
// Programmatic: test.describe('', { tag: ['@smoke'] }, () => { ... });
```

## Auth via Project Dependencies (not globalSetup.ts)

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { storageState: '.auth/user.json' },
    },
  ],
});

// tests/auth.setup.ts
import { test as setup } from '@playwright/test';
setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@test.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.context().storageState({ path: '.auth/user.json' });
});
```

## CI Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined, // parallelism within a shard
  reporter: [['html'], ['junit', { outputFile: 'results.xml' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Auto-start dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
});

// Sharding in CI (split across machines):
// Machine 1: npx playwright test --shard=1/3
// Machine 2: npx playwright test --shard=2/3
// Machine 3: npx playwright test --shard=3/3
// Workers = parallelism WITHIN a shard. Shards = parallelism ACROSS machines.
```

## Component Testing (CT)

```typescript
// playwright-ct.config.ts (separate config)
import { defineConfig } from '@playwright/experimental-ct-react';
export default defineConfig({
  testDir: './tests/components',
  use: { ctPort: 3100 },
});

// tests/components/Button.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from '../../src/components/Button';

test('renders with label', async ({ mount }) => {
  const component = await mount(<Button label="Click me" />);
  await expect(component).toContainText('Click me');
  await component.click();
});
```

## Debugging

1. **Trace viewer**: `npx playwright show-trace trace.zip`
2. **UI mode**: `npx playwright test --ui` (interactive, step-by-step)
3. **Debug mode**: `npx playwright test --debug` (inspector, pause)
4. **Codegen**: `npx playwright codegen` (record interactions)

## Anti-Patterns

- `page.waitForTimeout(5000)` -- use `expect(locator).toBeVisible()`
- `page.$eval('.class', el => ...)` -- use locator methods
- Testing third-party UI (OAuth) -- mock at boundary
- Sharing browser context between tests -- fresh context per test
- `networkidle` as wait condition -- unreliable, wait for specific element
- `globalSetup.ts` for auth -- use project dependencies instead
- Giant page objects with business logic -- POM = locators + simple actions only
- `test.beforeAll` for data that needs isolation -- use per-test fixtures

## Version Notes

Playwright 1.50+: ARIA snapshots, Clock API stable, box model assertions.

## AI-Era Context (2026)

AI generates locators and full test flows from page descriptions or user stories, and Playwright MCP enables AI agents to browse and interact with pages programmatically. Self-healing selectors reduce maintenance when DOM changes. However, AI-generated assertions often test presence (toBeVisible) without validating correctness (specific text, state, data). Human review validates that assertions match acceptance criteria, not just DOM existence. Playwright's trace viewer becomes essential for reviewing AI-generated test behavior.

## Knowledge

- `subskills/locators.md` -- locator strategy and best practices
- `subskills/ci-integration.md` -- Docker, sharding, artifact collection
- `subskills/component-testing.md` -- CT setup and patterns
- `subskills/trace-viewer.md` -- debugging with traces

## Delegates To

- **visual-testing** for screenshot comparison strategy
- **accessibility-testing** for axe-core integration
- **ci-integration** for Docker, artifact collection, shard orchestration
