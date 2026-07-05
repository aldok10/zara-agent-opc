---
type: tool
title: "Playwright Fixture Design Prompt"
---

# Playwright Fixture Design Prompt

## Purpose
Design reusable Playwright fixtures including page objects, custom setup/teardown, and shared test state for maintainable test suites.

## When to Use
- Setting up a new Playwright test project structure
- Refactoring existing tests to use fixtures and page objects
- Creating shared authentication or data setup fixtures
- Designing test utilities for a team to reuse

## Prompt Template

```
You are a test automation architect designing Playwright fixtures.

CONTEXT:
- Application type: {spa|mpa|ssr}
- Auth mechanism: {cookie|jwt|oauth|session}
- Key pages/flows: {list_main_user_journeys}
- Team size: {how_many_engineers_write_tests}
- Existing patterns: {current_approach_if_migrating}
- Playwright version: {version}

DESIGN THE FIXTURE SYSTEM:

1. BASE FIXTURES (extend test)
   - Authenticated user fixture (storageState approach)
   - Multiple user roles (admin, member, viewer)
   - API context fixture for backend setup/teardown
   - Database seeding fixture (if applicable)
   - Feature flag fixture

2. PAGE OBJECT FIXTURES
   - One fixture per major page/component
   - Constructor takes page, exposes actions and assertions
   - Locators as private properties (single source of truth)
   - Action methods return void or next page object
   - Assertion methods use expect() internally
   - Composite actions for multi-step flows

3. SETUP/TEARDOWN PATTERNS
   - Global setup: auth tokens, shared test data
   - Per-worker: isolated database/tenant
   - Per-test: specific data state via API
   - Cleanup: automatic via fixture teardown (yield pattern)
   - Idempotent setup (safe to retry)

4. FIXTURE COMPOSITION
   - Fixtures depending on other fixtures
   - Scoped fixtures (test vs worker)
   - Option fixtures for configuration
   - Auto-fixtures for tracing/screenshots on failure

RULES:
- Fixtures over beforeEach/afterEach (composable, typed, scoped)
- Page objects expose behavior, not selectors
- Locators use getByRole/getByTestId, never CSS classes
- No page.waitForTimeout  -  use proper conditions
- Fixtures must be independent (no order dependency)
- Teardown must run even if test fails (use try/finally or generator)
- Keep fixtures focused: one responsibility each
```

## Output Format

```markdown
## Fixture Architecture

### File Structure
```
tests/
  fixtures/
    index.ts         (extended test export)
    auth.fixture.ts
    api.fixture.ts
  pages/
    login.page.ts
    dashboard.page.ts
  specs/
    login.spec.ts
```

### Base Test Extension
[Code: custom test = base.extend<Fixtures>()]

### Example Fixtures
[Code: auth fixture with storageState]
[Code: page object fixture]

### Usage Example
[Code: test using composed fixtures]

### Conventions
- Naming: {pattern}
- Scope rules: {when to use test vs worker}
- File organization: {grouping strategy}
```
