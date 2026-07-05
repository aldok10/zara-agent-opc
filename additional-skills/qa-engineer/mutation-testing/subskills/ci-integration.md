---
type: subskill
title: "Mutation Testing CI Integration"
---

# Mutation Testing CI Integration

## Incremental Mode

Only mutate files changed in the PR for fast feedback:

```bash
# Stryker incremental (uses previous report as baseline)
npx stryker run --incremental

# Combined with git diff for PR scope
npx stryker run --mutate "$(git diff --name-only origin/main -- 'src/**/*.ts' | tr '\n' ',')"
```

Incremental file: stores previous results, only re-runs affected mutants.
```json
{ "incremental": true, "incrementalFile": ".stryker-cache/incremental.json" }
```

## PR Gate Thresholds

```json
{
  "thresholds": {
    "break": 50,
    "low": 60,
    "high": 80
  }
}
```

- **break**: Fail the build below this score. Set conservatively (50-60).
- **low**: Warn in yellow. Signal that coverage is declining.
- **high**: Green status. Target for mature modules.

Ratchet strategy: set `break` to current score minus 5%. Never allow regression.

## Full Run Scheduling

```yaml
# GitHub Actions: nightly full mutation run
on:
  schedule:
    - cron: '0 2 * * 1-5'  # Weeknights at 2am
  workflow_dispatch:
```

Full runs on critical modules weekly. Use `mutate` array to scope:
```json
{ "mutate": ["src/core/**/*.ts", "src/auth/**/*.ts"] }
```

## Caching

```json
{
  "incremental": true,
  "incrementalFile": ".stryker-cache/incremental.json"
}
```

Cache the incremental file between CI runs (GitHub Actions cache, S3, etc.). Reduces re-analysis by 60-80% on typical PRs.

## Reporting

- **Dashboard**: set `STRYKER_DASHBOARD_API_KEY` env var, add `"dashboard"` reporter.
- **PR comments**: use `json` reporter + custom script to post score diff.
- **Badge**: dashboard provides embeddable mutation score badge.

## Parallel Execution

```json
{
  "concurrency": 4
}
```

Set to number of CPU cores available in CI. Higher concurrency = faster runs but more memory. For large projects, 4-8 is typical.

## Performance Optimization

1. **coverageAnalysis: perTest** - biggest single speedup, only runs relevant tests
2. **Exclude generated code** - remove auto-generated files from mutate glob
3. **Exclude low-value operators** - drop StringLiteral if producing noise
4. **Incremental mode** - skip unchanged mutants on repeat runs
5. **Scope to changed files** - in PR gates, only mutate the diff
6. **Timeout tuning** - reduce timeoutMS to kill slow mutants faster
