---
type: subskill
title: "Quality Gates"
---

# Quality Gates

Quality gates for AI-generated code. Prevent technical debt at AI speed.

## The vibe coding debt problem

Code that works today but nobody understands tomorrow. AI generates it faster than teams can absorb it, so debt accrues at machine speed.

## Mandatory gates before merge

1. CI passes (build + test + lint + type-check)
2. Coverage threshold maintained (no decrease)
3. SAST clean (no new security findings)
4. Architecture Decision Records for non-trivial changes
5. Code owner review (human, not a rubber stamp)

## Quality metrics to track

- **Test coverage**: maintain it; don't let AI code drag it down
- **Cyclomatic complexity**: AI sometimes generates over-complex solutions
- **Dependency count**: AI adds libraries freely  --  review each addition
- **PR size**: 1000+ line AI PR → decompose into smaller reviewable chunks

## Mutation testing

Verify test quality. If tests still pass when the code is mutated, the tests are weak. Tools: Stryker (TS), mutmut (Python), go-mutesting (Go).

## Property-based testing

For complex logic, generate random inputs and verify invariants. Catches edge cases the AI missed. Tools: Hypothesis (Python), rapid (Go), fast-check (TS).

## Documentation requirement

AI-generated code that introduces new patterns or architecture must carry a comment explaining WHY (not just what).

## Tech debt tracking

Flag AI-generated code that "works but should be improved." Keep a separate backlog. Prioritize by blast radius.

## Review time allocation

- 20% on "does it work" (tests handle most of this)
- 80% on "should this exist / does it fit / is it maintainable"

## Anti-patterns

- Only checking if tests pass (necessary but insufficient)
- No complexity gates
- Allowing AI to introduce new patterns without discussion
- No documentation for non-obvious decisions
