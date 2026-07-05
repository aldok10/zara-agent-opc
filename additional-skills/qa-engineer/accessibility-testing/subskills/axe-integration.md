# Axe Integration

## @axe-core/playwright

```typescript
import AxeBuilder from '@axe-core/playwright';

// Basic scan
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
  .analyze();

// Exclude third-party widgets
const results = await new AxeBuilder({ page })
  .exclude('.third-party-chat-widget')
  .exclude('#intercom-container')
  .analyze();

// Disable specific rules
const results = await new AxeBuilder({ page })
  .disableRules(['color-contrast', 'region'])
  .analyze();
```

## cypress-axe

```typescript
// support/e2e.ts
import 'cypress-axe';

// In test
cy.visit('/dashboard');
cy.injectAxe();
cy.checkA11y(null, {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  rules: { 'color-contrast': { enabled: false } }
});

// Target specific container
cy.checkA11y('#main-content', {
  includedImpacts: ['critical', 'serious']
});
```

## Tag Selection Strategy

| Tag | Coverage |
|-----|----------|
| `wcag2a` | WCAG 2.0 Level A (minimum) |
| `wcag2aa` | WCAG 2.0 Level AA (standard target) |
| `wcag21aa` | WCAG 2.1 Level AA (mobile, cognitive) |
| `best-practice` | Beyond WCAG, general UX |

Recommended default: `['wcag2a', 'wcag2aa', 'wcag21aa']`

## CI Gate Configuration

```typescript
// Fail on critical/serious only
expect(results.violations.filter(v =>
  ['critical', 'serious'].includes(v.impact!)
)).toHaveLength(0);

// Zero-tolerance policy (all severities)
expect(results.violations).toHaveLength(0);
```

## Custom Rules

```typescript
// Organization-specific: require data-testid on interactive elements
const customRules = [{
  id: 'require-test-id',
  selector: 'button, a, input, select, textarea',
  tags: ['org-custom'],
  any: [{ id: 'has-data-testid', evaluate: (node) => node.hasAttribute('data-testid') }]
}];
```

## Storybook Integration

```typescript
// .storybook/main.ts
addons: ['@storybook/addon-a11y'];

// Per-story configuration
export const MyComponent: Story = {
  parameters: {
    a11y: {
      config: { rules: [{ id: 'color-contrast', enabled: false }] },
      options: { runOnly: { type: 'tag', values: ['wcag2aa'] } }
    }
  }
};
```

## Excluding Third-Party Widgets

```typescript
const THIRD_PARTY_SELECTORS = [
  '#hubspot-messages-iframe-container',
  '.intercom-lightweight-app',
  '[data-chatlio-widget]',
  '.grecaptcha-badge'
];

const results = await new AxeBuilder({ page })
  .exclude(THIRD_PARTY_SELECTORS)
  .analyze();
```

Document exclusions with rationale. Review quarterly to remove stale entries.
