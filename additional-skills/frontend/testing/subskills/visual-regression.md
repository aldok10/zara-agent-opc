---
name: visual-regression
trigger: "Screenshot testing, visual comparison, design system QA, Chromatic, Percy"
---

# Visual Regression Testing

## Activation

User needs screenshot comparison tests, design system component QA, or visual regression CI integration.

## Core Principles

- Visual tests supplement functional tests  -  never replace them
- Test components in known states (default, hover, error, loading, responsive)
- Consistent environment: fixed viewport, fonts loaded, animations disabled
- Review visual diffs intentionally  -  auto-approve is an anti-pattern
- Keep visual baselines in version control or dedicated service

## Decision Table

| Scenario | Tool |
|----------|------|
| Free, self-hosted, simple | Playwright screenshots + `toMatchSnapshot` |
| Storybook components at scale | Chromatic (SaaS) |
| Framework-agnostic, CI-native | Percy (SaaS) |
| Design system with many states | Storybook + Chromatic |
| Specific pages/flows | Playwright visual comparisons |

## Patterns

### Playwright Screenshots

```ts
import { test, expect } from '@playwright/test';

test('button states', async ({ page }) => {
  await page.goto('/storybook/button--default');

  // Full page screenshot
  await expect(page).toHaveScreenshot('button-default.png');

  // Element screenshot
  const button = page.getByRole('button', { name: 'Submit' });
  await expect(button).toHaveScreenshot('button-submit.png');

  // Hover state
  await button.hover();
  await expect(button).toHaveScreenshot('button-submit-hover.png');
});
```

### Consistent Environment

```ts
// playwright.config.ts  -  visual test project
{
  name: 'visual',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 720 },
    // Disable animations for consistency
    launchOptions: {
      args: ['--force-prefers-reduced-motion'],
    },
  },
  // Higher threshold for anti-aliasing differences
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
}
```

### Component States Matrix

```ts
const states = ['default', 'hover', 'focus', 'disabled', 'loading', 'error'];
const sizes = ['sm', 'md', 'lg'];

for (const state of states) {
  for (const size of sizes) {
    test(`button ${size} ${state}`, async ({ page }) => {
      await page.goto(`/storybook/button--${state}?size=${size}`);
      await expect(page.locator('.story-container')).toHaveScreenshot(
        `button-${size}-${state}.png`
      );
    });
  }
}
```

### Chromatic with Storybook

```bash
# Install
npm install -D chromatic

# Run (CI)
npx chromatic --project-token=$CHROMATIC_TOKEN --auto-accept-changes=main
```

```ts
// .storybook/main.ts
export default {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@chromatic-com/storybook'],
};
```

### Responsive Visual Tests

```ts
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const vp of viewports) {
  test(`hero section ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect(page.locator('[data-testid="hero"]')).toHaveScreenshot(
      `hero-${vp.name}.png`
    );
  });
}
```

### Update Baselines

```bash
# Update all snapshots
npx playwright test --update-snapshots

# Update specific test
npx playwright test button.visual.spec.ts --update-snapshots
```

## CI Integration

- Run visual tests on PR only (not on every push)
- Use a dedicated `visual` project in Playwright config
- Store baselines in Git LFS for large projects
- Require manual review of visual diffs before merge
