---
type: tool
title: "Cypress Test Design Prompt"
---

# Cypress Test Design Prompt

## Purpose
Design Cypress E2E and component tests for a given feature with proper structure, mocking, and assertions.

## Inputs Required
- Feature description (what the user does)
- Pages/routes involved
- API endpoints the feature calls
- Key user interactions (clicks, typing, navigation)
- Expected outcomes (visual, data, navigation)

## Design Steps

### 1. Identify Test Scenarios

```markdown
## Feature: [Name]

### Happy Path
- [ ] User can [primary action] successfully

### Validation
- [ ] Form shows errors for invalid input
- [ ] Required fields enforced

### Edge Cases
- [ ] Empty state (no data)
- [ ] Loading state visible during fetch
- [ ] Error recovery (API fails, retry works)

### Cross-Browser / Responsive
- [ ] Works on mobile viewport (375px)
- [ ] Works on tablet viewport (768px)
```

### 2. Define API Stubs

```typescript
// List all API calls the feature makes
const stubs = {
  'GET /api/resource': 'fixture:resource.json',
  'POST /api/resource': { statusCode: 201, body: { id: 'new-1' } },
  'GET /api/resource (error)': { statusCode: 500 },
};
```

### 3. Write Test Structure

```typescript
describe('Feature: [Name]', () => {
  beforeEach(() => {
    // Common stubs for all tests
    cy.intercept('GET', '/api/dependencies', { fixture: 'deps.json' }).as('getDeps');
    cy.visit('/page');
    cy.wait('@getDeps');
  });

  context('when data loads successfully', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/resource', { fixture: 'resource.json' }).as('getResource');
    });

    it('displays the resource list', () => {
      // Arrange: already done in beforeEach
      // Act: page loads
      // Assert
      cy.get('[data-testid="resource-item"]').should('have.length.gte', 1);
    });

    it('allows creating a new resource', () => {
      cy.intercept('POST', '/api/resource', {
        statusCode: 201,
        body: { id: 'new', name: 'Created' }
      }).as('createResource');

      cy.get('[data-testid="create-btn"]').click();
      cy.get('input[name="name"]').type('New Resource');
      cy.get('[data-testid="submit"]').click();

      cy.wait('@createResource').its('request.body').should('deep.include', {
        name: 'New Resource'
      });
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });
  });

  context('when API fails', () => {
    it('shows error state with retry option', () => {
      cy.intercept('GET', '/api/resource', { statusCode: 500 }).as('getFail');
      cy.visit('/page');
      cy.wait('@getFail');

      cy.get('[data-testid="error-message"]').should('be.visible');
      
      // Retry succeeds
      cy.intercept('GET', '/api/resource', { fixture: 'resource.json' }).as('getRetry');
      cy.get('[data-testid="retry-btn"]').click();
      cy.wait('@getRetry');
      cy.get('[data-testid="resource-item"]').should('be.visible');
    });
  });

  context('on mobile viewport', () => {
    beforeEach(() => {
      cy.viewport(375, 667);
    });

    it('shows mobile navigation', () => {
      cy.get('[data-testid="hamburger-menu"]').should('be.visible');
      cy.get('[data-testid="desktop-nav"]').should('not.be.visible');
    });
  });
});
```

### 4. Custom Commands (if reusable)

```typescript
// cypress/support/commands.ts
Cypress.Commands.add('login', (email = 'test@example.com') => {
  cy.session(email, () => {
    cy.request('POST', '/api/auth/login', {
      email,
      password: 'testpass123'
    }).then((resp) => {
      window.localStorage.setItem('token', resp.body.token);
    });
  });
});
```

### 5. Output: Test Plan

```markdown
## Cypress Test Plan: [Feature]

### Files to Create
- `cypress/e2e/[feature].cy.ts` — E2E tests
- `cypress/fixtures/[feature]-*.json` — API stubs
- `cypress/support/[feature]-commands.ts` — Reusable commands (if needed)

### Test Cases ([count])
| # | Scenario | Type | Priority |
|---|----------|------|----------|

### API Stubs Required
| Method | Path | Fixture | Scenario |
|--------|------|---------|----------|

### Selectors Needed
| Element | Selector | Purpose |
|---------|----------|---------|

### Estimated Run Time: [X seconds]
```
