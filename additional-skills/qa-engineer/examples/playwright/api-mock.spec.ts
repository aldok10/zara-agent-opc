/**
 * Example: Network interception with Playwright
 * Demonstrates: route mocking, response assertion, error simulation
 */
import { test, expect } from '@playwright/test';

test.describe('Product listing with mocked API', () => {
  test('displays products from API', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/products', route =>
      route.fulfill({
        status: 200,
        json: [
          { id: 1, name: 'Widget', price: 9.99 },
          { id: 2, name: 'Gadget', price: 19.99 },
        ],
      })
    );

    await page.goto('/products');

    // Verify products rendered
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByText('Widget')).toBeVisible();
    await expect(page.getByText('$9.99')).toBeVisible();
  });

  test('shows error state on API failure', async ({ page }) => {
    await page.route('**/api/products', route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );

    await page.goto('/products');

    await expect(page.getByRole('alert')).toContainText('Failed to load products');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('shows empty state when no products', async ({ page }) => {
    await page.route('**/api/products', route =>
      route.fulfill({ status: 200, json: [] })
    );

    await page.goto('/products');

    await expect(page.getByText('No products found')).toBeVisible();
  });
});
