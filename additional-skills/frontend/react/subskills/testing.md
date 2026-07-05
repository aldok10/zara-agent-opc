# Subskill: Testing

> Activate when: writing component tests, testing hooks, integration tests, or setting up test infrastructure for React.

## Core Principles

1. **Test behavior, not implementation.** Query by role/label, assert what users see.
2. **React Testing Library (RTL)** is the standard. It enforces accessible queries.
3. **MSW (Mock Service Worker)** for network mocking  -  intercepts at the network level, not by mocking fetch.
4. **Arrange-Act-Assert** structure for every test.
5. **One assertion per behavior.** Tests should have a clear, single reason to fail.
6. **Accessibility assertions built in.** If you query by role, you're testing a11y for free.

## Query Priority (RTL)

Use the most accessible query first:

| Priority | Query | When |
|----------|-------|------|
| 1 | `getByRole` | Almost always (buttons, links, headings, inputs) |
| 2 | `getByLabelText` | Form fields |
| 3 | `getByPlaceholderText` | When no label (fix the a11y first) |
| 4 | `getByText` | Static text content |
| 5 | `getByDisplayValue` | Current form field value |
| 6 | `getByAltText` | Images |
| 7 | `getByTitle` | Rare, when title attribute is meaningful |
| 8 | `getByTestId` | Last resort  -  no semantic meaning |

## Pattern 1: Component Test

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Counter } from "./counter";

describe("Counter", () => {
  it("increments count on button click", async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={0} />);

    const button = screen.getByRole("button", { name: /increment/i });
    expect(screen.getByText("Count: 0")).toBeInTheDocument();

    await user.click(button);

    expect(screen.getByText("Count: 1")).toBeInTheDocument();
  });

  it("disables button at max count", () => {
    render(<Counter initialCount={10} max={10} />);

    expect(screen.getByRole("button", { name: /increment/i })).toBeDisabled();
  });
});
```

## Pattern 2: Async Component (loading states)

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserProfile } from "./user-profile";

describe("UserProfile", () => {
  it("shows loading then user data", async () => {
    render(<UserProfile userId="123" />);

    // Loading state
    expect(screen.getByRole("status")).toHaveTextContent("Loading");

    // Wait for data
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /jane doe/i })).toBeInTheDocument();
    });
  });
});
```

## Pattern 3: Form Testing

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("submits with valid credentials", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "securepass123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "securepass123",
    });
  });

  it("shows validation error for empty email", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/email is required/i);
  });
});
```

## Pattern 4: Testing Custom Hooks

```tsx
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useCounter } from "./use-counter";

describe("useCounter", () => {
  it("increments and decrements", () => {
    const { result } = renderHook(() => useCounter(0));

    expect(result.current.count).toBe(0);

    act(() => result.current.increment());
    expect(result.current.count).toBe(1);

    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
  });
});
```

## Pattern 5: MSW for API Mocking

```tsx
// mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: "Jane Doe",
      email: "jane@example.com",
    });
  }),
  http.post("/api/todos", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "new-1", ...body }, { status: 201 });
  }),
];
```

```tsx
// test setup (vitest.setup.ts)
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers";
import { afterAll, afterEach, beforeAll } from "vitest";

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Pattern 6: Testing with Providers

```tsx
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactNode } from "react";

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function renderWithProviders(ui: ReactNode, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { renderWithProviders as render };
```

## What NOT to Test

| Skip | Why |
|------|-----|
| Internal state values | Implementation detail |
| Component method calls | Test behavior instead |
| Snapshot tests (mostly) | Brittle, low signal |
| Third-party library internals | Not your code |
| CSS class names | Implementation detail |

## Accessibility Testing

```tsx
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

it("has no accessibility violations", async () => {
  const { container } = render(<Navigation />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Delegates To

- E2E tests → Playwright/Cypress (separate concern)
- Test strategy/TDD → `testing-strategy`
- Debugging test failures → `systematic-debugging`
- Component interaction patterns → `subskills/hooks-patterns.md`
