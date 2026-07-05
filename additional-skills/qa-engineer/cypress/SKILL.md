# Subskill: Cypress

> Activate when: Cypress, cy.intercept, cy.session, component testing, data-testid, cy.wait alias
>
> Intercept over sleep. Aliases over variables. Commands queue not async/await. data-testid for resilience.

## Golden Rules

1. `cy.intercept()` for ALL external API calls -- no network leaks
2. Never `cy.wait(ms)` -- wait on aliases: `cy.wait('@apiCall')`
3. `data-testid` for selectors (not CSS classes that change with styling)
4. Commands queue: no async/await mixing with Cypress commands
5. Each test runs independently -- no ordering dependency
6. `cy.session()` for auth -- caches across specs, no repeated login
7. Custom commands for repeated flows (login, seed data)
8. `baseUrl` in config, never hardcode URLs

## Intercept Patterns

```typescript
// Stub response
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers');
cy.visit('/users');
cy.wait('@getUsers');

// Spy and assert
cy.intercept('POST', '/api/orders').as('createOrder');
cy.get('[data-testid="submit"]').click();
cy.wait('@createOrder').its('request.body').should('deep.include', {
  productId: '123'
});

// Simulate errors
cy.intercept('GET', '/api/data', { statusCode: 500, body: 'Error' });

// Conditional response
cy.intercept('GET', '/api/items*', (req) => {
  if (req.url.includes('page=2')) {
    req.reply({ fixture: 'items-page2.json' });
  } else {
    req.reply({ fixture: 'items-page1.json' });
  }
});
```

## Auth with cy.session()

```typescript
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.request('POST', '/api/auth/login', { email, password }).then(res => {
      window.localStorage.setItem('token', res.body.token);
    });
  });
});

// Usage: cached, fast
cy.login('user@test.com', 'password');
cy.visit('/dashboard');
```

## Component Testing

```typescript
import { mount } from 'cypress/react18';
import { Button } from './Button';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const onClick = cy.stub().as('click');
    mount(<Button onClick={onClick}>Submit</Button>);
    cy.get('button').click();
    cy.get('@click').should('have.been.calledOnce');
  });
});
```

## Anti-Patterns

- `cy.wait(2000)` -- use `cy.wait('@alias')` or assertion
- `async/await` with cy commands -- Cypress uses command queue
- `cy.get('.btn-class')` -- use `cy.get('[data-testid="submit"]')`
- Storing values in variables across commands -- use aliases
- Testing across origins without `cy.origin()`

## Delegates To

- **visual-testing** for cypress-image-snapshot setup
- **accessibility-testing** for cypress-axe integration
