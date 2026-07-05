---
type: fact
title: "Cypress Intercept Patterns"
---

# Cypress Intercept Patterns

## cy.intercept Basics

`cy.intercept` captures and controls HTTP requests made by the application under test.

```typescript
// Match by method + URL
cy.intercept('GET', '/api/users').as('getUsers');

// Match by URL pattern (glob)
cy.intercept('GET', '/api/users/*').as('getUser');

// Match by regex
cy.intercept('GET', /\/api\/users\/\d+/).as('getUser');

// Match by RouteMatcher object
cy.intercept({
  method: 'POST',
  url: '/api/orders',
  headers: { 'content-type': 'application/json' }
}).as('createOrder');
```

## Response Stubbing

### Static Response
```typescript
cy.intercept('GET', '/api/users', {
  statusCode: 200,
  body: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]
}).as('getUsers');
```

### Fixture File
```typescript
// cypress/fixtures/users.json contains the response
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers');

// With status code
cy.intercept('GET', '/api/users', {
  statusCode: 200,
  fixture: 'users.json'
}).as('getUsers');
```

### Dynamic Response (Function)
```typescript
cy.intercept('GET', '/api/users/*', (req) => {
  const userId = req.url.split('/').pop();
  req.reply({
    statusCode: 200,
    body: { id: userId, name: `User ${userId}` }
  });
}).as('getUser');
```

### Delayed Response
```typescript
cy.intercept('GET', '/api/users', (req) => {
  req.reply({
    statusCode: 200,
    body: [],
    delay: 2000 // 2 second delay
  });
}).as('slowResponse');
```

### Error Responses
```typescript
// Network error
cy.intercept('GET', '/api/users', { forceNetworkError: true }).as('networkError');

// HTTP error
cy.intercept('GET', '/api/users', {
  statusCode: 500,
  body: { error: 'Internal server error' }
}).as('serverError');

// Timeout
cy.intercept('GET', '/api/users', (req) => {
  req.destroy(); // Connection reset
}).as('timeout');
```

## Request Assertion

```typescript
cy.intercept('POST', '/api/orders').as('createOrder');

// Trigger the request
cy.get('[data-testid="submit-order"]').click();

// Assert on the request
cy.wait('@createOrder').then((interception) => {
  expect(interception.request.body).to.deep.include({
    items: [{ sku: 'ABC', quantity: 2 }]
  });
  expect(interception.request.headers).to.have.property('authorization');
  expect(interception.response.statusCode).to.equal(201);
});
```

## Request Modification

```typescript
// Add headers to outgoing requests
cy.intercept('GET', '/api/**', (req) => {
  req.headers['x-test-id'] = 'cypress-run-123';
  req.continue(); // Forward modified request to server
}).as('allApi');

// Modify request body
cy.intercept('POST', '/api/orders', (req) => {
  req.body.metadata = { source: 'test' };
  req.continue();
});
```

## Response Modification (Spy + Modify)

```typescript
// Let request go through but modify response
cy.intercept('GET', '/api/users', (req) => {
  req.continue((res) => {
    // Modify the real response
    res.body.push({ id: 999, name: 'Injected User' });
    res.send();
  });
}).as('modifiedUsers');
```

## Sequential Responses

```typescript
// First call returns loading, second returns data
let callCount = 0;

cy.intercept('GET', '/api/status', (req) => {
  callCount++;
  if (callCount === 1) {
    req.reply({ status: 'processing' });
  } else {
    req.reply({ status: 'complete', result: { id: 123 } });
  }
}).as('pollStatus');
```

## Waiting Patterns

```typescript
// Wait for single request
cy.wait('@getUsers');

// Wait for multiple requests
cy.wait(['@getUsers', '@getPermissions']);

// Wait for N occurrences
cy.wait('@pollStatus');
cy.wait('@pollStatus'); // waits for 2nd call

// Wait with timeout
cy.wait('@slowRequest', { timeout: 10000 });

// Assert after wait
cy.wait('@createOrder').its('response.statusCode').should('eq', 201);
```

## Common Test Patterns

### Loading State
```typescript
it('shows loading spinner while fetching', () => {
  cy.intercept('GET', '/api/users', {
    delay: 1000,
    body: []
  }).as('getUsers');

  cy.visit('/users');
  cy.get('[data-testid="loading"]').should('be.visible');
  cy.wait('@getUsers');
  cy.get('[data-testid="loading"]').should('not.exist');
});
```

### Error Handling
```typescript
it('shows error message on API failure', () => {
  cy.intercept('GET', '/api/users', {
    statusCode: 500,
    body: { message: 'Server error' }
  }).as('getUsers');

  cy.visit('/users');
  cy.wait('@getUsers');
  cy.get('[data-testid="error-message"]').should('contain', 'Something went wrong');
  cy.get('[data-testid="retry-button"]').should('be.visible');
});
```

### Pagination
```typescript
it('loads next page on scroll', () => {
  cy.intercept('GET', '/api/users?page=1', { fixture: 'users-page1.json' }).as('page1');
  cy.intercept('GET', '/api/users?page=2', { fixture: 'users-page2.json' }).as('page2');

  cy.visit('/users');
  cy.wait('@page1');
  cy.get('[data-testid="user-item"]').should('have.length', 20);

  cy.get('[data-testid="user-list"]').scrollTo('bottom');
  cy.wait('@page2');
  cy.get('[data-testid="user-item"]').should('have.length', 40);
});
```

### Optimistic Updates
```typescript
it('shows optimistic update then confirms', () => {
  cy.intercept('PATCH', '/api/todos/1', {
    delay: 500,
    statusCode: 200,
    body: { id: 1, completed: true }
  }).as('updateTodo');

  cy.visit('/todos');
  cy.get('[data-testid="todo-1"]').find('input[type="checkbox"]').click();

  // Optimistic: immediately shows checked
  cy.get('[data-testid="todo-1"]').should('have.class', 'completed');

  // Confirm server acknowledged
  cy.wait('@updateTodo').its('response.statusCode').should('eq', 200);
});
```

## Intercept Scope and Ordering

- Later intercepts override earlier ones for the same route
- Intercepts persist for the entire test (not just one request) unless overridden
- Use `cy.intercept().as()` consistently for debugging in Cypress runner
- Intercepts set in `beforeEach` apply to all tests in the block
