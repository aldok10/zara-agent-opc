---
type: tool
title: "Frontend Testing Strategy"
---

# Frontend Testing Strategy

## Purpose

Design or review frontend testing strategy and test code. Cover unit tests (Vitest), component tests (Testing Library), and E2E tests (Playwright). Ensure tests are reliable, maintainable, and provide real confidence.

## When to Use

- Designing test strategy for a feature or component
- Reviewing existing test code for quality
- Choosing what to test and at which level
- Debugging flaky or slow tests

## Prompt Template

Given the following code to test (or existing tests to review):

```
[paste component/feature code OR existing test code]
```

Feature description: `[what the code does from a user perspective]`

Evaluate/design for:

1. **Test Level**: Is each behavior tested at the right level? (unit for logic, component for interactions, E2E for critical flows) Are there redundant tests across levels?
2. **Testing Library**: Are queries using accessible selectors (`getByRole`, `getByLabelText`) over implementation details (`getByTestId`, class names)? Is `userEvent` preferred over `fireEvent`?
3. **Assertions**: Are assertions testing user-visible outcomes? Are implementation details avoided (internal state, private methods, DOM structure)?
4. **Async**: Are async operations awaited correctly (`waitFor`, `findBy`)? Are tests free of arbitrary `setTimeout` waits? Are loading/error states tested?
5. **Mocking**: Is mocking minimal and at boundaries? Are network calls mocked (MSW preferred)? Are mocks typed and realistic?
6. **E2E (Playwright)**: Are selectors resilient? Is test isolation maintained? Are flaky patterns avoided (fixed waits, DOM-dependent selectors)?
7. **Coverage**: Are happy paths, error paths, edge cases, and accessibility behaviors tested? Is coverage meaningful (not just line count)?

Context:
- Framework: [React/Vue/Svelte/Angular]
- Test runner: [Vitest/Jest]
- Component testing: [Testing Library/Cypress CT]
- E2E: [Playwright/Cypress]
- CI: [yes/no]

## Output Format

```
## Testing Assessment

### Test Strategy
| Behavior | Level | Status |
|----------|-------|--------|
| ...      | unit/component/e2e | covered/missing |

### Issues in Existing Tests
- [problem] — [why it reduces confidence] — [fix]

### Missing Tests
- [behavior not tested] — [recommended level] — [approach]

### Anti-patterns Found
- [pattern] — [why it's problematic] — [alternative]

### Recommendations
- [priority improvements]

### Verdict
[well-tested / gaps exist / tests provide false confidence]
```
