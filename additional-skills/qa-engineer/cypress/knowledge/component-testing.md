---
type: fact
title: "Cypress Component Testing Patterns"
---

# Cypress Component Testing Patterns

## Setup

Cypress component testing runs components in isolation within a real browser, without starting a full application server.

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: {
      framework: 'react', // or 'vue', 'angular', 'svelte'
      bundler: 'vite',    // or 'webpack'
    },
    specPattern: 'src/**/*.cy.{ts,tsx}',
  },
});
```

## Basic Component Test

```typescript
// Button.cy.tsx
import Button from './Button';

describe('Button', () => {
  it('renders with text', () => {
    cy.mount(<Button label="Click me" />);
    cy.get('button').should('contain.text', 'Click me');
  });

  it('calls onClick handler', () => {
    const onClick = cy.stub().as('clickHandler');
    cy.mount(<Button label="Click" onClick={onClick} />);
    cy.get('button').click();
    cy.get('@clickHandler').should('have.been.calledOnce');
  });

  it('shows loading state', () => {
    cy.mount(<Button label="Submit" loading={true} />);
    cy.get('button').should('be.disabled');
    cy.get('[data-testid="spinner"]').should('be.visible');
  });
});
```

## Testing with Context Providers

```typescript
// Wrap components that need providers
const mount = (component: React.ReactElement) => {
  return cy.mount(
    <ThemeProvider theme={lightTheme}>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </ThemeProvider>
  );
};

describe('UserProfile', () => {
  it('displays user info', () => {
    mount(<UserProfile userId="123" />);
    cy.get('[data-testid="username"]').should('be.visible');
  });
});
```

## Testing Forms

```typescript
// LoginForm.cy.tsx
describe('LoginForm', () => {
  it('validates required fields', () => {
    const onSubmit = cy.stub().as('submit');
    cy.mount(<LoginForm onSubmit={onSubmit} />);

    cy.get('button[type="submit"]').click();
    cy.get('[data-testid="email-error"]').should('contain', 'required');
    cy.get('@submit').should('not.have.been.called');
  });

  it('submits valid form data', () => {
    const onSubmit = cy.stub().as('submit');
    cy.mount(<LoginForm onSubmit={onSubmit} />);

    cy.get('input[name="email"]').type('user@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.get('@submit').should('have.been.calledWith', {
      email: 'user@example.com',
      password: 'password123',
    });
  });

  it('shows server error', () => {
    cy.mount(<LoginForm onSubmit={() => Promise.reject(new Error('Invalid credentials'))} />);

    cy.get('input[name="email"]').type('user@example.com');
    cy.get('input[name="password"]').type('wrong');
    cy.get('button[type="submit"]').click();

    cy.get('[data-testid="form-error"]').should('contain', 'Invalid credentials');
  });
});
```

## Testing Hooks with Wrapper Components

```typescript
// Test custom hooks by creating a test harness
function TestHarness() {
  const { data, loading, error } = useUserData('123');
  if (loading) return <div data-testid="loading">Loading</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  return <div data-testid="data">{data.name}</div>;
}

describe('useUserData', () => {
  it('fetches and displays data', () => {
    cy.intercept('GET', '/api/users/123', { name: 'John' });
    cy.mount(<TestHarness />);
    cy.get('[data-testid="loading"]').should('be.visible');
    cy.get('[data-testid="data"]').should('contain', 'John');
  });
});
```

## Accessibility in Component Tests

```typescript
// Combine with cypress-axe
import 'cypress-axe';

describe('Modal', () => {
  it('is accessible when open', () => {
    cy.mount(<Modal isOpen={true} title="Confirm" />);
    cy.injectAxe();
    cy.checkA11y('[role="dialog"]');
  });

  it('traps focus inside modal', () => {
    cy.mount(<Modal isOpen={true} title="Confirm" />);
    cy.get('[role="dialog"]').should('have.focus');
    cy.realPress('Tab');
    cy.focused().should('be.within', '[role="dialog"]');
  });
});
```

## Visual Testing in Components

```typescript
// Snapshot different states
describe('Avatar', () => {
  const sizes = ['sm', 'md', 'lg'] as const;
  
  sizes.forEach(size => {
    it(`renders ${size} correctly`, () => {
      cy.mount(<Avatar src="/test.jpg" size={size} />);
      cy.get('[data-testid="avatar"]').matchImageSnapshot(`avatar-${size}`);
    });
  });

  it('shows fallback for broken image', () => {
    cy.mount(<Avatar src="/broken.jpg" fallback="JD" />);
    cy.get('[data-testid="avatar-fallback"]').should('contain', 'JD');
  });
});
```

## Style/Theme Testing

```typescript
describe('Button themes', () => {
  it('applies primary styles', () => {
    cy.mount(<Button variant="primary" label="Primary" />);
    cy.get('button').should('have.css', 'background-color', 'rgb(37, 99, 235)');
  });

  it('applies dark mode styles', () => {
    cy.mount(
      <ThemeProvider theme="dark">
        <Button variant="primary" label="Dark" />
      </ThemeProvider>
    );
    cy.get('button').should('have.css', 'color', 'rgb(255, 255, 255)');
  });
});
```

## Best Practices

1. **Test behavior, not implementation**: assert on visible output, not internal state
2. **Use data-testid sparingly**: prefer role-based selectors (getByRole equivalent)
3. **Isolate**: each test mounts fresh, no shared state between tests
4. **Stub external calls**: use cy.intercept for any API calls components make
5. **Test states**: loading, error, empty, full, disabled, focused
6. **Keep tests fast**: component tests should run in <100ms each
