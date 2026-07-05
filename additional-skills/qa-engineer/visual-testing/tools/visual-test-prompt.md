---
type: tool
title: "Visual Regression Setup Prompt"
---

# Visual Regression Setup Prompt

## Purpose
Design and implement a visual regression testing strategy with appropriate tooling, thresholds, and CI integration.

## Inputs Required
- Application type (web app, component library, marketing site)
- Current test framework (Playwright, Cypress, Storybook)
- CI/CD platform (GitHub Actions, GitLab CI, etc.)
- Number of pages/components to cover
- Acceptable visual difference threshold
- Budget constraints (free vs paid tools)

## Design Steps

### 1. Choose Approach

```markdown
## Comparison Strategy

| Approach | Tool | Best For |
|----------|------|----------|
| Pixel diff | Playwright screenshots, Percy, Chromatic | Exact visual match |
| Structural diff | Storybook + Chromatic | Component-level changes |
| Layout shift | Custom (element position tracking) | Responsive design |
| DOM snapshot | jest-serializer-html | Structure without visual |

### Selected: [approach] because [reason]
```

### 2. Define Scope

```markdown
## What to Capture

### Pages/Views (E2E level)
| Page | Viewports | States |
|------|-----------|--------|
| Homepage | 375, 768, 1440 | Default, logged-in |
| Dashboard | 768, 1440 | Empty, with data, error |
| Checkout | 375, 1440 | Step 1, Step 2, Confirmation |

### Components (Component level)
| Component | Variants | States |
|-----------|----------|--------|
| Button | primary, secondary, disabled | default, hover, focus |
| Modal | small, large | open, loading |
| Card | with/without image | default, selected |
```

### 3. Configure Capture

```typescript
// playwright.config.ts  -  visual test project
{
  name: 'visual',
  use: {
    // Consistent rendering environment
    viewport: { width: 1440, height: 900 },
    // Disable animations for stable screenshots
    launchOptions: {
      args: ['--font-render-hinting=none']
    },
  },
  // Run visual tests separately
  testMatch: '**/*.visual.spec.ts',
}
```

```typescript
// tests/homepage.visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage visual', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Wait for fonts
    await page.waitForFunction(() => document.fonts.ready);
  });

  test('desktop view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });
});
```

### 4. Set Thresholds

```markdown
## Threshold Strategy

| Content Type | maxDiffPixelRatio | Reasoning |
|-------------|-------------------|-----------|
| Text-heavy pages | 0.01 (1%) | Font rendering varies slightly |
| Image-heavy pages | 0.005 (0.5%) | Images should be exact |
| Charts/graphs | 0.02 (2%) | Data-driven, slight variation ok |
| Animation frames | 0.05 (5%) | Timing-sensitive, looser |

### Ignore Regions
- Timestamps / relative dates (always changing)
- Ads / third-party widgets
- Random/dynamic content (avatars, recommendations)
```

### 5. CI Integration

```yaml
# .github/workflows/visual-tests.yml
name: Visual Regression
on: [pull_request]

jobs:
  visual:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.40.0-jammy
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --project=visual
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diff-report
          path: test-results/
```

### 6. Baseline Management

```markdown
## Baseline Update Process

1. Run visual tests locally: `npx playwright test --project=visual`
2. Review diffs in HTML report
3. If changes are intentional: update snapshots
   `npx playwright test --project=visual --update-snapshots`
4. Commit updated baselines with the PR
5. PR review includes visual diff review

## When to Update
- After intentional design changes
- After dependency updates that affect rendering
- After browser version upgrades (re-baseline everything)
```

## Output Format

```markdown
## Visual Regression Plan: [Project]

### Approach
- Tool: [chosen]
- Comparison: [pixel/structural/both]
- Coverage: [N pages, M components]

### Configuration
- Viewports: [list]
- Browsers: [list]
- Threshold: [default %]

### CI Setup
- Trigger: [PR / nightly / both]
- Storage: [where baselines live]
- Review: [how diffs are reviewed]

### Maintenance
- Baseline update frequency: [when]
- Flaky mitigation: [strategy]
- Ownership: [who reviews visual diffs]
```
