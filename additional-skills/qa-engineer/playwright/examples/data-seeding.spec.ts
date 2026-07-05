/**
 * API-First Data Seeding
 *
 * Demonstrates:
 * - Seeding test data via API before UI test (fast, reliable)
 * - Testing UI against known state
 * - Cleanup via API after test
 * - Why this beats UI-based setup: 10x faster, no UI flakiness in setup
 */

import { test, expect } from '@playwright/test';

interface Product {
  id: string;
  name: string;
  price: number;
}

let seededProduct: Product;

test.describe('Product catalog', () => {
  test.beforeEach(async ({ request }) => {
    // Seed data via API - fast, deterministic, bypasses UI
    const response = await request.post('/api/products', {
      data: {
        name: 'Wireless Headphones',
        price: 79.99,
        category: 'electronics',
        inStock: true,
      },
    });
    expect(response.ok()).toBe(true);
    seededProduct = await response.json();
  });

  test.afterEach(async ({ request }) => {
    // Cleanup: remove seeded data so tests stay isolated
    if (seededProduct?.id) {
      await request.delete(`/api/products/${seededProduct.id}`);
    }
  });

  test('displays seeded product in catalog', async ({ page }) => {
    await page.goto('/products');

    const productCard = page.getByRole('listitem').filter({ hasText: 'Wireless Headphones' });
    await expect(productCard).toBeVisible();
    await expect(productCard.getByText('$79.99')).toBeVisible();
  });

  test('can add seeded product to cart', async ({ page }) => {
    await page.goto(`/products/${seededProduct.id}`);

    await page.getByRole('button', { name: 'Add to cart' }).click();

    await expect(page.getByRole('status')).toContainText('Added to cart');
    // Verify cart count updated
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });
});
