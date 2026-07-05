---
type: subskill
title: "Automation-Friendly Criteria"
---

# Automation-Friendly Criteria

## Core Concepts

- Criteria should map directly to automated test steps without interpretation
- Stable selectors: reference data attributes or roles, not visual layout or CSS classes
- State setup must be explicit — automated tests need reproducible preconditions
- Assertions target observable system state, not internal implementation
- Time-dependent criteria need deterministic controls (clock mocking, fixed timestamps)

## Key Practices

- Write criteria that translate to one test method with clear arrange/act/assert
- Specify exact test data: "user email: test@example.com" not "a valid email"
- Include API contract details: expected status codes, response shapes, error formats
- Define wait conditions explicitly: "order status changes to CONFIRMED" not "order is processed"
- Keep criteria independent — no test should depend on another test's side effects

## Common Mistakes

- Writing criteria that require visual inspection: "page looks correct"
- Depending on external service state that can't be controlled in test environments
- Using natural language so ambiguous that two testers write different assertions

## When to Apply

- Teams practicing BDD or specification-by-example
- Writing criteria that will feed directly into Cucumber/SpecFlow/Playwright scenarios
- CI pipeline requires all criteria to have corresponding automated checks
- Transitioning from manual QA to automated regression suites
