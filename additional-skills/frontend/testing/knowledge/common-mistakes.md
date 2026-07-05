---
type: knowledge
title: "Frontend Testing Common Mistakes"
---

# 12 Frontend Testing Mistakes

## 1. Testing Implementation Details

**Wrong:** Asserting on internal state, hook calls, or component instances.
**Fix:** Assert on what the user sees — rendered output, accessible elements, visible text.

```ts
// Bad: testing useState value
expect(result.current.count).toBe(1);

// Good: testing what user sees
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

## 2. Using Wrong Query Priority

**Wrong:** Reaching for `getByTestId` first or using `container.querySelector`.
**Fix:** Follow priority: getByRole > getByLabelText > getByText > getByTestId.

```ts
// Bad
screen.getByTestId('submit-btn');

// Good
screen.getByRole('button', { name: 'Submit' });
```

## 3. Not Waiting for Async Updates

**Wrong:** Asserting immediately after triggering async action.
**Fix:** Use `waitFor`, `findBy*`, or Playwright's auto-waiting.

```ts
// Bad: assertion runs before state update
fireEvent.click(button);
expect(screen.getByText('Done')).toBeInTheDocument();

// Good
await userEvent.click(button);
expect(await screen.findByText('Done')).toBeInTheDocument();
```

## 4. Using fireEvent Instead of userEvent

**Wrong:** `fireEvent.change(input, { target: { value: 'x' } })` — skips focus, keyboard events.
**Fix:** `await userEvent.type(input, 'x')` — simulates real user behavior.

## 5. Hardcoded Timeouts

**Wrong:** `await new Promise(r => setTimeout(r, 2000))` or `page.waitForTimeout(3000)`.
**Fix:** Wait for specific conditions: element visibility, network idle, specific text.

```ts
// Bad
await page.waitForTimeout(3000);

// Good
await page.waitForSelector('[data-loaded="true"]');
await expect(page.getByText('Dashboard')).toBeVisible();
```

## 6. Testing Third-Party Library Internals

**Wrong:** Testing that React Query caches correctly or that Zustand dispatches.
**Fix:** Test the behavior those libraries enable. Wrap third-party concerns in adapters.

## 7. Snapshot Overuse

**Wrong:** Snapshot of entire component tree — breaks on any change, nobody reviews diffs.
**Fix:** Use inline snapshots for small stable values. Use visual regression for UI appearance.

## 8. Not Isolating Tests

**Wrong:** Tests depend on execution order or shared mutable state.
**Fix:** Reset handlers (`server.resetHandlers()`), cleanup DOM (`cleanup()`), use fresh data per test.

## 9. Mocking Too Much

**Wrong:** Mocking the module you're testing, or mocking 5 layers deep.
**Fix:** Mock at the network boundary (MSW). Let real code run between component and network.

## 10. Missing Error Path Tests

**Wrong:** Only testing happy path — 500s, network failures, validation errors untested.
**Fix:** Every feature needs at least: happy path, error state, empty state, loading state tests.

## 11. Brittle Selectors in E2E

**Wrong:** `page.locator('.css-1a2b3c')` or `page.locator('div > div:nth-child(3) > span')`.
**Fix:** Use accessible locators or stable `data-testid` attributes.

## 12. Not Testing Accessibility

**Wrong:** Zero accessibility assertions — WCAG violations ship to production.
**Fix:** Add axe-core checks to component tests. Test keyboard navigation in e2e.

```ts
// Component level
const results = await axe(container);
expect(results).toHaveNoViolations();

// E2E level
await page.keyboard.press('Tab');
await expect(page.getByRole('button', { name: 'Submit' })).toBeFocused();
```
