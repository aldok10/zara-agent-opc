# Component Testing

## Setup

```ts
// playwright-ct.config.ts
import { defineConfig, devices } from '@playwright/experimental-ct-react';

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.spec.tsx',
  use: {
    ctPort: 3100,
    ctTemplateDir: './playwright/index.html', // custom HTML wrapper if needed
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
```

Install: `npm init playwright@latest -- --ct`

## Mount Patterns

```ts
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

// Props
test('renders with label', async ({ mount }) => {
  const component = await mount(<Button label="Save" variant="primary" />);
  await expect(component.getByRole('button', { name: 'Save' })).toBeVisible();
});

// Events
test('fires onClick', async ({ mount }) => {
  let clicked = false;
  const component = await mount(<Button label="Go" onClick={() => { clicked = true; }} />);
  await component.getByRole('button').click();
  expect(clicked).toBe(true);
});

// Slots / children
test('renders children', async ({ mount }) => {
  const component = await mount(<Button><span data-testid="icon" />Save</Button>);
  await expect(component.getByTestId('icon')).toBeVisible();
});

// Update props after mount
test('reacts to prop changes', async ({ mount }) => {
  const component = await mount(<Button label="Before" />);
  await component.update(<Button label="After" />);
  await expect(component.getByRole('button', { name: 'After' })).toBeVisible();
});
```

## Isolation: CT vs E2E

| Aspect | Component Test | E2E |
|---|---|---|
| Scope | Single component | Full app flow |
| Network | Mocked/stubbed | Real or intercepted |
| State | Props passed directly | Navigate + interact |
| Speed | Fast (no server) | Slower (full stack) |
| Auth | Not needed | Required |

CT runs components in a real browser (not jsdom) but without the full app context.

## Real Browser Advantages Over jsdom

- Accurate CSS rendering (visibility, overflow, computed styles)
- Real event propagation (bubbling, capturing)
- Actual viewport/responsive behavior
- Web API support (IntersectionObserver, ResizeObserver, Canvas)
- Shadow DOM works correctly
- Accurate focus/tab management

## Testing Component States

```ts
test('loading state shows spinner', async ({ mount }) => {
  const component = await mount(<DataTable loading={true} data={[]} />);
  await expect(component.getByRole('progressbar')).toBeVisible();
  await expect(component.getByRole('table')).toBeHidden();
});

test('error state shows message', async ({ mount }) => {
  const component = await mount(<DataTable error="Network failed" data={[]} />);
  await expect(component.getByText('Network failed')).toBeVisible();
});

test('success state renders rows', async ({ mount }) => {
  const data = [{ id: 1, name: 'Item' }];
  const component = await mount(<DataTable data={data} />);
  await expect(component.getByRole('row')).toHaveCount(2); // header + 1 data row
});
```

## When to Use What

| Scenario | Tool |
|---|---|
| Pure logic, utils, transforms | Unit test (vitest/jest) |
| Component rendering, interaction, states | CT (playwright-ct) |
| Multi-page flows, auth, integration | E2E (playwright) |
| Visual regression on components | CT + screenshot |
| API contract validation | E2E or API tests |
