---
type: example
title: "Cypress API Intercept with Fixtures"
---

# Cypress API Intercept with Fixtures

## Context
When testing frontend behavior independently from backend APIs. Intercepts let you control response data, simulate errors, and test loading states without flaky network dependencies. Use for: deterministic test data, error state testing, and offline behavior.

## Code/Template

```typescript
// cypress/e2e/dashboard.cy.ts
describe('Dashboard', () => {
  beforeEach(() => {
    // Intercept all API calls before visiting the page
    cy.intercept('GET', '/api/v1/metrics', { fixture: 'metrics.json' }).as('getMetrics');
    cy.intercept('GET', '/api/v1/alerts', { fixture: 'alerts.json' }).as('getAlerts');
    cy.intercept('GET', '/api/v1/user/profile', { fixture: 'profile.json' }).as('getProfile');

    cy.visit('/dashboard');
  });

  it('renders metrics from API response', () => {
    cy.wait('@getMetrics');

    cy.getByTestId('metric-revenue').should('contain', '$42,350');
    cy.getByTestId('metric-users').should('contain', '1,247');
    cy.getByTestId('metric-uptime').should('contain', '99.97%');
  });

  it('displays alert banner when critical alerts exist', () => {
    cy.wait('@getAlerts');

    cy.getByTestId('alert-banner')
      .should('be.visible')
      .and('contain', '2 critical alerts');
  });

  it('handles API timeout gracefully', () => {
    // Override the default intercept with a delayed response
    cy.intercept('GET', '/api/v1/metrics', {
      delay: 10000,
      fixture: 'metrics.json',
    }).as('getMetricsSlow');

    cy.visit('/dashboard');

    // Should show loading skeleton
    cy.getByTestId('metrics-skeleton').should('be.visible');

    // Should show timeout message after threshold
    cy.getByTestId('timeout-message', { timeout: 6000 })
      .should('contain', 'Taking longer than expected');
  });

  it('shows error state on 500 response', () => {
    cy.intercept('GET', '/api/v1/metrics', {
      statusCode: 500,
      body: { error: 'Internal server error' },
    }).as('getMetricsFailed');

    cy.visit('/dashboard');
    cy.wait('@getMetricsFailed');

    cy.getByTestId('error-state')
      .should('be.visible')
      .and('contain', 'Failed to load metrics');

    cy.getByTestId('retry-button').should('be.visible');
  });

  it('retries failed request on retry button click', () => {
    let callCount = 0;

    cy.intercept('GET', '/api/v1/metrics', (req) => {
      callCount++;
      if (callCount === 1) {
        req.reply({ statusCode: 503 });
      } else {
        req.reply({ fixture: 'metrics.json' });
      }
    }).as('getMetricsRetry');

    cy.visit('/dashboard');
    cy.wait('@getMetricsRetry');

    cy.getByTestId('retry-button').click();
    cy.wait('@getMetricsRetry');

    // Should render successfully after retry
    cy.getByTestId('metric-revenue').should('contain', '$42,350');
  });

  it('sends correct authorization header', () => {
    cy.intercept('GET', '/api/v1/metrics', (req) => {
      expect(req.headers.authorization).to.match(/^Bearer .+/);
      expect(req.headers['x-request-id']).to.exist;
      req.reply({ fixture: 'metrics.json' });
    }).as('getMetricsAuth');

    cy.visit('/dashboard');
    cy.wait('@getMetricsAuth');
  });

  it('handles paginated list with intercept', () => {
    cy.intercept('GET', '/api/v1/transactions?page=1*', {
      fixture: 'transactions-page1.json',
    }).as('getPage1');

    cy.intercept('GET', '/api/v1/transactions?page=2*', {
      fixture: 'transactions-page2.json',
    }).as('getPage2');

    cy.visit('/dashboard/transactions');
    cy.wait('@getPage1');

    cy.getByTestId('transaction-row').should('have.length', 20);

    cy.getByTestId('load-more').click();
    cy.wait('@getPage2');

    cy.getByTestId('transaction-row').should('have.length', 40);
  });
});
```

```json
// cypress/fixtures/metrics.json
{
  "data": {
    "revenue": { "value": 42350, "currency": "USD", "trend": "+12.3%" },
    "activeUsers": { "value": 1247, "trend": "+5.1%" },
    "uptime": { "value": 99.97, "unit": "percent" }
  },
  "meta": { "timestamp": "2024-01-15T10:00:00Z", "cached": false }
}
```

```json
// cypress/fixtures/alerts.json
{
  "data": [
    { "id": "alert-1", "severity": "critical", "message": "CPU > 95% on prod-web-3" },
    { "id": "alert-2", "severity": "critical", "message": "Disk usage > 90% on prod-db-1" }
  ],
  "meta": { "total": 2 }
}
```

## Key Points
- Always alias intercepts with `.as()` and `cy.wait('@alias')` to avoid race conditions between page load and assertions
- Test the unhappy path: timeouts, 500s, 403s, empty responses, malformed JSON - these are where real bugs hide
- Use dynamic intercept handlers (callback form) when you need to vary responses across requests (retry flows, pagination)
