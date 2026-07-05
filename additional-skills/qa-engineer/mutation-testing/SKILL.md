# Subskill: Mutation Testing

> Activate when: mutation, Stryker, mutant, mutation score, test quality, surviving mutant, equivalent mutant
>
> Measure test quality, not code coverage. If mutants survive in business logic, tests are weak.

## Golden Rules

1. Business-critical modules first (not utilities)
2. Mutation score targets: >80% critical paths, >60% general code
3. Surviving mutants in business logic = test gaps (fix immediately)
4. Incremental mode in CI (only mutate changed code)
5. Equivalent mutants: mark and exclude from score
6. Run AFTER unit tests pass (mutation testing is slow)
7. Review surviving mutants weekly, not just the score number
8. Mutation testing complements coverage, does not replace it

## Stryker Configuration (JS/TS)

```json
{
  "mutate": ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/index.ts"],
  "testRunner": "vitest",
  "reporters": ["html", "progress", "dashboard"],
  "coverageAnalysis": "perTest",
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  },
  "incremental": true,
  "concurrency": 4,
  "timeoutMS": 60000,
  "timeoutFactor": 1.5
}
```

## CI Integration

```yaml
# PR: incremental only (fast)
mutation-pr:
  script: npx stryker run --incremental
  rules:
    - if: merge_request

# Nightly: full run on critical modules
mutation-full:
  script: npx stryker run --mutate "src/domain/**/*.ts"
  schedule: "0 2 * * *"
  allow_failure: false
```

## Surviving Mutant Analysis

| Mutant Type | Likely Cause | Fix Strategy |
|-------------|-------------|--------------|
| Conditional boundary (< to <=) | Missing boundary test | Add edge case test |
| Negated conditional (if to if!) | Weak assertion | Assert both true and false paths |
| Return value (true to false) | No assertion on return | Assert return value explicitly |
| Arithmetic (+  to -) | Test doesn't verify calculation | Add calculation verification |
| String mutation ("a" to "") | No empty string test | Add empty/null input tests |
| Removed function call | Side effect not tested | Assert the side effect occurred |

## Equivalent Mutants

Mutants that produce identical behavior (can't be killed):
- Dead code mutations
- Performance-only changes (loop optimization)
- Redundant condition changes

**Handle:** Mark in Stryker config with `// Stryker disable next-line` + comment explaining why.

## Interpretation Guide

- **Score >80%**: Strong test suite, focus on maintaining
- **Score 60-80%**: Acceptable, prioritize surviving mutants in critical paths
- **Score <60%**: Weak tests, likely testing implementation not behavior
- **Score drops between runs**: New code has weaker tests than existing

## Tools by Language

| Language | Tool | Config |
|----------|------|--------|
| JS/TS | Stryker | stryker.config.json |
| Java | PIT/pitest | pom.xml/build.gradle |
| Python | mutmut | setup.cfg |
| C# | Stryker.NET | stryker-config.json |
| Rust | cargo-mutants | cargo-mutants.toml |
| PHP | Infection | infection.json5 |

## Anti-Patterns

- Chasing 100% mutation score (diminishing returns past 85%)
- Mutating entire codebase in CI (too slow -- use incremental)
- Writing tests only to kill mutants (test behavior, not mutations)
- Ignoring equivalent mutants in scoring
- No timeout configuration (mutants can cause infinite loops)

## Delegates To

- **test-strategy** for overall coverage decisions
- **ci-integration** for pipeline optimization
