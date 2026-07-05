---
type: fact
title: "Playwright Locators - Built-in, User-Facing, Resilience"
---

# Playwright Locator Strategies

Locators are the primary way to find elements in Playwright. They are strict, auto-waiting, and retry-able by default.

## Locator Priority (most to least preferred)

| Priority | Method | When to use |
|----------|--------|-------------|
| 1 | `getByRole()` | Accessible elements (buttons, links, headings, inputs) |
| 2 | `getByLabel()` | Form inputs with associated labels |
| 3 | `getByPlaceholder()` | Inputs with placeholder text |
| 4 | `getByText()` | Non-interactive elements by visible text |
| 5 | `getByTestId()` | When no accessible selector works |
| 6 | `locator('css')` | Complex structural queries, last resort |
| 7 | `locator('xpath=...')` | Legacy/dynamic structures only |

### Why this order

- Role-based selectors mirror how users and assistive tech interact with the page
- They survive refactors (class/ID changes don't break tests)
- `data-testid` is stable but invisible to users — use when semantic selectors can't distinguish elements

## Auto-Wait Mechanism

Every locator action automatically waits for the element to be:

1. **Attached** to the DOM
2. **Visible** (not `display:none`, not zero-size)
3. **Stable** (not animating)
4. **Enabled** (not disabled)
5. **Receives events** (not obscured by another element)

Default timeout: 30s (configurable via `actionTimeout` in config or per-action).

No need for explicit `waitForSelector` in most cases — the locator handles it.

## Strict Mode

Locators are **strict by default**: if a locator matches multiple elements, the action throws an error.

```typescript
// Throws if multiple buttons match
await page.getByRole('button', { name: 'Submit' }).click();

// Use .first(), .last(), .nth() to disambiguate
await page.getByRole('listitem').first().click();
await page.getByRole('listitem').nth(2).click();
```

This prevents flaky tests caused by accidentally interacting with the wrong element.

## Filtering and Chaining

### Filter by text or child locator

```typescript
// Filter list items containing specific text
await page.getByRole('listitem').filter({ hasText: 'Product A' }).click();

// Filter by child element
await page.getByRole('listitem')
  .filter({ has: page.getByRole('button', { name: 'Buy' }) })
  .click();

// Negative filter
await page.getByRole('listitem')
  .filter({ hasNot: page.getByText('Out of stock') })
  .first()
  .click();
```

### Chaining (scoping)

```typescript
// Scope locator within a parent
const dialog = page.getByRole('dialog');
await dialog.getByRole('button', { name: 'Confirm' }).click();

// Chain narrows scope — each step produces a new locator
const row = page.getByRole('row').filter({ hasText: 'Alice' });
await row.getByRole('button', { name: 'Edit' }).click();
```

## Frame Locators

```typescript
// Locate within an iframe by selector
const frame = page.frameLocator('#payment-iframe');
await frame.getByRole('textbox', { name: 'Card number' }).fill('4242...');

// Nested frames
const nested = page.frameLocator('#outer').frameLocator('#inner');
await nested.getByText('Submit').click();
```

Frame locators support the same chaining and filtering as regular locators.

## Shadow DOM

Playwright pierces open shadow DOM by default:

```typescript
// This works without special handling for open shadow roots
await page.getByRole('button', { name: 'Shadow Button' }).click();

// CSS piercing (explicit)
await page.locator('my-component >> button.inner').click();
```

Closed shadow DOM cannot be pierced — requires `evaluate()` workaround if needed.

## Best Practices for Stable Selectors

### Do

- Prefer user-facing attributes: role, label, text, placeholder
- Use `data-testid` as fallback — add them intentionally in source
- Scope locators to reduce ambiguity (`dialog.getByRole(...)`)
- Use `filter()` over index-based selection when possible
- Keep locators in a dedicated helper/fixture for reuse

### Avoid

- CSS classes tied to styling (break on redesign)
- Auto-generated IDs or deeply nested CSS paths
- XPath with positional predicates (`//div[3]/span[1]`)
- `nth()` without a clear structural reason
- `page.locator('text=...')` — prefer `getByText()` or `getByRole()`

## Common Patterns

### Waiting for navigation after click

```typescript
// Locator actions auto-wait, but for navigation:
await page.getByRole('link', { name: 'Dashboard' }).click();
await page.waitForURL('**/dashboard');
```

### Asserting locator state

```typescript
// Visible
await expect(page.getByRole('alert')).toBeVisible();

// Hidden
await expect(page.getByRole('dialog')).toBeHidden();

// Text content
await expect(page.getByRole('heading')).toHaveText('Welcome');

// Count
await expect(page.getByRole('listitem')).toHaveCount(5);
```

### Dynamic content (polling assertions)

```typescript
// expect auto-retries until timeout
await expect(page.getByTestId('status')).toHaveText('Complete');
```

## Debugging Locators

- `npx playwright codegen` — generate locators interactively
- `locator.highlight()` — visually highlight matched element in headed mode
- `page.pause()` — open inspector mid-test
- Trace viewer shows locator matches and timing for failed actions
