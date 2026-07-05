# Playwright Visual Comparisons (Screenshots)

## toHaveScreenshot API

```ts
await expect(page).toHaveScreenshot('homepage.png', {
  maxDiffPixelRatio: 0.01,
  threshold: 0.2,
  animations: 'disabled',
});
```

Key options:
- **maxDiffPixelRatio**: Max ratio of different pixels (0.01 = 1%). Use for full-page shots.
- **maxDiffPixels**: Absolute pixel count threshold. Use for element shots.
- **threshold**: Per-pixel color difference tolerance (0-1). Higher = more forgiving.
- **animations**: `'disabled'` freezes CSS animations/transitions before capture.
- **caret**: `'hide'` removes blinking cursor from inputs.
- **scale**: `'css'` for consistent sizing across displays.

## Masking Dynamic Content

```ts
await expect(page).toHaveScreenshot({
  mask: [
    page.locator('.timestamp'),
    page.locator('[data-testid="avatar"]'),
    page.locator('.random-ad-banner'),
  ],
  maskColor: '#FF00FF', // Visible mask for debugging
});
```

Mask anything non-deterministic: dates, avatars, ads, random content, animated elements. Use locator arrays for precision.

## Full Page vs Element Screenshots

```ts
// Full page - captures entire scrollable content
await expect(page).toHaveScreenshot({ fullPage: true });

// Element - captures specific component
const card = page.locator('.product-card').first();
await expect(card).toHaveScreenshot('product-card.png');
```

Prefer element screenshots for component testing (faster, less brittle). Use full-page for layout regression on key pages only.

## Cross-Browser Baselines

Playwright stores baselines per browser and platform:
```
__screenshots__/
  test-name/
    homepage-chromium-linux.png
    homepage-firefox-linux.png
    homepage-webkit-linux.png
```

Naming convention: `{testName}-{browserName}-{platform}.png`. Each browser gets its own baseline. Never compare Chrome baseline against Firefox actual.

Configure in `playwright.config.ts`:
```ts
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.01,
    animations: 'disabled',
  },
},
```

## Update Workflow

When intentional UI changes occur:
```bash
npx playwright test --update-snapshots
```

Review updated baselines in git diff (use image diff viewer). Only commit baselines for intended changes. Partial update:
```bash
npx playwright test tests/homepage.spec.ts --update-snapshots
```

## CI Artifact Collection

```yaml
- name: Visual Tests
  run: npx playwright test
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: visual-diffs
    path: test-results/
    retention-days: 7
```

Playwright outputs actual, expected, and diff images on failure. Upload all three for review.

## Threshold Tuning Guide

| Scenario | maxDiffPixelRatio | threshold |
|----------|-------------------|-----------|
| Pixel-perfect components | 0 | 0.1 |
| Standard UI pages | 0.01 | 0.2 |
| Font rendering variance | 0.02 | 0.3 |
| Cross-platform tolerance | 0.05 | 0.3 |

Start strict, loosen only when false positives block CI. Every threshold increase should be documented with the reason. If you need threshold > 0.05 ratio, the test is probably too broad - narrow to element screenshots.
