# Mutation Testing

## What It Is

Mutation testing injects small faults (mutants) into source code and checks whether existing tests detect them. If a test fails after a mutation, the mutant is "killed" (good). If all tests still pass, the mutant "survived" (test gap found).

Types of mutations:
- Arithmetic: `+` becomes `-`, `*` becomes `/`
- Conditional: `>` becomes `>=`, `===` becomes `!==`
- Logical: `&&` becomes `||`, `!` removed
- Statement: remove function calls, return early
- Value: swap true/false, empty string, zero

## Stryker

Primary mutation testing framework for JavaScript/TypeScript:

Configuration (`stryker.config.json`):
```json
{
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "testRunner": "vitest",
  "reporters": ["html", "clear-text", "progress"],
  "coverageAnalysis": "perTest",
  "incremental": true,
  "incrementalFile": ".stryker-tmp/incremental.json",
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

Incremental mode:
- Stores previous results, only re-tests changed files
- Reduces CI time from hours to minutes on large codebases
- `--incremental` flag or config option

Running:
```bash
npx stryker run                    # Full run
npx stryker run --incremental      # Only changed files
npx stryker run --mutate "src/auth/**"  # Specific directory
```

## Interpreting Results

Mutation score = killed / (killed + survived + timeout)

Categories:
- **Killed**: test caught the mutation (desired)
- **Survived**: no test detected the change (test gap)
- **Timeout**: mutation caused infinite loop (counted as detected)
- **No coverage**: no test executes the mutated code at all
- **Compile error**: mutation produced invalid code (ignored)

Healthy scores:
- 80%+ is strong for critical business logic
- 60-80% is acceptable for general application code
- Below 60% indicates significant test gaps
- 100% is usually not worth pursuing (diminishing returns)

## Equivalent Mutants Problem

Some mutations produce logically equivalent code (same behavior, different syntax). These inflate the "survived" count unfairly.

Examples:
- `x >= 0` mutated to `x > -1` (equivalent for integers)
- Dead code mutations (unreachable branches)

Mitigation:
- Stryker's static analysis skips some obvious equivalents
- Manual review of survived mutants to identify equivalents
- Focus on high-value survived mutants in critical paths
- Use `// Stryker disable next-line` for known equivalents

## Integration with CI

```yaml
# GitHub Actions example
- name: Mutation testing
  run: npx stryker run --incremental
  if: github.event_name == 'pull_request'

- name: Check mutation score
  run: |
    score=$(jq '.schemaVersion' reports/mutation/mutation.json)
    if [ "$score" -lt 60 ]; then exit 1; fi
```

Strategies:
- Full run on main branch (nightly or weekly)
- Incremental on PRs (only mutate changed files)
- Gate: break build if score drops below threshold
- Report survived mutants as PR comments

## Cost vs Value Analysis

When mutation testing is worth it:
- Authentication, authorization, payment logic
- Data validation and transformation
- Core business rules
- Security-sensitive code paths

When it is overkill:
- UI/presentation layer
- Configuration/glue code
- Generated code (ORMs, API clients)
- Prototype or throwaway code

Time cost:
- Typically 10-50x longer than a normal test suite run
- Incremental mode reduces this to 2-5x for PRs
- Parallelization across workers helps (Stryker supports this)
- Run on high-value modules only for practical CI integration
