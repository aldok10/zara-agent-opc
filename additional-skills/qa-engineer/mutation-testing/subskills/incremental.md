---
type: subskill
title: "Incremental Mutation Testing"
---

# Incremental Mutation Testing

## Incremental Mode

Only mutate files changed since last run to keep mutation testing fast:
```json
{
  "incremental": true,
  "incrementalFile": "reports/stryker-incremental.json"
}
```

Stryker stores previous results and re-uses them for unchanged code.

## Git-Based Filtering

Target only files changed in the current PR:
```bash
# Get changed files from git
CHANGED=$(git diff --name-only origin/main...HEAD -- 'src/**/*.ts')

# Pass to Stryker via mutate pattern
npx stryker run --mutate "$CHANGED"
```

Alternative with `--since`:
```bash
npx stryker run --incremental --incrementalFile reports/stryker-incremental.json
```

The incremental file tracks which mutations were tested previously and skips them.

## Caching Strategy

The `incrementalFile` stores:
- File hashes (detect changes)
- Previous mutation results per mutant
- Test coverage mapping

```yaml
# CI caching (GitHub Actions)
- uses: actions/cache@v4
  with:
    path: reports/stryker-incremental.json
    key: stryker-${{ runner.os }}-${{ github.base_ref }}
    restore-keys: stryker-${{ runner.os }}-
```

## Parallel Execution

Configure concurrency for faster runs:
```json
{
  "concurrency": 4,
  "tempDirName": ".stryker-tmp"
}
```

- Default: `os.cpus().length - 1`
- Reduce if tests are memory-heavy or use shared resources
- Each worker runs a subset of mutants independently

## Performance Optimization

Use `perTest` coverage analysis for maximum speed:
```json
{
  "coverageAnalysis": "perTest"
}
```

- `perTest`: only runs tests that cover the mutated code (fastest)
- `all`: runs full suite per mutant (slowest, most thorough)
- `off`: no coverage analysis, runs everything

## Baseline Comparison

Track mutation score over time:
```bash
# Store baseline score
npx stryker run --reporters json,html
# Compare in CI
node scripts/compare-mutation-score.js --baseline 85 --current reports/mutation.json
```

Fail CI if score drops below threshold:
```json
{
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

## CI Strategy

Optimize pipeline with split approach:
- **PR builds**: incremental mode, changed files only (~2-5 min)
- **Nightly builds**: full mutation run, all source files (~30-60 min)
- **Release gate**: full run must pass threshold before deploy

```yaml
# PR job
stryker-incremental:
  script: npx stryker run --incremental --mutate "$(git diff --name-only origin/main...HEAD)"

# Nightly job
stryker-full:
  schedule: "0 2 * * *"
  script: npx stryker run
```
