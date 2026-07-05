---
type: subskill
name: playwright
trigger: "E2E tests, browser automation, component testing, CI, trace viewer, fixtures"
---

# Playwright

## Activation

User needs end-to-end tests, cross-browser testing, component tests in real browser, CI setup, or debugging with trace viewer.

## Core Principles

- Auto-waiting by default  -  no manual sleeps or waitFor
- Locators over selectors  -  resilient to DOM changes
- Fixtures for test isolation and reusable setup
- Trace viewer for debugging flaky tests
- Parallel by default, isolated browser contexts

## Locator Priority

| Priority | Method | Use When |
|----------|--------|----------|
| 1 | `getByRole` | Element has accessible role |
| 2 | `getByLabel` | Form inputs with labels |
| 3 | `getByText` | Visible text content |
| 4 | `getByTestId` | No semantic alternative |
| 5 | CSS/XPath | Never (except legacy migration) |

## Decision Table

| Scenario | Approach |
|----------|----------|
| User flow (login, checkout) | E2E test with page objects |
| Component in isolation | Playwright component testing |
| Visual diff | Screenshot comparison (see visual-regression) |
| Flaky test debugging | Enable tracing, run with `--trace on` |
| CI pipeline | Sharded, retry=2, trace on first retry |
| Auth-gated pages | `storageState` fixture for session reuse |

## Patterns

### Config

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['junit', { outputFile: 'results.xml' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Page Object Pattern

```ts
// e2e/pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private page: Page) {
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### Custom Fixture

```ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';

type Fixtures = { loginPage: LoginPage };

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
```

### Auth State Reuse

```ts
// e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@test.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: '.auth/user.json' });
});
```

### CI Commands

```bash
# Install browsers
npx playwright install --with-deps

# Run all tests
npx playwright test

# Run with trace for debugging
npx playwright test --trace on

# Show report
npx playwright show-report

# Sharded run (CI)
npx playwright test --shard=1/4
```
