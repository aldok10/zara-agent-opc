---
type: fact
title: "TypeScript Testing"
---
# TypeScript Testing

## Vitest

Configuration:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
    include: ["src/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
  },
});
```

Mocking:
```typescript
import { vi, describe, it, expect } from "vitest";

vi.mock("./database", () => ({
  query: vi.fn().mockResolvedValue([{ id: 1 }]),
}));

vi.spyOn(service, "notify").mockImplementation(async () => {});

vi.useFakeTimers();
await vi.advanceTimersByTimeAsync(1000);
vi.useRealTimers();
```

Workspace (monorepo):
```typescript
import { defineWorkspace } from "vitest/config";
export default defineWorkspace(["packages/*", "apps/*"]);
```

- In-source testing with `if (import.meta.vitest)`
- Snapshot testing: `expect(result).toMatchSnapshot()`
- Concurrent tests: `it.concurrent("fast test", ...)`
- Type testing integration with `expectTypeOf`

## Type Testing

expect-type (works with Vitest):
```typescript
import { expectTypeOf } from "vitest";

expectTypeOf<string>().toMatchTypeOf<string | number>();
expectTypeOf(fn).parameter(0).toBeString();
expectTypeOf(fn).returns.toEqualTypeOf<Promise<User>>();
```

@ts-expect-error for negative tests:
```typescript
// @ts-expect-error -- should not accept number
const result: string = myFunction(42);
```

tsd (standalone type testing):
```typescript
import { expectType, expectError } from "tsd";
expectType<string>(fn("input"));
expectError(fn(123));
```

Testing generic types:
```typescript
type Cases = [
  Expect<Equal<MyType<string>, string>>,
  Expect<Equal<MyType<number>, never>>,
];
```

## MSW (Mock Service Worker)

Request handlers:
```typescript
import { http, HttpResponse } from "msw";

const handlers = [
  http.get("/api/users", () => {
    return HttpResponse.json([{ id: 1, name: "Alice" }]);
  }),
  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body, { status: 201 });
  }),
];
```

Server setup (Node/test environment):
```typescript
import { setupServer } from "msw/node";

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("handles error", () => {
  server.use(
    http.get("/api/users", () => HttpResponse.json(null, { status: 500 })),
  );
});
```

- Network-level interception (no fetch patching)
- Works with any HTTP client (fetch, axios, got)
- Browser setup with service worker for integration tests
- `passthrough()` for requests that should hit real servers

## Playwright

E2E testing:
```typescript
import { test, expect } from "@playwright/test";

test("login flow", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@test.com");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Welcome")).toBeVisible();
});
```

Component testing:
```typescript
import { test, expect } from "@playwright/experimental-ct-react";

test("button renders", async ({ mount }) => {
  const component = await mount(<Button label="Click" />);
  await expect(component).toContainText("Click");
});
```

Trace viewer for debugging:
```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

- Auto-wait for elements (no explicit waits needed)
- Network interception: `page.route("**/api/**", handler)`
- Multiple browsers: Chromium, Firefox, WebKit
- Parallel execution with worker isolation
- Visual regression with `toHaveScreenshot()`

## Test Patterns for Generics

Testing type inference:
```typescript
it("infers return type from input", () => {
  const result = transform({ name: "test", age: 25 });
  expectTypeOf(result).toEqualTypeOf<{ name: string; age: number }>();
});
```

Testing constraints:
```typescript
it("rejects invalid input at type level", () => {
  // @ts-expect-error -- string is not assignable to number[]
  sortItems("not an array");
});
```

Factory patterns for generic test data:
```typescript
function createMock<T extends Record<string, unknown>>(
  overrides: Partial<T> = {},
): T {
  return { ...defaults, ...overrides } as T;
}
```
