---
type: fact
title: "Playwright Page Object Model and Fixtures"
---

# Playwright Page Object Model and Fixtures

## Page Object Pattern

### Basic POM Structure
```typescript
// pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### Using POM in Tests
```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await loginPage.login('user@example.com', 'correct-password');
    await expect(page).toHaveURL('/dashboard');
  });

  test('invalid credentials show error', async () => {
    await loginPage.login('user@example.com', 'wrong');
    await loginPage.expectError('Invalid credentials');
  });
});
```

## Component Page Objects (Reusable Parts)

```typescript
// components/navigation.component.ts
export class NavigationComponent {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  get nav() {
    return this.page.getByRole('navigation', { name: 'Main' });
  }

  async goTo(item: string) {
    await this.nav.getByRole('link', { name: item }).click();
  }

  async expectActive(item: string) {
    await expect(this.nav.getByRole('link', { name: item }))
      .toHaveAttribute('aria-current', 'page');
  }
}

// Use in page objects
export class DashboardPage {
  readonly nav: NavigationComponent;
  
  constructor(page: Page) {
    this.nav = new NavigationComponent(page);
  }
}
```

## Fixtures (Test Isolation and Reuse)

### Custom Fixture Definition
```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { DashboardPage } from './pages/dashboard.page';

type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  // Fixture that handles auth before test
  authenticatedPage: async ({ page }, use) => {
    // Login via API (faster than UI)
    const response = await page.request.post('/api/auth/login', {
      data: { email: 'test@example.com', password: 'password' }
    });
    const { token } = await response.json();
    
    // Set auth state
    await page.context().addCookies([{
      name: 'session',
      value: token,
      domain: 'localhost',
      path: '/'
    }]);
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

### Using Custom Fixtures
```typescript
// tests/dashboard.spec.ts
import { test, expect } from '../fixtures';

test('dashboard shows user data', async ({ authenticatedPage, dashboardPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(dashboardPage.welcomeMessage).toBeVisible();
});
```

## Test Isolation Strategies

### Storage State (Shared Auth)
```typescript
// auth.setup.ts — runs once before all tests
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  
  // Save auth state for other tests
  await page.context().storageState({ path: '.auth/user.json' });
});

// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'tests',
      dependencies: ['setup'],
      use: { storageState: '.auth/user.json' },
    },
  ],
});
```

### Per-Test Isolation
```typescript
// Each test gets its own browser context (default in Playwright)
test('test A modifies state', async ({ page }) => {
  // Changes here don't affect other tests
});

test('test B starts fresh', async ({ page }) => {
  // Clean context, no shared state
});
```

### Test Data Isolation
```typescript
// Fixture that creates and cleans up test data
export const test = base.extend<{ testOrder: Order }>({
  testOrder: async ({ page }, use) => {
    // Setup: create test data
    const response = await page.request.post('/api/test/orders', {
      data: { items: [{ sku: 'TEST-1', quantity: 1 }] }
    });
    const order = await response.json();
    
    // Provide to test
    await use(order);
    
    // Teardown: clean up
    await page.request.delete(`/api/test/orders/${order.id}`);
  },
});
```

## Best Practices

1. **Prefer user-facing locators**: `getByRole`, `getByLabel`, `getByText` over CSS/XPath
2. **POMs expose behaviors, not elements**: `loginPage.login()` not `loginPage.clickSubmit()`
3. **Assertions in tests, not POMs**: POMs can have `expect` helpers but tests own the assertions
4. **Fixtures for repeated setup**: auth, test data, page object creation
5. **API for setup, UI for verification**: create data via API, verify via UI
6. **No test interdependence**: each test must work in isolation and in any order
