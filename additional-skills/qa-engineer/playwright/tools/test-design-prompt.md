---
type: tool
title: "Playwright Test Design Prompt"
---

# Playwright Test Design Prompt

## Purpose
Design Playwright E2E tests for a feature with proper structure, fixtures, mocking, and assertions.

## Inputs Required
- Feature description (user-facing behavior)
- Pages/routes involved
- API endpoints the feature calls
- Authentication requirements
- Expected visual states (loading, error, success, empty)

## Design Steps

### 1. Identify Test Scenarios

```markdown
## Feature: [Name]

### Critical Path (must test)
- [ ] Happy path: user completes primary action
- [ ] Auth guard: unauthenticated user redirected

### Error Handling
- [ ] API failure: error message displayed
- [ ] Network timeout: graceful degradation
- [ ] Validation: form errors shown

### Edge Cases
- [ ] Empty state (no data)
- [ ] Large dataset (pagination)
- [ ] Concurrent actions
```

### 2. Define Test Architecture

```typescript
// Determine what's needed:
// - Page objects for each page involved
// - Fixtures for auth, test data
// - Route handlers for API mocking
// - Shared setup in beforeEach

// File structure:
// tests/
//   fixtures.ts           -  custom fixtures
//   pages/
//     feature.page.ts     -  page object
//   feature/
//     happy-path.spec.ts
//     error-cases.spec.ts
```

### 3. Write Page Object

```typescript
// pages/[feature].page.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class FeaturePage {
  readonly page: Page;
  // Locators using accessible selectors
  readonly heading: Locator;
  readonly primaryAction: Locator;
  readonly itemList: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '[Feature]' });
    this.primaryAction = page.getByRole('button', { name: '[Action]' });
    this.itemList = page.getByRole('list', { name: '[Items]' });
    this.loadingIndicator = page.getByRole('status');
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/[feature]');
  }

  async performAction(data: ActionData) {
    // Fill form / click buttons
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.loadingIndicator).not.toBeVisible();
  }

  async expectEmpty() {
    await expect(this.page.getByText('No items')).toBeVisible();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### 4. Write Test Spec

```typescript
import { test, expect } from '../fixtures';
import { FeaturePage } from '../pages/feature.page';

test.describe('Feature: [Name]', () => {
  let featurePage: FeaturePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    featurePage = new FeaturePage(authenticatedPage);
  });

  test('happy path', async ({ page }) => {
    // Mock API
    await page.route('**/api/resource', async (route) => {
      await route.fulfill({ path: './fixtures/resource.json' });
    });

    await featurePage.goto();
    await featurePage.expectLoaded();
    await featurePage.performAction({ /* data */ });
    
    // Assert outcome
    await expect(page).toHaveURL('/success');
  });

  test('API failure shows error', async ({ page }) => {
    await page.route('**/api/resource', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await featurePage.goto();
    await featurePage.expectError('Something went wrong');
  });
});
```

### 5. Output: Test Plan

```markdown
## Playwright Test Plan: [Feature]

### Files to Create
- `tests/pages/[feature].page.ts`
- `tests/[feature]/[scenarios].spec.ts`
- `tests/fixtures/[feature]-data.json`

### Test Cases
| # | Scenario | Mocks Needed | Assertions | Priority |
|---|----------|--------------|------------|----------|

### API Routes to Mock
| Method | URL Pattern | Response | Scenario |
|--------|-------------|----------|----------|

### Fixtures Needed
- Auth state: [yes/no]
- Test data: [describe]
- Custom fixtures: [list]

### Accessibility Checks
- [ ] All interactive elements have accessible names
- [ ] Focus order is logical
- [ ] Error announcements via live regions

### Visual Checks
- [ ] Loading state screenshot
- [ ] Error state screenshot
- [ ] Success state screenshot

### Run Config
```bash
npx playwright test tests/[feature] --project=chromium
```
```
