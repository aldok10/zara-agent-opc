/**
 * Example: Cypress intercept patterns with auth
 * Demonstrates: cy.intercept, cy.session, data-testid, aliases
 */
describe('Dashboard with authenticated user', () => {
  beforeEach(() => {
    // Cache auth session across tests
    cy.session('test-user', () => {
      cy.request('POST', '/api/auth/login', {
        email: 'user@test.com',
        password: 'password',
      }).then((res) => {
        window.localStorage.setItem('token', res.body.token);
      });
    });
  });

  it('loads user data from API', () => {
    // Spy on API call
    cy.intercept('GET', '/api/user/profile').as('getProfile');

    cy.visit('/dashboard');
    cy.wait('@getProfile').its('response.statusCode').should('eq', 200);

    cy.get('[data-testid="user-name"]').should('contain', 'Test User');
  });

  it('handles API error gracefully', () => {
    // Stub error response
    cy.intercept('GET', '/api/user/profile', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getProfileError');

    cy.visit('/dashboard');
    cy.wait('@getProfileError');

    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });

  it('submits form and verifies request body', () => {
    cy.intercept('POST', '/api/settings').as('saveSettings');

    cy.visit('/settings');
    cy.get('[data-testid="display-name"]').clear().type('New Name');
    cy.get('[data-testid="save-button"]').click();

    cy.wait('@saveSettings').then((interception) => {
      expect(interception.request.body).to.deep.include({
        displayName: 'New Name',
      });
      expect(interception.response.statusCode).to.eq(200);
    });

    cy.get('[data-testid="success-toast"]').should('be.visible');
  });
});
