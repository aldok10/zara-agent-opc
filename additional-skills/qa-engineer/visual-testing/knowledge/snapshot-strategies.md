---
type: fact
title: "Snapshot Comparison Strategies"
---

# Snapshot Comparison Strategies

## Pixel-Level Comparison

### How It Works
Compare two images pixel by pixel. Calculate percentage of pixels that differ.

### Tools
- **Playwright** built-in: `expect(page).toHaveScreenshot()`
- **Percy** (BrowserStack): cloud-hosted pixel comparison with smart diffing
- **BackstopJS**: headless Chrome screenshots with configurable thresholds
- **reg-suit**: GitHub integration, S3 storage for baselines

### Playwright Screenshot Comparison
```typescript
// Basic comparison
await expect(page).toHaveScreenshot('page.png');

// With options
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 100,         // Allow up to 100 pixels to differ
  maxDiffPixelRatio: 0.01,    // Or 1% of total pixels
  threshold: 0.2,             // Per-pixel color sensitivity (0-1)
  animations: 'disabled',      // Freeze animations
  mask: [page.locator('.date')], // Mask dynamic elements
});

// Element-level screenshot
const card = page.getByTestId('product-card');
await expect(card).toHaveScreenshot('product-card.png');
```

### Pros
- Catches any visual change (layout, color, font, spacing)
- Simple to understand: "does it look the same?"
- Works with any rendering (canvas, SVG, complex CSS)

### Cons
- Sensitive to anti-aliasing, font rendering, sub-pixel differences
- Different OS/browser versions produce different baselines
- Flaky with animations, lazy-loaded content, dynamic data
- Baselines are large files in the repo

## Structural Comparison

### How It Works
Compare DOM structure, computed styles, and layout properties rather than rendered pixels.

### Tools
- **Chromatic** (Storybook): captures component stories, compares rendering
- **Happo**: cross-browser structural snapshots
- **jest-image-snapshot**: component-level with configurable thresholds

### Chromatic Example
```javascript
// Storybook stories become visual tests automatically
// .storybook/main.js — Chromatic captures each story

export default {
  title: 'Components/Button',
  component: Button,
};

// Each story is a visual test case
export const Primary = { args: { variant: 'primary', label: 'Click' } };
export const Secondary = { args: { variant: 'secondary', label: 'Click' } };
export const Disabled = { args: { variant: 'primary', disabled: true } };
export const Loading = { args: { variant: 'primary', loading: true } };
```

### Pros
- Less sensitive to rendering engine differences
- Better for component libraries (test each variant)
- Integrated review workflow (approve/reject in UI)
- Catches meaningful changes, ignores noise

### Cons
- Requires Storybook or similar component catalog
- Paid services for full features
- May miss pixel-level issues (color shifts, alignment)

## Comparison Strategy Selection

| Scenario | Recommended Approach |
|----------|---------------------|
| Full page screenshots (E2E) | Pixel comparison with masking |
| Component library | Structural (Chromatic) or pixel per-component |
| Marketing/landing pages | Pixel with loose threshold |
| Data dashboards | Structural + masked dynamic areas |
| Cross-browser consistency | Pixel comparison per browser |

## Reducing Flakiness

### Common Causes of Flaky Visual Tests
1. **Animations**: elements mid-transition when screenshot taken
2. **Font loading**: system font renders before web font loads
3. **Dynamic content**: dates, counters, user-generated content
4. **Lazy loading**: images not loaded when screenshot fires
5. **Cursor blink**: text input cursor state varies
6. **Scrollbar differences**: OS-level scrollbar rendering

### Mitigation Techniques

```typescript
// 1. Disable animations
await page.emulateMedia({ reducedMotion: 'reduce' });
// Or inject CSS:
await page.addStyleTag({ content: `
  *, *::before, *::after {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
  }
`});

// 2. Wait for fonts
await page.waitForFunction(() => document.fonts.ready);

// 3. Mask dynamic content
await expect(page).toHaveScreenshot({
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="avatar"]'),
    page.locator('.ad-slot'),
  ],
});

// 4. Wait for images
await page.waitForFunction(() => {
  const images = document.querySelectorAll('img');
  return Array.from(images).every(img => img.complete);
});

// 5. Hide cursor
await page.addStyleTag({ content: '* { caret-color: transparent !important; }' });

// 6. Consistent scrollbars
await page.addStyleTag({ content: `
  ::-webkit-scrollbar { display: none; }
  * { scrollbar-width: none; }
`});
```

### Deterministic Environment
```typescript
// Use Docker for consistent rendering
// playwright.config.ts
{
  use: {
    // Force consistent locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // Consistent color scheme
    colorScheme: 'light',
    // Fixed viewport
    viewport: { width: 1440, height: 900 },
  }
}
```

## Baseline Management

### Git LFS for Large Baselines
```bash
# Track screenshot files with Git LFS
git lfs track "**/__screenshots__/**"
git lfs track "**/*.png"
```

### Update Workflow
```bash
# Update all baselines (after intentional design change)
npx playwright test --update-snapshots

# Update specific test
npx playwright test homepage.visual.spec.ts --update-snapshots
```

### Review Process
1. PR creates visual diff report as artifact
2. Reviewer opens report, views side-by-side comparison
3. If change is intentional: approve + update baselines in PR
4. If change is unintentional: reject, fix the code

## Metrics

Track over time:
- Number of visual tests
- Flaky test rate (retries needed / total runs)
- False positive rate (approved without code change)
- Time to review visual diffs
- Unintentional regressions caught
