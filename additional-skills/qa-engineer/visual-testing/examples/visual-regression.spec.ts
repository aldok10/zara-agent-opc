import { test, expect } from "@playwright/test";

// Disable animations globally for stable visual snapshots
test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
});

test.describe("Visual Regression - Dashboard", () => {
  // Full page screenshot with pixel threshold
  // maxDiffPixelRatio: percentage of pixels allowed to differ (0.01 = 1%)
  test("full page matches baseline", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("dashboard-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  // Component screenshot with masking dynamic content
  test("sidebar navigation matches baseline", async ({ page }) => {
    await page.goto("/dashboard");

    const sidebar = page.getByTestId("sidebar");

    await expect(sidebar).toHaveScreenshot("sidebar.png", {
      // Mask elements with dynamic content (timestamps, avatars)
      mask: [page.getByTestId("user-avatar"), page.getByTestId("last-login")],
      maxDiffPixels: 50,
    });
  });
});

// Multi-viewport visual testing
// Run: npx playwright test --update-snapshots to regenerate baselines
const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const vp of viewports) {
  test(`responsive layout at ${vp.name} (${vp.width}x${vp.height})`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot(`dashboard-${vp.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });

    await context.close();
  });
}
