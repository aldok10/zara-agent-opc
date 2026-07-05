---
type: example
title: "ARIA Live Region Testing"
---

# ARIA Live Region Testing

## Context
When testing dynamic content updates (notifications, form errors, chat messages) that must be announced by screen readers. ARIA live regions are often implemented but never verified - this test catches silent failures.

## Code/Template

```typescript
// tests/accessibility/aria-live.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('ARIA Live Regions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notifications');
  });

  test('toast notification announces to screen readers', async ({ page }) => {
    // Verify live region exists before interaction
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
    await expect(liveRegion).toHaveText('');

    // Trigger notification
    await page.getByRole('button', { name: 'Save changes' }).click();

    // Verify announcement content
    await expect(liveRegion).toHaveText('Changes saved successfully');

    // Verify correct aria-live value (polite for non-urgent)
    await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    await expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  test('form validation errors use assertive live region', async ({ page }) => {
    await page.goto('/signup');

    // Submit empty form
    await page.getByRole('button', { name: 'Create account' }).click();

    // Error summary should be assertive (urgent)
    const errorRegion = page.locator('[aria-live="assertive"]');
    await expect(errorRegion).toContainText('3 errors must be fixed');

    // Individual fields should have aria-describedby linking to errors
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');

    const describedBy = await emailInput.getAttribute('aria-describedby');
    const errorMessage = page.locator(`#${describedBy}`);
    await expect(errorMessage).toHaveText('Email is required');
  });

  test('loading state announces progress', async ({ page }) => {
    const statusRegion = page.locator('[role="status"]');

    await page.getByRole('button', { name: 'Load data' }).click();

    // Should announce loading started
    await expect(statusRegion).toHaveText('Loading data...');

    // Should announce completion
    await expect(statusRegion).toHaveText('Data loaded. 24 items displayed.');
  });

  test('no axe-core violations on live regions', async ({ page }) => {
    await page.getByRole('button', { name: 'Save changes' }).click();

    // Wait for live region to populate
    await page.locator('[aria-live="polite"]').filter({ hasText: /.+/ }).waitFor();

    const results = await new AxeBuilder({ page })
      .include('[aria-live]')
      .include('[role="status"]')
      .include('[role="alert"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('dynamic list updates announce item count', async ({ page }) => {
    await page.goto('/search');

    const resultsRegion = page.locator('[aria-live="polite"][aria-relevant="additions text"]');

    await page.getByLabel('Search').fill('playwright');
    await page.getByLabel('Search').press('Enter');

    // Should announce result count, not each individual item
    await expect(resultsRegion).toHaveText(/\d+ results found/);
  });
});
```

## Key Points
- Use `polite` for non-urgent updates (saves, status), `assertive` for errors requiring immediate attention
- Always test that live regions are empty before interaction - pre-populated content won't be announced
- Combine with axe-core to catch structural violations (missing roles, incorrect nesting)
