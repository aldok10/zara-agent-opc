---
type: subskill
title: "Plugins and Custom Commands"
---

# Plugins and Custom Commands

## Custom Commands

```ts
// cypress/support/commands.ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.request('POST', '/api/auth/login', { email, password })
      .its('body.token')
      .then((token) => localStorage.setItem('token', token))
  })
})

// TypeScript declaration
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
    }
  }
}
```

Best practices:
- Prefix domain-specific commands (e.g., `cy.appLogin`, `cy.appSeedDB`)
- Return chainable values for composability
- Avoid commands that wrap single Cypress calls (no value added)

## cy.task() for Server-Side Operations

```ts
// cypress.config.ts
setupNodeEvents(on) {
  on('task', {
    seedDatabase(data) { return db.seed(data) },
    clearMailbox(email) { return mailService.clear(email) },
    readFile(path) { return fs.readFileSync(path, 'utf8') },
  })
}

// In test
cy.task('seedDatabase', { users: [{ email: 'test@co.com' }] })
cy.task('clearMailbox', 'test@co.com')
```

Tasks run in Node.js - use for DB operations, file I/O, external services.

## Third-Party Plugins

**cypress-axe** - Accessibility testing:
```ts
cy.injectAxe()
cy.checkA11y(null, { runOnly: ['wcag2a', 'wcag2aa'] })
```

**cypress-real-events** - Native browser events:
```ts
cy.get('[data-cy=tooltip-trigger]').realHover()
cy.get('[data-cy=slider]').realSwipe('toRight')
```

**cypress-image-snapshot** - Visual regression:
```ts
cy.get('[data-cy=chart]').matchImageSnapshot('dashboard-chart')
```

## Preprocessors

```ts
// cypress.config.ts with esbuild
import createBundler from '@bahmutov/cypress-esbuild-preprocessor'

setupNodeEvents(on) {
  on('file:preprocessor', createBundler({ tsconfig: './tsconfig.json' }))
}
```

## TypeScript Support

- `tsconfig.json` in `cypress/` extending root config
- Set `"types": ["cypress"]` in tsconfig
- Command types via `declare global` in support file
- Task return types defined in config file

## Plugin Lifecycle

Plugins execute in this order:
1. `setupNodeEvents` runs at Cypress boot
2. `file:preprocessor` on each spec compilation
3. `before:browser:launch` before browser opens
4. `task` handlers on each `cy.task()` call
5. `after:spec` / `after:run` for cleanup and reporting

## Rules

- Keep commands focused: one action per command
- Always type custom commands for IDE support
- Use `cy.task` for anything requiring Node.js (never `cy.exec` for DB ops)
- Pin plugin versions in package.json
