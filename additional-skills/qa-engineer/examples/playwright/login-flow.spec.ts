/**
 * Example: E2E login flow with Playwright
 * Demonstrates: fixtures, locators, auth state, assertions
 */
import { test, expect } from '@playwright/test';

// Auth fixture - run once, reuse across tests
test.describe('Authentication', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Semantic locators (getByRole > getByText > CSS)
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('secure-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Auto-wait: no sleep needed, assertion retries automatically
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('bad-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Error message appears (auto-waits)
    await expect(page.getByRole('alert')).toContainText('Invalid credentials');
    // Still on login page
    await expect(page).toHaveURL('/login');
  });

  test('empty form shows validation errors', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Sign in' }).click();

    // Both fields show required error
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });
});
