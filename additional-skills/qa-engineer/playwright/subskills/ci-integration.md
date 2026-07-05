---
type: subskill
title: "CI Integration"
---

# CI Integration

## Docker Image Selection

```yaml
# Use the official Playwright image matching your installed version
image: mcr.microsoft.com/playwright:v1.52.0-noble

# Variants:
# mcr.microsoft.com/playwright:v1.52.0-noble       # Ubuntu 24.04, all browsers
# mcr.microsoft.com/playwright:v1.52.0-noble-arm64 # ARM64 runners
```

Always pin the image version to match `@playwright/test` in package.json.

## Sharding Strategy

```bash
# Split tests across N parallel CI jobs
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
```

**Workers vs Shards:**
- Workers = parallel processes within ONE machine (use `--workers=4`)
- Shards = splits test files across MULTIPLE CI jobs/machines
- Combine both: 4 shards x 2 workers = 8 parallel streams

Rule of thumb: shard when test suite > 5 min on single machine.

## GitHub Actions Example

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    container:
      image: mcr.microsoft.com/playwright:v1.52.0-noble
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx playwright test --shard=${{ matrix.shard }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report-${{ strategy.job-index }}
          path: playwright-report/
          retention-days: 7
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-traces-${{ strategy.job-index }}
          path: test-results/
          retention-days: 3
```

## GitLab CI Example

```yaml
playwright:
  image: mcr.microsoft.com/playwright:v1.52.0-noble
  parallel: 4
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
    expire_in: 7 days
```

## Retry Strategy

```ts
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0, // retry in CI, never locally
  use: {
    trace: 'on-first-retry', // capture trace only on retry for debugging
  },
});
```

- Local: 0 retries (flakiness must be visible)
- CI: 1-2 retries (tolerate infra flakiness)
- If a test retries > 30% of runs: fix the test, don't increase retries

## Selective Browser Install

```bash
# Install only what you need on CI (saves 500MB+)
npx playwright install --with-deps chromium

# For multi-browser:
npx playwright install --with-deps chromium firefox
```

## Artifact Collection

Configure in `playwright.config.ts`:

```ts
export default defineConfig({
  reporter: [
    ['html', { open: 'never' }],       // HTML report for artifact upload
    ['github'],                          // GitHub Actions annotations
  ],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
});
```

Upload `playwright-report/` for HTML browsable report. Upload `test-results/` for traces, screenshots, and videos from failed tests.
