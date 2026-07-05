---
type: subskill
title: "Component Testing"
---

# Component Testing

## Setup

Cypress CT requires a dev server config in `cypress.config.ts`:
```ts
import { defineConfig } from 'cypress'

export default defineConfig({
  component: {
    devServer: {
      framework: 'react', // or 'vue', 'angular', 'next', 'nuxt'
      bundler: 'vite',    // or 'webpack'
    },
    specPattern: 'src/**/*.cy.{ts,tsx}',
  },
})
```

## Mount API

```tsx
// React
import { mount } from 'cypress/react18'
mount(<Button label="Submit" onClick={cy.stub().as('click')} />)

// Vue
import { mount } from 'cypress/vue'
mount(MyComponent, { props: { title: 'Hello' } })
```

## Testing Props and Events

```tsx
it('calls onClick when clicked', () => {
  const onClick = cy.stub().as('clickHandler')
  mount(<Button onClick={onClick}>Save</Button>)
  cy.get('button').click()
  cy.get('@clickHandler').should('have.been.calledOnce')
})

it('renders disabled state', () => {
  mount(<Button disabled>Save</Button>)
  cy.get('button').should('be.disabled')
})
```

## Slots (Vue)

```ts
mount(Card, {
  slots: {
    default: '<p>Body content</p>',
    header: '<h2>Title</h2>',
  },
})
cy.contains('Body content').should('be.visible')
```

## Styling and Responsive Testing

```tsx
// Import global styles in component test support file
// cypress/support/component.ts
import '../../src/index.css'

// Viewport testing
cy.viewport(375, 667)
cy.get('[data-cy=nav]').should('not.be.visible')
cy.viewport(1280, 720)
cy.get('[data-cy=nav]').should('be.visible')
```

## CT vs E2E Decision

| Use CT when | Use E2E when |
|---|---|
| Testing component in isolation | Testing user journeys across pages |
| Fast feedback on UI logic | Verifying API integration |
| Props/events/state permutations | Auth flows, navigation, persistence |
| Visual regression of components | Multi-step workflows |

## Storybook Integration

```tsx
// Import stories directly in CT specs
import { Primary, Loading } from './Button.stories'

it('renders primary story', () => {
  mount(<Primary {...Primary.args} />)
  cy.get('button').should('have.class', 'btn-primary')
})
```

## Rules

- CT specs live next to components (`Button.cy.tsx` beside `Button.tsx`)
- Use CT for isolated component logic; E2E for integration
- Import global CSS in `cypress/support/component.ts`
- Stub external dependencies (API calls, stores) in CT
