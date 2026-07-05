---
type: subskill
title: "CI Accessibility Gates"
---

# CI Accessibility Gates

## Threshold Configuration

Block CI on critical and serious violations, warn on moderate/minor:
```ts
// cypress/support/a11y.ts
cy.checkA11y(null, {
  includedImpacts: ['critical', 'serious'], // only these fail the test
})
```

```ts
// playwright
const results = await new AxeBuilder({ page }).analyze()
const blocking = results.violations.filter(v => 
  ['critical', 'serious'].includes(v.impact)
)
expect(blocking).toHaveLength(0)
```

## Severity Levels

| Level | Examples | CI Action |
|-------|----------|-----------|
| Critical | Missing alt text on functional images, no keyboard access | Block merge |
| Serious | Insufficient color contrast, missing form labels | Block merge |
| Moderate | Heading order skipped, redundant ARIA | Warn (annotation) |
| Minor | Best practice violations, landmark suggestions | Info only |

## Blocking vs Warning

Separate blocking violations from advisory:
```yaml
# GitHub Actions
- name: A11y Audit
  run: npm run test:a11y
  # Blocking: exit code != 0 fails the job

- name: A11y Advisory
  run: npm run test:a11y:advisory
  continue-on-error: true  # Warnings don't block
```

## Reporting & Dashboards

Track violations over time:
- Export results as JSON artifact per build
- Aggregate into dashboard (Grafana, custom)
- Metrics: total violations, violations by severity, new vs recurring
- Trend: violations per page/component over sprints

## PR Annotations

Surface violations directly in pull requests:
```yaml
- name: Annotate A11y Issues
  uses: actions/github-script@v7
  with:
    script: |
      const results = require('./a11y-results.json')
      for (const violation of results.violations) {
        core.warning(
          `${violation.id}: ${violation.help} (${violation.impact})`,
          { file: violation.nodes[0]?.target, title: 'Accessibility' }
        )
      }
```

## Rule Exceptions

When a violation cannot be fixed immediately:
1. Document justification in `.a11y-exceptions.json`
2. Require tech lead approval for exception
3. Set expiry date (max 90 days)
4. Track exceptions as tech debt

```json
{
  "exceptions": [
    {
      "rule": "color-contrast",
      "selector": ".legacy-banner",
      "reason": "Legacy component scheduled for redesign Q3",
      "expires": "2025-09-30",
      "approved_by": "tech-lead"
    }
  ]
}
```

## Baseline Management

When adopting a11y testing on existing projects:
- Run initial audit to establish violation count
- Set baseline: CI fails only on NEW violations above baseline
- Ratchet down: reduce baseline as fixes land
- Never increase baseline without documented justification

```bash
# Generate baseline
npx axe-ci --baseline --output .a11y-baseline.json

# CI run compares against baseline
npx axe-ci --compare .a11y-baseline.json --fail-on-new
```
