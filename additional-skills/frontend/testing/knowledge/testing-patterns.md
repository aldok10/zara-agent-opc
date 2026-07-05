---
type: knowledge
title: "Frontend Testing Patterns"
---

# 15 Frontend Testing Patterns

## 1. Arrange-Act-Assert (AAA)

```ts
test('adds item to cart', async () => {
  // Arrange
  render(<Cart />);
  // Act
  await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
  // Assert
  expect(screen.getByText('1 item')).toBeInTheDocument();
});
```

## 2. Page Object Model

Encapsulate page interactions behind a class. Reduces duplication, improves maintainability.

```ts
class CheckoutPage {
  constructor(private page: Page) {}
  get submitBtn() { return this.page.getByRole('button', { name: 'Pay' }); }
  async fillCard(number: string) { await this.page.getByLabel('Card').fill(number); }
}
```

## 3. Test Fixtures

Shared setup via Playwright fixtures or beforeEach. Prefer fixtures — composable and type-safe.

```ts
const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: '.auth/user.json' });
    await use(await ctx.newPage());
    await ctx.close();
  },
});
```

## 4. Factory Functions

Generate test data with sensible defaults and overrides.

```ts
function createUser(overrides: Partial<User> = {}): User {
  return { id: crypto.randomUUID(), name: 'Test User', email: 'test@test.com', ...overrides };
}
```

## 5. Builder Pattern

Chain methods for complex test data.

```ts
const order = OrderBuilder.create().withItems(3).withDiscount(10).shipped().build();
```

## 6. Custom Render

Wrap providers (router, theme, query client) in a custom render function.

```ts
function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={testClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
    ...options,
  });
}
```

## 7. MSW Handler Composition

Compose handlers for specific test scenarios.

```ts
const happyPath = [...userHandlers, ...orderHandlers];
const errorPath = [...userHandlers, ...orderErrorHandlers];
```

## 8. Assertion Helpers

Domain-specific assertions improve readability.

```ts
function expectToastMessage(message: string) {
  expect(screen.getByRole('alert')).toHaveTextContent(message);
}
```

## 9. Parameterized Tests (test.each)

```ts
test.each([
  { input: '', expected: 'Required' },
  { input: 'ab', expected: 'Min 3 chars' },
  { input: 'valid-input', expected: undefined },
])('validates "$input" → $expected', ({ input, expected }) => {
  expect(validate(input)).toBe(expected);
});
```

## 10. Accessibility Assertion

```ts
import { axe } from 'vitest-axe';

test('form is accessible', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 11. Error Boundary Testing

```ts
test('shows fallback on error', () => {
  const Bomb = () => { throw new Error('boom'); };
  render(
    <ErrorBoundary fallback={<p>Something went wrong</p>}>
      <Bomb />
    </ErrorBoundary>
  );
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

## 12. Async State Testing

Wait for loading states to resolve before asserting.

```ts
test('loads and displays users', async () => {
  render(<UserList />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});
```

## 13. Event Simulation with userEvent

Always prefer `userEvent` over `fireEvent` — it simulates real user behavior (focus, type, tab).

```ts
const user = userEvent.setup();
await user.type(screen.getByRole('textbox'), 'hello');
await user.tab();
```

## 14. Portal/Modal Testing

Ensure modals render in correct portal and trap focus.

```ts
test('modal traps focus', async () => {
  render(<Modal open>Content</Modal>);
  const modal = screen.getByRole('dialog');
  expect(modal).toBeInTheDocument();
  await userEvent.tab();
  expect(document.activeElement).toBeWithin(modal);
});
```

## 15. Network State Testing

Test loading, success, and error states for async operations.

```ts
test('handles network failure gracefully', async () => {
  server.use(http.get('/api/data', () => HttpResponse.error()));
  render(<DataView />);
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load');
  });
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
});
```
