---
type: fact
title: "Axe-Core Usage Patterns"
---

# Axe-Core Usage Patterns

## Core Concepts

axe-core is the accessibility testing engine behind Deque's tools. It runs rules against a DOM and reports violations, passes, and incomplete checks.

### Rule Structure
- Each rule has: ID, description, tags (wcag2a, wcag2aa, best-practice), and checks
- Checks are individual tests (e.g., "has valid alt text")
- Rules can be enabled/disabled per run

## Integration Patterns

### Playwright + axe-core
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page meets WCAG 2.2 AA', async ({ page }) => {
  await page.goto('/dashboard');
  
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .exclude('.third-party-widget')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Cypress + axe-core
```typescript
import 'cypress-axe';

describe('Accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('has no violations on load', () => {
    cy.checkA11y(null, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa']
      }
    });
  });

  it('checks specific component', () => {
    cy.checkA11y('.modal-dialog', {
      rules: {
        'color-contrast': { enabled: true },
        'region': { enabled: false }
      }
    });
  });
});
```

### Jest + jsdom (Unit/Component)
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

expect.extend(toHaveNoViolations);

test('Button component is accessible', async () => {
  const { container } = render(<Button label="Submit" />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Configuration Strategies

### Scope Control
```typescript
// Include only main content
new AxeBuilder({ page }).include('#main-content');

// Exclude known third-party issues
new AxeBuilder({ page })
  .exclude('.intercom-widget')
  .exclude('[data-testid="legacy-component"]');
```

### Rule Customization
```typescript
// Disable rules not applicable to your context
new AxeBuilder({ page }).disableRules([
  'landmark-one-main',  // SPAs with dynamic main
  'page-has-heading-one' // Not all pages need h1
]);
```

### Impact Filtering
```typescript
const results = await new AxeBuilder({ page }).analyze();

// Only fail on critical/serious
const significantViolations = results.violations.filter(
  v => v.impact === 'critical' || v.impact === 'serious'
);
expect(significantViolations).toHaveLength(0);
```

## CI Integration Pattern

### Baseline Approach
1. Run full scan, record current violation count
2. Set threshold: new PRs must not increase violations
3. Gradually reduce threshold to zero

```typescript
// ci-a11y-check.ts
const BASELINE = 5; // known issues being fixed
const results = await new AxeBuilder({ page }).analyze();

if (results.violations.length > BASELINE) {
  console.error(`A11y regression: ${results.violations.length} > ${BASELINE}`);
  process.exit(1);
}
```

### Page Coverage Strategy
```typescript
const routes = ['/home', '/login', '/dashboard', '/settings', '/profile'];

for (const route of routes) {
  test(`${route} meets AA`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

## Reporting

### Structured Output
```typescript
// Custom reporter for CI
results.violations.forEach(violation => {
  console.log(`[${violation.impact}] ${violation.id}: ${violation.description}`);
  violation.nodes.forEach(node => {
    console.log(`  Target: ${node.target}`);
    console.log(`  HTML: ${node.html.substring(0, 100)}`);
    console.log(`  Fix: ${node.failureSummary}`);
  });
});
```

### HTML Report (axe-html-reporter)
```typescript
import { createHtmlReport } from 'axe-html-reporter';

createHtmlReport({
  results,
  options: { outputDir: './a11y-reports', reportFileName: 'report.html' }
});
```

## Common Gotchas

1. **Timing**: Run axe AFTER dynamic content loads (await animations, lazy content)
2. **Shadow DOM**: axe-core 4.x scans open shadow DOMs by default
3. **Iframes**: Must inject axe into each iframe separately
4. **Color contrast**: axe cannot detect contrast on background images (mark as needs-review)
5. **State testing**: Test multiple states (modal open, dropdown expanded, error shown)
6. **False positives**: `incomplete` results need manual verification, not auto-pass

## Rule Tags Reference

| Tag | Meaning |
|-----|---------|
| `wcag2a` | WCAG 2.x Level A |
| `wcag2aa` | WCAG 2.x Level AA |
| `wcag21a` | WCAG 2.1 Level A |
| `wcag21aa` | WCAG 2.1 Level AA |
| `wcag22aa` | WCAG 2.2 Level AA |
| `best-practice` | Not WCAG but recommended |
| `experimental` | New/unstable rules |
