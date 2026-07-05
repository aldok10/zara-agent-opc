---
type: subskill
title: "Surviving Mutant Analysis"
---

# Surviving Mutant Analysis

## Reading the HTML Report

Open `reports/mutation/html/index.html`. Color coding:
- **Red**: Survived mutants (tests didn't catch the change)
- **Green**: Killed mutants (tests caught the change)
- **Yellow**: No coverage (no test executes this code)
- **Orange**: Timeout (mutant caused infinite loop - counts as killed)

Drill into files to see exact mutations. Each mutant shows the original code, the mutation applied, and which tests ran against it.

## Equivalent Mutants

Equivalent mutants produce identical behavior to the original - they can't be killed.

Common equivalents:
- `x >= 0` mutated to `x > 0` when x is always positive integer
- Removing a redundant `break` in a switch case that returns
- Negating a condition in dead code paths

Identification: if after analysis you confirm no test can distinguish the mutant from original, mark with `// Stryker disable next-line` and comment the reason.

## Prioritization Framework

1. **Critical**: Business logic mutations (pricing, auth, state transitions)
2. **High**: Data validation, API contracts, error handling
3. **Medium**: UI logic, formatting, non-critical calculations
4. **Low**: Logging, metrics, cosmetic utilities

Focus effort on surviving mutants in critical/high paths first. Low-priority survivors in utility code can wait.

## Common Surviving Mutant Types and Fixes

| Mutant Type | Example | Fix Strategy |
|-------------|---------|--------------|
| ConditionalExpression | `if (x > 5)` -> `if (true)` | Add boundary test: x=5, x=6 |
| EqualityOperator | `===` -> `!==` | Assert both true and false cases |
| BlockStatement | Remove block body | Verify side effect occurred |
| ArithmeticOperator | `+` -> `-` | Assert exact numeric result |
| BooleanLiteral | `true` -> `false` | Test both branches explicitly |
| ArrayDeclaration | `[]` -> `["Stryker"]` | Assert array length or emptiness |

## Test Strengthening Patterns

- **Boundary survivors**: Add tests at exact boundary values (off-by-one)
- **Condition survivors**: Test both true and false branches, assert different outcomes
- **Block removal survivors**: Assert the side effect, not just the return value
- **Negation survivors**: Assert the negative case explicitly, don't rely on "no error thrown"

## Triage Workflow

Weekly cadence:
1. Generate fresh report on main branch
2. Sort surviving mutants by priority (business logic first)
3. Identify equivalent mutants - mark and exclude
4. Create tickets for top 5-10 survivors per sprint
5. Track mutation score trend over time (target: +2-5% per sprint)

## Connecting to Test Gap Analysis

Surviving mutants reveal specific test gaps:
- Cluster of survivors in one file = undertested module
- ConditionalExpression survivors = missing branch coverage
- BlockStatement survivors = testing return values but not side effects
- Pattern of survivors in error paths = happy-path-only testing

Feed surviving mutant clusters into test planning. Each cluster becomes a test story.
