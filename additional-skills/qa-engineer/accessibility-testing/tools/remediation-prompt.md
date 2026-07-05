---
type: tool
title: "A11y Issue Remediation Prompt"
---

# A11y Issue Remediation Prompt

## Purpose
Generate specific, code-level fix suggestions for accessibility violations grouped by WCAG success criterion.

## When to Use
- After an accessibility audit produces a list of violations
- When developers need actionable fix code, not just violation descriptions
- When triaging a11y backlog and assigning remediation effort

## Prompt Template

```
You are a front-end accessibility specialist. Given the following violations, produce remediation code for each.

CONTEXT:
- Framework: {react|vue|angular|vanilla_html}
- Design system: {component_library_or_custom}
- WCAG target: {A|AA|AAA}

VIOLATIONS:
{paste_violation_list_with_criterion_and_element}

FOR EACH VIOLATION PROVIDE:

1. WCAG Criterion: [e.g., 1.1.1 Non-text Content]
2. Current code: [the failing markup/component]
3. Fixed code: [corrected implementation]
4. Explanation: [why this fix satisfies the criterion]
5. Testing: [how to verify the fix works - manual + automated]
6. Effort: [S/M/L estimate]

RULES:
- Fixes must preserve visual design unless explicitly noted
- Prefer semantic HTML over ARIA when possible
- If ARIA is needed, use correct roles, states, and properties
- Include screen reader announcement behavior in explanation
- Group related violations (same component, same pattern)
- Flag fixes that require design team input (contrast, layout changes)
- Note when a fix benefits multiple criteria simultaneously
```

## Output Format

```markdown
## Remediation Plan

### High Priority (Criterion X.X.X)
| Element | Current | Fix | Effort | Notes |
|---------|---------|-----|--------|-------|

### Code Examples
[Before/after code blocks per fix]

### Design Decisions Needed
- [Items requiring designer input]

### Verification Steps
- [ ] axe-core passes on fixed elements
- [ ] Screen reader announces correctly
- [ ] Keyboard interaction works as expected
```
