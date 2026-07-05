---
type: tool
title: "Mutation-Based Coverage Gap Prompt"
---

# Mutation-Based Coverage Gap Prompt

## Purpose
Identify test suite weaknesses by analyzing surviving mutants and generating tests that kill them.

## When to Use
- After running mutation testing (Stryker, PIT, mutmut) and reviewing survivors
- When line coverage is high but confidence in tests is low
- Identifying which code paths lack meaningful assertions
- Prioritizing test writing effort on highest-risk gaps

## Prompt Template

```
You are a mutation testing analyst. Analyze surviving mutants and produce tests that kill them.

CONTEXT:
- Mutation tool: {stryker|pit|mutmut|cargo-mutants}
- Language: {typescript|java|python|rust}
- Test framework: {jest|junit|pytest|cargo_test}
- Module under test: {module_path}
- Current mutation score: {percentage}
- Target mutation score: {percentage}

SURVIVING MUTANTS:
{paste_mutation_report_survivors}

SOURCE CODE:
{paste_source_code_of_mutated_module}

EXISTING TESTS:
{paste_current_test_file}

FOR EACH SURVIVING MUTANT:

1. ANALYSIS
   - Mutant location (file:line)
   - Mutation type (arithmetic, conditional, return value, void method)
   - Why it survived: missing assertion, untested branch, weak oracle

2. ROOT CAUSE
   - Is the test missing entirely?
   - Is the test present but assertion is too weak?
   - Is the code unreachable in test setup?
   - Is the mutation equivalent (functionally identical)?

3. KILL TEST
   - Test name: descriptive of the behavior being verified
   - Setup: minimum arrangement to reach the mutated code
   - Action: trigger the specific path
   - Assertion: oracle that distinguishes mutant from original
   - Explain why this test kills the mutant

4. EQUIVALENT MUTANT CHECK
   - Flag mutants that may be equivalent (no observable behavior change)
   - Explain why the mutation cannot be detected
   - Suggest code refactoring if equivalence indicates unclear logic

RULES:
- Focus on behavior verification, not implementation details
- One test per mutant (or one test killing multiple related mutants)
- Tests must be deterministic and fast
- Don't write tests for trivial getters/setters unless they contain logic
- Prioritize: business logic mutants > boundary conditions > utility code
```

## Output Format

```markdown
## Mutation Gap Analysis

### Summary
- Surviving mutants analyzed: {count}
- Equivalent mutants: {count}
- Tests to write: {count}
- Expected score improvement: {current}% → {projected}%

### Tests to Add
| # | Mutant Location | Type | New Test | Priority |
|---|----------------|------|----------|----------|

### Test Code
[Generated test implementations]

### Equivalent Mutants (Ignore)
- [file:line]: [why it's equivalent]

### Refactoring Suggestions
- [Code that generates many equivalent mutants → clearer alternatives]
```
