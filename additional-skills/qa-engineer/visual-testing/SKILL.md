# Subskill: Visual Testing

> Activate when: visual regression, screenshot, pixel diff, Chromatic, Percy, toHaveScreenshot, baseline, BackstopJS
>
> Mask dynamic content. Set thresholds for anti-aliasing. Human review before approving diffs.

## Golden Rules

1. Mask dynamic content (timestamps, avatars, animations, ads)
2. Anti-aliasing threshold: 0.1-0.2 (too strict = false positives)
3. Baselines stored per branch (avoid cross-branch conflicts)
4. Human review before approving visual diffs (never auto-approve)
5. Test key viewports: mobile (375px), tablet (768px), desktop (1440px)
6. Snapshot stable states only (after animations/transitions complete)
7. Component-level snapshots > full-page (smaller diff surface)
8. Separate visual tests from functional E2E tests

## Playwright Screenshots

```typescript
import { test, expect } from '@playwright/test';

test('homepage visual', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01,
    mask: [
      page.locator('[data-testid="timestamp"]'),
      page.locator('.avatar'),
    ],
    animations: 'disabled',
  });
});

// Component screenshot
test('button states', async ({ page }) => {
  await page.goto('/storybook/button');
  const button = page.getByRole('button', { name: 'Submit' });
  await expect(button).toHaveScreenshot('button-default.png');
  await button.hover();
  await expect(button).toHaveScreenshot('button-hover.png');
});
```

## Chromatic Workflow

```yaml
# CI pipeline
chromatic:
  script: npx chromatic --project-token=$CHROMATIC_TOKEN
  # TurboSnap: only test changed stories
  args: --only-changed

# Storybook integration
# Each story = visual test case
# Review in Chromatic UI: approve/deny changes
# Blocking: require approval before merge
```

## Baseline Management

| Strategy | Pros | Cons |
|----------|------|------|
| Git (Playwright) | Free, co-located with code | Merge conflicts, repo size |
| Cloud (Chromatic/Percy) | No merge issues, cross-browser | Cost, external dependency |
| Branch-based | No cross-branch conflicts | Must update on merge |

**Update workflow:**
```bash
# Playwright: update baselines
npx playwright test --update-snapshots

# Review changes in git diff
git diff --stat  # see which snapshots changed
# Verify each change is intentional before committing
```

## Configuration

```typescript
// playwright.config.ts - visual testing project
{
  projects: [
    {
      name: 'visual-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.visual.spec.ts',
    },
    {
      name: 'visual-mobile',
      use: { ...devices['iPhone 14'] },
      testMatch: '**/*.visual.spec.ts',
    },
  ],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,  // per-pixel color threshold
      animations: 'disabled',
    },
  },
}
```

## Dynamic Content Masking

```typescript
// Mask strategies
const masks = [
  page.locator('.timestamp'),       // dynamic times
  page.locator('.avatar'),          // user avatars
  page.locator('[data-animated]'),  // animations
  page.locator('.ad-banner'),       // ads
];

// Freeze content for determinism
await page.evaluate(() => {
  document.querySelectorAll('[data-testid="date"]').forEach(el => {
    el.textContent = '2024-01-01';
  });
});
```

## Anti-Patterns

- Auto-approving visual diffs without review
- Snapshotting loading/transition states (flaky)
- Zero threshold (too brittle -- font rendering varies)
- Storing baselines in separate repo (co-locate with code)
- Snapshotting every page (focus on design system components)
- No viewport variation (missing responsive regressions)

## AI-Era Context (2026)

AI-powered baseline comparison (Chromatic, Percy) goes beyond pixel diffing -- it understands component boundaries, auto-approves safe changes (copy updates, data refreshes), and flags layout shifts that affect usability. AI distinguishes intentional design changes from regressions, reducing review burden. However, subjective quality (spacing feels wrong, alignment is off but not broken) still needs human eyes. Auto-approval should be limited to changes within defined tolerance bands; structural layout changes always require human sign-off.

## Knowledge

- `subskills/baseline-management.md` -- baseline update workflow and strategies
- `subskills/chromatic-workflow.md` -- Chromatic setup and review process
- `subskills/playwright-screenshots.md` -- Playwright visual comparison patterns

## Delegates To

- **playwright** for locator strategy and test structure
- **cypress** for cypress-image-snapshot setup
- **ci-integration** for artifact collection and review workflow
