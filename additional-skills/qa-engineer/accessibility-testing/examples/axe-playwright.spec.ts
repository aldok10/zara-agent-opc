import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Page-level accessibility scan with WCAG tag filtering
test.describe("Accessibility - Page Level", () => {
  test("home page meets WCAG 2.2 AA standards", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page })
      // Target specific WCAG conformance levels
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      // Exclude third-party widgets we don't control
      .exclude("#intercom-widget")
      .exclude("[data-third-party]")
      .exclude("iframe[src*='youtube.com']")
      .analyze();

    // Format violations for readable test output
    const violationSummary = results.violations.map(
      (v) => `[${v.id}] ${v.help} (${v.nodes.length} instances)`
    );

    expect(results.violations, violationSummary.join("\n")).toHaveLength(0);
  });
});

// Component-level scan with custom rule configuration
test.describe("Accessibility - Component Level", () => {
  test("navigation menu is accessible", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page })
      .include("[data-testid='main-nav']")
      .withTags(["wcag2a", "wcag2aa"])
      // Disable rules that don't apply to this component context
      .disableRules(["page-has-heading-one", "landmark-one-main"])
      .analyze();

    expect(results.violations).toHaveLength(0);
  });

  test("modal dialog meets focus management rules", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open settings" }).click();

    // Scan only the modal, with custom rule config
    const results = await new AxeBuilder({ page })
      .include("[role='dialog']")
      .withTags(["wcag2a", "wcag2aa", "best-practice"])
      // Enable color-contrast for high-contrast mode testing
      .options({ rules: { "color-contrast": { enabled: true } } })
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(
      critical,
      `Found ${critical.length} critical/serious a11y issues in modal`
    ).toHaveLength(0);
  });
});
