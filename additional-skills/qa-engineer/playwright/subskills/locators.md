# Locators

## Priority Hierarchy (highest to lowest)

1. `getByRole('button', { name: 'Submit' })` - accessible role + name
2. `getByLabel('Email')` - form inputs with labels
3. `getByPlaceholder('Enter email')` - inputs without visible labels
4. `getByText('Welcome back')` - visible text content
5. `getByTestId('checkout-btn')` - data-testid attributes
6. `locator('[data-qa="item"]')` - custom data attributes
7. `locator('css=.class')` - CSS selectors (last resort)

Never use XPath, auto-generated selectors, or positional CSS (`:nth-child`).

## getByRole ARIA Mapping

| HTML Element | Role |
|---|---|
| `<button>`, `<input type="submit">` | `button` |
| `<a href>` | `link` |
| `<input type="text">` | `textbox` |
| `<input type="checkbox">` | `checkbox` |
| `<select>` | `combobox` |
| `<h1>`-`<h6>` | `heading` (use `{ level: 2 }`) |
| `<table>` | `table` |
| `<tr>` | `row` |
| `<li>` in `<ul>/<ol>` | `listitem` |
| `<dialog>` | `dialog` |
| `<nav>` | `navigation` |

## Chaining and Filtering

```ts
// Filter by text content
page.getByRole('listitem').filter({ hasText: 'Product A' });

// Filter by nested locator
page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Buy' }) });

// Positional
page.getByRole('listitem').nth(2);   // zero-indexed
page.getByRole('listitem').first();
page.getByRole('listitem').last();

// Chained (scoped within parent)
page.getByRole('dialog').getByRole('button', { name: 'Confirm' });
```

## Frame and Shadow DOM

```ts
// iframe
const frame = page.frameLocator('#payment-frame');
await frame.getByRole('textbox', { name: 'Card number' }).fill('4242...');

// nested iframes
page.frameLocator('#outer').frameLocator('#inner').getByRole('button');

// shadow DOM - locators pierce open shadow roots automatically
page.getByRole('button', { name: 'Shadow Button' }); // just works
page.locator('custom-element').getByText('Content');  // also works
```

## Dynamic Locator Patterns

```ts
// Regex text matching
page.getByText(/total: \$\d+\.\d{2}/i);
page.getByRole('heading', { name: /welcome/i });

// Data attribute with dynamic values
page.locator(`[data-product-id="${productId}"]`);

// Combining has and hasText
page.locator('article').filter({ hasText: 'Draft' }).filter({ has: page.getByRole('button', { name: 'Edit' }) });
```

## Anti-Patterns

```ts
// BAD: brittle CSS path
page.locator('div.container > div:nth-child(3) > span.label');

// BAD: XPath
page.locator('//div[@class="form"]/input[2]');

// BAD: text that changes with i18n
page.locator('text="Click here to submit your form"');

// BAD: auto-generated IDs
page.locator('#ember-432');
page.locator('[id^="react-select"]');

// BAD: relying on DOM order without semantic meaning
page.locator('input').nth(4);

// GOOD: equivalent accessible locator
page.getByRole('button', { name: 'Submit' });
```
