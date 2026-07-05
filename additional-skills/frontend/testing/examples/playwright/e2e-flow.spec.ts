import { test, expect } from '@playwright/test';

// --- Page Objects ---

class LoginPage {
  constructor(private page: import('@playwright/test').Page) {}

  get emailInput() { return this.page.getByLabel('Email'); }
  get passwordInput() { return this.page.getByLabel('Password'); }
  get submitButton() { return this.page.getByRole('button', { name: 'Sign in' }); }
  get errorMessage() { return this.page.getByRole('alert'); }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

class DashboardPage {
  constructor(private page: import('@playwright/test').Page) {}

  get heading() { return this.page.getByRole('heading', { name: 'Dashboard' }); }
  get userMenu() { return this.page.getByRole('button', { name: /user menu/i }); }
  get logoutLink() { return this.page.getByRole('menuitem', { name: 'Log out' }); }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.page).toHaveURL('/dashboard');
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutLink.click();
  }
}

// --- Tests ---

test.describe('Authentication flow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('successful login redirects to dashboard', async () => {
    await loginPage.goto();
    await loginPage.login('user@example.com', 'validPassword123');
    await dashboardPage.expectLoaded();
  });

  test('invalid credentials shows error', async () => {
    await loginPage.goto();
    await loginPage.login('user@example.com', 'wrongpassword');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText('Invalid email or password');
    await expect(loginPage.page).toHaveURL('/login');
  });

  test('logout returns to login page', async ({ page }) => {
    // Setup: login first
    await loginPage.goto();
    await loginPage.login('user@example.com', 'validPassword123');
    await dashboardPage.expectLoaded();

    // Act: logout
    await dashboardPage.logout();

    // Assert: back at login
    await expect(page).toHaveURL('/login');
    await expect(loginPage.emailInput).toBeVisible();
  });

  test('protected route redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login?redirect=/dashboard');
  });

  test('login form is keyboard accessible', async ({ page }) => {
    await loginPage.goto();

    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(loginPage.emailInput).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(loginPage.passwordInput).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(loginPage.submitButton).toBeFocused();

    // Submit via Enter
    await loginPage.emailInput.fill('user@example.com');
    await loginPage.passwordInput.fill('validPassword123');
    await page.keyboard.press('Enter');
    await dashboardPage.expectLoaded();
  });
});
