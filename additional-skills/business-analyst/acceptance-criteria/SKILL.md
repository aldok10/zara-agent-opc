---
name: acceptance-criteria
description: "Acceptance criteria: Given-When-Then, testable conditions, edge cases, INVEST"
---

# Acceptance Criteria Skill

## Scope

Write precise, testable acceptance criteria using Given-When-Then (Gherkin) format. Cover happy paths, edge cases, error scenarios, and boundary conditions. Ensure every criterion is independently verifiable.

## First Action

Read the user story or requirement, then produce 3+ acceptance criteria covering happy path, edge case, and error path using Given-When-Then syntax.

## Constraints

1. Use Given-When-Then (Gherkin) syntax for every criterion
2. One behavior per criterion -- no compound conditions
3. Minimum 3 criteria per story: happy path, edge case, error/negative
4. Apply boundary value analysis for numeric/date/string-length inputs
5. Apply equivalence partitioning: one test per valid/invalid class
6. Every criterion must be independently testable without subjective judgment
7. Include preconditions explicitly in the Given clause
8. Specify exact expected outcomes in the Then clause (status codes, messages, state changes)
9. Three Amigos review: dev, QA, BA align before sprint starts
10. Decision tables for multi-condition logic (2+ input variables)
11. State transitions documented for workflow/status-based features
12. AC written before development begins; additions require team agreement
13. Definition of Done requires all AC verified (manual or automated)
14. Avoid implementation details -- describe what, not how

## DO NOT

1. Write vague criteria ("system works correctly", "good user experience")
2. Combine multiple behaviors in one Given-When-Then block
3. Skip negative/error scenarios
4. Use subjective language that cannot be machine-verified
5. Add criteria after development starts without team re-negotiation
6. Assume implicit preconditions -- state them explicitly
7. Write criteria that depend on other criteria's execution order
8. Specify UI implementation details (button color, layout) as AC

## Route to Subskill

| Signal | Subskill | Path |
|--------|----------|------|
| Gherkin syntax, scenario outlines, backgrounds | Gherkin Writing | subskills/gherkin.md |
| Boundary values, off-by-one, limits | Boundary Analysis | subskills/boundary.md |
| Error scenarios, invalid inputs, timeouts | Negative Testing | subskills/negative.md |
| Cucumber/SpecFlow/Behave mapping | Test Automation | subskills/automation.md |

## Verification

- Every AC parseable as valid Gherkin (Given/When/Then structure)
- Each story has minimum 3 AC covering happy, edge, error paths
- Boundary values identified for all numeric/date/string-length inputs
- No subjective or unmeasurable language present
- Decision tables used for multi-condition logic
- QA confirms all AC are independently testable

## Knowledge

- knowledge/gherkin-patterns.md - Gherkin syntax reference
- knowledge/boundary-techniques.md - Boundary value analysis
- knowledge/decision-tables.md - Multi-condition coverage
- tools/ac-template.md - Acceptance criteria template

## AI-Era Context (2026)

- AI-generated test code from Gherkin specs is standard practice -- write AC with automation in mind
- LLM-assisted AC review catches ambiguity and missing edge cases before Three Amigos
- Specification-by-example feeds directly into contract testing and API validation
- Behavior-driven development (BDD) pipelines auto-generate living documentation from AC

## Related Skills

- user-stories (AC attach to stories)
- requirements (AC verify requirements)
- domain-modeling (domain events map to AC scenarios)
