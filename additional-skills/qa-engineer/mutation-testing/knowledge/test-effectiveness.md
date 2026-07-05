---
type: fact
title: "Test Effectiveness Measurement"
---

# Test Effectiveness Measurement

## Mutation Score

Mutation testing measures test suite quality by introducing small code changes (mutants) and checking if tests detect them.

### Formula
```
Mutation Score = (Killed Mutants / Total Mutants) × 100%
```

### Interpretation
| Score | Quality Level | Action |
|---|---|---|
| >80% | Strong | Maintain, focus on critical paths |
| 60-80% | Moderate | Improve coverage of surviving mutants |
| 40-60% | Weak | Significant test gaps exist |
| <40% | Poor | Tests provide false confidence |

### Kill vs Survive
- **Killed**: test fails when mutant is introduced (test detected the change)
- **Survived**: all tests pass with mutant active (test gap)
- **Timed out**: mutant caused infinite loop (counts as killed)
- **No coverage**: no test executes the mutated line (coverage gap)

## Equivalent Mutants

An equivalent mutant produces identical behavior to the original code  -  it can't be killed because there's no observable difference.

### Common Sources
```java
// Original
if (x >= 0) return true;

// Equivalent mutant (if x is always integer)
if (x > -1) return true;
```

### Handling Strategies
- Manually review survived mutants for equivalence
- Use tool heuristics to flag likely equivalents
- Exclude trivial mutations (e.g., string literal changes in logs)
- Calculate adjusted score: `killed / (total - equivalent)`
- Typical equivalent rate: 5-15% of all mutants

### Reducing False Equivalents
- Use stricter mutation operators
- Configure tools to skip non-behavioral code (logging, comments)
- Focus mutations on business logic, not infrastructure

## Test Quality Metrics

### Beyond Code Coverage

| Metric | What It Measures | Limitation |
|---|---|---|
| Line coverage | Lines executed by tests | Doesn't verify assertions |
| Branch coverage | Decision paths taken | Same limitation |
| Mutation score | Assertion effectiveness | Computationally expensive |
| Defect detection rate | Bugs caught before prod | Lagging indicator |
| Mean time to detect | Speed of failure signal | Requires tracking |

### Assertion Density

```
Assertion Density = Assertions / Lines of Test Code
```

- Target: 1-3 assertions per test method
- Low density suggests tests execute but don't verify
- Too high may indicate tests doing too much

### Test-to-Code Ratio

```
Ratio = Lines of Test Code / Lines of Production Code
```

- Typical healthy range: 1:1 to 3:1
- Below 0.5:1 usually indicates under-testing
- Above 4:1 may indicate over-specification or poor test design

## Practical Measurement Approach

### Incremental Mutation Testing
Full mutation runs are slow. Use incremental:
1. Mutate only changed files (PR-scoped)
2. Run full mutation suite nightly/weekly
3. Track score trends over time
4. Set threshold: new code must achieve >75% mutation score

### Stryker Configuration (JavaScript/TypeScript)
```json
{
  "mutate": ["src/**/*.ts", "!src/**/*.spec.ts"],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  },
  "incremental": true,
  "concurrency": 4
}
```

### PIT Configuration (Java)
```xml
<configuration>
  <targetClasses>
    <param>com.example.service.*</param>
  </targetClasses>
  <mutationThreshold>75</mutationThreshold>
  <timestampedReports>false</timestampedReports>
  <mutators>
    <mutator>DEFAULTS</mutator>
    <mutator>REMOVE_CONDITIONALS</mutator>
  </mutators>
</configuration>
```

## Interpreting Surviving Mutants

### Triage Process
1. Is it an equivalent mutant? → Exclude
2. Is it in critical business logic? → Write test immediately
3. Is it in utility/helper code? → Prioritize based on usage
4. Is it in error handling? → Usually worth testing
5. Is it in logging/formatting? → Low priority

### High-Value Mutations to Focus On
- Boundary condition changes (`<` to `<=`)
- Return value mutations (true → false)
- Removed method calls (side effects vanish)
- Conditional negation (if → if not)
- Arithmetic operator swaps (+ to -)

### Low-Value Mutations to Deprioritize
- String literal changes in log messages
- Constant value changes in non-behavioral code
- Mutations in generated code
- Mutations in test infrastructure

## Tracking Over Time

### Dashboard Metrics
- Mutation score per module (trend line)
- Coverage vs mutation score correlation
- Survived mutants in critical paths (zero tolerance list)
- Time-to-run for mutation suite (performance budget)

### Quality Gates
```yaml
quality_gate:
  new_code:
    mutation_score: ">= 75%"
    line_coverage: ">= 80%"
  overall:
    mutation_score: ">= 60%"
    line_coverage: ">= 70%"
  critical_paths:
    mutation_score: ">= 90%"
```
