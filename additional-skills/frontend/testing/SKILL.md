---
name: testing
description: "Frontend testing: Vitest, Testing Library, Playwright, MSW, visual regression, accessibility"
---

# Frontend Testing

## Scope

Unit, integration, e2e, and visual regression testing for frontend applications. Covers test strategy, tooling configuration, mocking, accessibility testing, and CI integration.

## First Action

Read existing test config (vitest.config.*, playwright.config.*, package.json test scripts) before writing or modifying tests.

## Constraints

1. Vitest over Jest for all new projects (faster, ESM-native, Vite-integrated).
2. Testing Library: test behavior, not implementation. Query by role/label.
3. Playwright for e2e: cross-browser, auto-waiting, reliable.
4. MSW v2 for network mocking at service worker level.
5. Test user flows, not component internals.
6. One assertion focus per test.
7. Avoid mocking what you don't own unless wrapped in adapter.
8. Visual regression for design system components.
9. axe-core integration for automated accessibility testing.
10. Query priority: getByRole > getByLabelText > getByText > getByTestId (last resort).

## DO NOT

- Use `container.querySelector` or `innerHTML` checks  -  use Testing Library queries
- Mock implementation details (state, hooks, internal methods)
- Write tests that pass when feature is broken (false positives)
- Use arbitrary `waitFor` timeouts  -  rely on auto-waiting
- Test library/framework internals (React rendering, Vue reactivity)
- Skip accessibility assertions in component tests
- Use snapshot tests as primary verification (supplement only)

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| Vitest config, unit/integration tests, coverage | `subskills/vitest.md` |
| E2E tests, browser automation, CI | `subskills/playwright.md` |
| API mocking, network interception | `subskills/msw.md` |
| Screenshot comparison, design system QA | `subskills/visual-regression.md` |

## Verification

- All tests pass: `npx vitest run` / `npx playwright test`
- Coverage meets threshold (statements >80%, branches >75%)
- No skipped tests without tracking issue
- Accessibility: `axe` reports zero violations on tested components
- CI pipeline green with test artifacts uploaded

## Knowledge

- `knowledge/testing-patterns.md`  -  15 proven frontend testing patterns
- `knowledge/common-mistakes.md`  -  12 common mistakes with fixes

## AI-Era Context (2026)

- Vitest 3 browser mode enables real-browser component testing without Playwright overhead
- Playwright component testing bridges unit and e2e -- test components in real browser context
- AI test generation produces tests that pass trivially; verify with mutation testing (Stryker)
- AI often generates implementation-detail tests (checking state/hooks) instead of behavior tests
- MSW v2 is the standard for network mocking; AI generates outdated v1 `rest.get` syntax

## Related Skills

- `typescript-expert`  -  type-safe test utilities
- `frontend/performance`  -  performance regression testing
