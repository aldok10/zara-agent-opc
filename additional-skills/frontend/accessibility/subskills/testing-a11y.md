# Accessibility Testing

## Activation

Triggered when: setting up a11y testing, integrating into CI, auditing existing pages, or debugging screen reader issues.

## Core Principles

- Automated tools catch 30-40% of issues. Manual testing is non-negotiable.
- Test at multiple layers: unit (component), integration (page), E2E (user flow).
- Screen reader + keyboard testing catches what automation cannot.
- Test with real assistive tech, not just ARIA validators.

## axe-core Integration

### Unit/Component (Vitest/Jest)

```js
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

expect.extend(toHaveNoViolations);

test('Button is accessible', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Playwright

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

// Scoped to component
test('nav is accessible', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .include('nav')
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Cypress

```js
import 'cypress-axe';

describe('Dashboard', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
    cy.injectAxe();
  });

  it('has no a11y violations', () => {
    cy.checkA11y(null, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa'],
    });
  });
});
```

## CI Integration

```yaml
# GitHub Actions example
- name: Accessibility audit
  run: |
    npx playwright test --grep @a11y
    # or
    npx pa11y-ci --config .pa11yci.json
```

pa11y-ci config:
```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe"],
    "timeout": 30000
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/login",
    "http://localhost:3000/dashboard"
  ]
}
```

## Storybook Integration

```js
// .storybook/main.js
export default {
  addons: ['@storybook/addon-a11y'],
};

// Component.stories.js
export default {
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};
```

## Manual Testing Checklist

### Keyboard

1. Tab through entire page - logical order?
2. All interactive elements reachable?
3. Focus always visible?
4. Can escape from all overlays?
5. No keyboard traps?

### Screen Reader (VoiceOver macOS)

1. `Cmd+F5` to enable
2. Navigate with `Ctrl+Option+Right/Left`
3. Check: headings hierarchy (`Ctrl+Option+Cmd+H`)
4. Check: landmarks (rotor: `Ctrl+Option+U`)
5. Check: forms announce labels and errors
6. Check: dynamic updates announced

### Screen Reader (NVDA Windows)

1. Browse mode: arrow keys navigate content
2. `H` for headings, `D` for landmarks, `F` for forms
3. Tab through interactive elements
4. Check: aria-live regions announce
5. Check: images have alt text read

## Testing Pyramid

| Layer | Tool | Catches |
|-------|------|---------|
| Static analysis | eslint-plugin-jsx-a11y | Missing alt, invalid ARIA |
| Component | jest-axe | Role/state violations |
| Integration | axe-core/Playwright | Page-level issues, contrast |
| E2E | pa11y-ci | Full page scan |
| Manual | Screen reader + keyboard | Context, flow, usability |

## Decision Table

| Need | Tool |
|------|------|
| Quick dev feedback | eslint-plugin-jsx-a11y + Storybook addon |
| CI gate | axe-core via Playwright + pa11y-ci |
| Component library | jest-axe per component |
| Full audit | axe DevTools + manual screen reader test |
| Visual regression with a11y | Chromatic + Storybook a11y addon |
