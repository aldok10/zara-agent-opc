---
type: fact
title: "Frontend Testing Patterns"
---

# Frontend Testing Patterns

## Component Unit Tests (Vitest + Testing Library)

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('shows validation error for empty email', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/email is required/i);
  });

  it('calls onSubmit with form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com', password: 'secret123' });
  });
});
```

### Query Priority
1. `getByRole`  -  button, textbox, heading (preferred)
2. `getByLabelText`  -  form fields
3. `getByText`  -  non-interactive content
4. `getByTestId`  -  last resort only

## Integration Tests with MSW

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Jane Doe' });
  }),
];

// vitest.setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './src/mocks/handlers';
export const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```tsx
// Override per test for error scenarios
it('handles server error', async () => {
  server.use(http.get('/api/users/:id', () => HttpResponse.json(null, { status: 500 })));
  render(<UserProfile userId="123" />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
});
```

## Visual Regression (Playwright)

```ts
test('button states match snapshots', async ({ page }) => {
  await page.goto('/components/button');
  await expect(page.getByRole('button', { name: 'Submit' })).toHaveScreenshot('button-default.png');
  await page.getByRole('button', { name: 'Submit' }).hover();
  await expect(page.getByRole('button', { name: 'Submit' })).toHaveScreenshot('button-hover.png');
});
```

Stability tips:
- Fixed viewport (`page.setViewportSize({ width: 1280, height: 720 })`)
- Disable animations (`* { animation: none !important; }`)
- `maxDiffPixelRatio: 0.01` for anti-aliasing tolerance
- Run in Docker for consistent font rendering

## Accessibility Testing

```tsx
// Unit test with jest-axe
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('form has no a11y violations', async () => {
  const { container } = render(<ContactForm />);
  expect(await axe(container)).toHaveNoViolations();
});
```

```ts
// E2E with @axe-core/playwright
import AxeBuilder from '@axe-core/playwright';

test('page passes axe audit', async ({ page }) => {
  await page.goto('/dashboard');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### a11y Checklist
- All interactive elements keyboard-reachable
- ARIA labels on icon-only buttons
- Color contrast WCAG AA (4.5:1 text, 3:1 large)
- Form errors linked via `aria-describedby`
- Live regions for dynamic announcements

## Test Organization

```
src/components/Button/Button.test.tsx   ← unit
src/features/auth/LoginForm.test.tsx    ← integration (MSW)
e2e/login.spec.ts                       ← Playwright e2e
src/mocks/handlers.ts                   ← shared mock definitions
```
