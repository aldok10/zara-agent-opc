/**
 * Page Object Model with Fixture Injection
 *
 * Demonstrates:
 * - POM class encapsulating locators and actions
 * - Custom fixture via test.extend()
 * - Clean test code with no page object instantiation boilerplate
 */

import { test as base, expect, type Page, type Locator } from '@playwright/test';

// --- Page Object ---

class CheckoutPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly addressInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.addressInput = page.getByLabel('Shipping address');
    this.submitButton = page.getByRole('button', { name: 'Place order' });
    this.successMessage = page.getByRole('heading', { name: 'Order confirmed' });
    this.errorAlert = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/checkout');
  }

  async fillForm(email: string, address: string) {
    await this.emailInput.fill(email);
    await this.addressInput.fill(address);
  }

  async submit() {
    await this.submitButton.click();
  }
}

// --- Fixture ---

type Fixtures = {
  checkoutPage: CheckoutPage;
};

const test = base.extend<Fixtures>({
  checkoutPage: async ({ page }, use) => {
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.goto();
    await use(checkoutPage);
  },
});

// --- Tests ---

test('successful checkout', async ({ checkoutPage }) => {
  await checkoutPage.fillForm('user@example.com', '123 Main St, City 12345');
  await checkoutPage.submit();

  await expect(checkoutPage.successMessage).toBeVisible();
});

test('shows validation error for empty email', async ({ checkoutPage }) => {
  await checkoutPage.fillForm('', '123 Main St, City 12345');
  await checkoutPage.submit();

  await expect(checkoutPage.errorAlert).toContainText('Email is required');
});
