---
type: fact
title: "Cypress Retry and Flake Prevention"
---

# Cypress Retry and Flake Prevention

## Cypress Retry-Ability

Cypress commands automatically retry until they pass or timeout. Understanding which commands retry is essential for stable tests.

### Commands That Retry
- `cy.get()` — re-queries DOM until element found
- `cy.find()` — re-queries within subject
- `cy.contains()` — re-queries for text content
- `.should()` — retries the assertion chain
- `.its()` — retries property access

### Commands That Do NOT Retry
- `cy.click()` — acts immediately on current subject
- `cy.type()` — acts immediately
- `cy.request()` — fires once
- `cy.then()` — runs callback once (no retry)
- `cy.invoke()` — calls function once

### Key Rule
Only the LAST command before an assertion retries. Chain carefully:

```javascript
// BAD: click doesn't retry, assertion fails if timing off
cy.get('.btn').click().should('have.class', 'active');

// GOOD: separate action from assertion
cy.get('.btn').click();
cy.get('.btn').should('have.class', 'active');
```

## cy.wait() Anti-Patterns

### Never Use Arbitrary Waits
```javascript
// BAD: flaky, slow, hides real issues
cy.wait(3000);
cy.get('.result').should('exist');

// GOOD: wait for specific condition
cy.get('.result', { timeout: 10000 }).should('exist');
```

### When cy.wait() IS Appropriate
```javascript
// Waiting for aliased network request
cy.intercept('GET', '/api/users').as('getUsers');
cy.visit('/dashboard');
cy.wait('@getUsers'); // wait for specific request to complete
cy.get('.user-list').should('have.length.gt', 0);
```

### Common Replacements for cy.wait()

| Instead of | Use |
|---|---|
| `cy.wait(1000)` then check element | `cy.get(sel, { timeout: X })` |
| `cy.wait(2000)` for animation | `cy.get(sel).should('be.visible')` |
| `cy.wait(3000)` for API response | `cy.intercept()` + `cy.wait('@alias')` |
| `cy.wait(500)` between actions | Chain assertions between actions |

## Conditional Testing

Cypress discourages conditional testing (`if element exists, do X`) because it introduces non-determinism.

### Anti-Pattern
```javascript
// BAD: race condition — element may appear after check
cy.get('body').then(($body) => {
  if ($body.find('.modal').length) {
    cy.get('.modal .close').click();
  }
});
```

### Acceptable Patterns
```javascript
// OK: server-driven state you control
cy.request('/api/feature-flags').then((resp) => {
  if (resp.body.newUI) {
    cy.get('[data-testid="new-header"]').should('exist');
  }
});

// OK: cleaning up known state before test
cy.request('DELETE', '/api/test/notifications');
```

### The Rule
If your test needs conditional logic, the test setup is wrong. Control state via:
- API calls in `beforeEach`
- Database seeding
- Feature flag configuration
- Programmatic login (skip UI)

## Deterministic State

### Test Isolation
```javascript
beforeEach(() => {
  // Reset to known state via API
  cy.request('POST', '/api/test/reset');
  // Seed specific data for this test
  cy.request('POST', '/api/test/seed', { fixture: 'user-with-orders' });
  // Login programmatically (never through UI in beforeEach)
  cy.request('POST', '/api/auth/login', { email: 'test@test.com', password: 'pass' })
    .then((resp) => {
      window.localStorage.setItem('token', resp.body.token);
    });
});
```

### Clock Control
```javascript
// Deterministic time-based behavior
cy.clock(new Date('2024-01-15T10:00:00Z'));
cy.visit('/dashboard');
cy.get('.greeting').should('contain', 'Good morning');
```

### Network Determinism
```javascript
// Stub responses for consistent behavior
cy.intercept('GET', '/api/products', { fixture: 'products.json' }).as('products');
cy.visit('/shop');
cy.wait('@products');
// Now assertions are against known data
```

## Flake Detection and Prevention

### Common Flake Sources
1. **Animation timing** — assert visibility, don't wait fixed time
2. **Network race conditions** — intercept and wait for specific requests
3. **Shared state between tests** — isolate via beforeEach reset
4. **Element detachment** — re-query after DOM changes
5. **Viewport-dependent rendering** — set explicit viewport in test
6. **Third-party scripts** — block in `cy.intercept`

### Element Detachment Fix
```javascript
// BAD: element may detach during retry
cy.get('.item').first().click();

// GOOD: retry the full query chain
cy.get('.item').should('have.length.gt', 0).first().click();
```

### Flake Detection in CI
```javascript
// cypress.config.js
module.exports = defineConfig({
  retries: {
    runMode: 2,    // retry failed tests in CI
    openMode: 0    // no retry in interactive mode
  }
});
```

- Track tests that pass on retry — these are flaky
- Flag tests that fail >5% of runs for investigation
- Dashboard: Cypress Cloud or custom reporting shows flake rate

### Prevention Checklist
- [ ] No `cy.wait(number)` without justification
- [ ] All network-dependent assertions wait on intercepts
- [ ] Test data seeded per test, not shared
- [ ] No conditional DOM checks (if element exists...)
- [ ] Assertions use retry-able command chains
- [ ] Animations disabled or waited for via assertion
- [ ] `data-testid` attributes used (not CSS classes or text)
- [ ] Each test can run independently (no order dependency)

## Configuration for Stability

```javascript
// cypress.config.js
module.exports = defineConfig({
  defaultCommandTimeout: 8000,    // reasonable for most assertions
  requestTimeout: 15000,          // API calls may be slow in CI
  responseTimeout: 30000,         // file downloads, large responses
  pageLoadTimeout: 60000,         // initial page loads in CI
  video: true,                    // debug flakes via recording
  screenshotOnRunFailure: true,   // capture failure state
});
```
