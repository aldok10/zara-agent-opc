---
type: fact
title: "Visual Regression CI Integration"
---

# Visual Regression CI Integration

## Pipeline Design

### Where Visual Tests Fit
```
PR → Lint → Unit → Integration → Build → Deploy Preview → Visual Tests → Merge
                                                               ↑
                                          Compare against main branch baselines
```

### Why Run After Deploy
- Screenshots need a running application
- Deploy preview gives a stable URL for consistent captures
- Isolates visual changes from build issues

## GitHub Actions Setup

### Basic Playwright Visual Tests
```yaml
name: Visual Regression
on:
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.44.0-jammy
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run visual tests
        run: npx playwright test --project=visual
      
      - name: Upload diff report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff-report
          path: |
            test-results/
            playwright-report/
          retention-days: 7
      
      - name: Comment PR with results
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '**Visual regression detected.** Check the [test report](link-to-artifact) for diffs.'
            })
```

### With Deploy Preview (Vercel/Netlify)
```yaml
jobs:
  visual-tests:
    runs-on: ubuntu-latest
    needs: [deploy-preview]  # Wait for preview deployment
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install chromium
      
      - name: Run visual tests against preview
        run: npx playwright test --project=visual
        env:
          BASE_URL: ${{ needs.deploy-preview.outputs.url }}
```

## Threshold Tuning

### Starting Conservative, Then Relaxing
```typescript
// Start strict — catch everything
{ maxDiffPixelRatio: 0 }

// After first false positives, loosen per page type
const thresholds = {
  static: 0.001,       // Almost no change allowed
  textHeavy: 0.01,     // Font rendering varies
  dataHeavy: 0.02,     // Charts, numbers change
  animated: 0.05,       // Motion-sensitive pages
};
```

### Per-Browser Tolerance
```typescript
// Different browsers render slightly differently
const browserThresholds = {
  chromium: 0.005,
  firefox: 0.01,     // Font rendering differs more
  webkit: 0.01,      // Safari-specific rendering
};
```

### Adaptive Thresholds
```typescript
// Use environment to set thresholds
const isCI = process.env.CI === 'true';
const threshold = isCI ? 0.01 : 0; // Stricter locally
```

## Baseline Storage Strategies

### Option 1: In Repository (Git LFS)
```bash
# .gitattributes
tests/__screenshots__/** filter=lfs diff=lfs merge=lfs -text
```
- Pros: versioned with code, works offline
- Cons: repo size grows, merge conflicts on baselines

### Option 2: Cloud Storage (S3/GCS)
```yaml
- name: Download baselines
  run: aws s3 sync s3://visual-baselines/${{ github.base_ref }} ./baselines

- name: Run tests
  run: npx playwright test --project=visual

- name: Upload new baselines (on merge)
  if: github.ref == 'refs/heads/main'
  run: aws s3 sync ./test-results/snapshots s3://visual-baselines/main
```
- Pros: no repo bloat, independent versioning
- Cons: network dependency, harder to review in PR

### Option 3: Service-Managed (Percy, Chromatic)
- Pros: built-in review UI, auto-managed baselines, approval workflow
- Cons: monthly cost, vendor dependency

## Handling Baseline Updates

### Automated Update Flow
```yaml
# When visual tests fail and change is intentional
- name: Update snapshots
  if: github.event.pull_request.labels.contains('update-snapshots')
  run: |
    npx playwright test --project=visual --update-snapshots
    git add tests/__screenshots__/
    git commit -m "chore: update visual baselines"
    git push
```

### Manual Update Process
```markdown
1. Visual test fails on PR
2. Developer reviews diff in artifact report
3. If intentional: run `npx playwright test --update-snapshots`
4. Commit updated baselines to the PR
5. Reviewer verifies the visual change matches intent
```

## Multi-Browser Visual Testing

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'visual-chrome',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
      testMatch: '**/*.visual.spec.ts',
      snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/chromium/{arg}{ext}',
    },
    {
      name: 'visual-firefox',
      use: { browserName: 'firefox', viewport: { width: 1440, height: 900 } },
      testMatch: '**/*.visual.spec.ts',
      snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/firefox/{arg}{ext}',
    },
    {
      name: 'visual-safari',
      use: { browserName: 'webkit', viewport: { width: 1440, height: 900 } },
      testMatch: '**/*.visual.spec.ts',
      snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/webkit/{arg}{ext}',
    },
  ],
});
```

## Performance Considerations

### Speeding Up Visual Tests
1. **Run in parallel**: Playwright shards across workers
2. **Selective runs**: only test pages affected by PR changes
3. **Single browser first**: run Chrome, add others for releases
4. **Component vs page**: test components in Storybook (faster), pages in E2E (fewer)

```yaml
# Sharded execution
- run: npx playwright test --project=visual --shard=${{ matrix.shard }}/${{ matrix.total }}
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
      total: [4]
```

### Cost Management (Paid Services)
- Percy: charged per snapshot → limit to critical pages
- Chromatic: charged per snapshot → use TurboSnap (only test changed stories)
- Self-hosted: only cost is CI minutes → run broadly

## Monitoring and Alerting

### Track Visual Test Health
- Flakiness rate: if >5% retries, investigate environment stability
- Baseline age: if baselines >30 days old without update, likely drifted
- Review time: if visual reviews take >1 day, process needs improvement
- False positive rate: if >20% of failures are approved without code change, thresholds are too tight
