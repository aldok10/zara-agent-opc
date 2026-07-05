# Intercept Patterns

## cy.intercept Modes

**Stub** - Replace response entirely:
```ts
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers')
```

**Spy** - Observe without modifying:
```ts
cy.intercept('POST', '/api/orders').as('createOrder')
cy.get('[data-cy=submit]').click()
cy.wait('@createOrder').its('request.body').should('include', { qty: 2 })
```

**Conditional** - Modify based on request content:
```ts
cy.intercept('GET', '/api/items*', (req) => {
  if (req.query.page === '2') {
    req.reply({ fixture: 'items-page2.json' })
  }
  // else pass through to real server
})
```

## Route Aliasing and Waiting

```ts
cy.intercept('GET', '/api/dashboard').as('dashboard')
cy.visit('/dashboard')
cy.wait('@dashboard').its('response.statusCode').should('eq', 200)

// Multiple waits for sequential calls
cy.wait(['@getUser', '@getPrefs', '@getNotifications'])
```

## Fixture-Based Responses

```ts
cy.intercept('GET', '/api/products', { fixture: 'products/list.json' })
cy.intercept('GET', '/api/products/1', {
  fixture: 'products/detail.json',
  headers: { 'x-request-id': 'test-123' },
})
```

## Dynamic Responses

```ts
cy.intercept('POST', '/api/search', (req) => {
  const { query } = req.body
  req.reply({
    statusCode: 200,
    body: { results: query === 'empty' ? [] : [{ id: 1, name: query }] },
  })
})
```

## Network Error Simulation

```ts
// Timeout
cy.intercept('GET', '/api/slow', (req) => {
  req.on('response', (res) => { res.setDelay(30000) })
})

// Abort / network failure
cy.intercept('GET', '/api/flaky', { forceNetworkError: true }).as('flaky')

// Server error
cy.intercept('POST', '/api/submit', { statusCode: 500, body: { error: 'Internal' } })

// Delayed response
cy.intercept('GET', '/api/data', (req) => {
  req.reply({ statusCode: 200, body: {}, delay: 3000 })
})
```

## Asserting Request Body and Headers

```ts
cy.wait('@createOrder').then(({ request }) => {
  expect(request.headers['authorization']).to.match(/^Bearer /)
  expect(request.body).to.deep.include({ productId: 'abc', quantity: 1 })
})
```

## Middleware Intercepts

Middleware intercepts run for every matching request without short-circuiting:
```ts
cy.intercept('/api/**', (req) => {
  req.headers['x-test-session'] = Cypress.env('sessionId')
  // No req.reply() - passes through to next handler or server
}).as('apiMiddleware')
```

Order matters: middleware handlers (no reply) execute first, then stubbing handlers respond.

## Rules

- Always alias intercepts you plan to assert on
- Use `cy.wait` before assertions on async responses
- Prefer fixture files over inline bodies for large payloads
- Use middleware intercepts for auth tokens across all API calls
- Stub external services, spy on your own backend
- Clean up state: intercepts are cleared between tests automatically
