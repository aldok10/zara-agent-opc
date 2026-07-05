---
type: subskill
title: "Testable Criteria"
---

# Testable Criteria

## Core Concepts

- Every criterion must have a binary pass/fail outcome  -  no subjective interpretation
- Use Given/When/Then format to express preconditions, actions, and expected results
- Criteria should be independent of implementation details
- Each criterion tests exactly one behavior; compound criteria get split
- Measurable thresholds replace vague qualifiers (e.g., "< 200ms" not "fast")

## Key Practices

- Write criteria before implementation starts  -  they drive development, not follow it
- Use concrete data examples: "Given user with balance $50" not "Given a user with money"
- Include boundary values explicitly: zero, one, max, overflow
- State negative cases: what should NOT happen is as important as what should
- Validate with developers: if they can't write a test from your criterion, rewrite it

## Common Mistakes

- Using subjective language: "intuitive", "user-friendly", "appropriate"
- Mixing multiple behaviors in one criterion  -  makes failure diagnosis impossible
- Writing criteria that only the happy path covers, ignoring error states

## When to Apply

- Writing or reviewing user story acceptance criteria
- Translating business rules into verifiable conditions
- Preparing stories for sprint planning or refinement
- QA asks "how do I know this is done?"
