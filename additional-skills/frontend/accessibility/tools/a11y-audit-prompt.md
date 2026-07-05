---
type: tool
title: "Accessibility Audit"
---

# Accessibility Audit

## Purpose

Perform a structured accessibility audit against WCAG 2.2 (Level AA minimum). Evaluate ARIA usage, focus management, keyboard navigation, color contrast, and semantic HTML correctness.

## When to Use

- Reviewing a component or page for accessibility compliance
- Before shipping user-facing UI changes
- When a11y issues are reported or suspected
- During design system component creation

## Prompt Template

Given the following code/component:

```
[paste component or page code]
```

Perform an accessibility audit covering:

1. **Semantic HTML**: Are elements used for their intended purpose? Are headings hierarchical? Are landmarks present?
2. **ARIA**: Are aria attributes correct and necessary? Are roles valid? Is aria-live used appropriately for dynamic content?
3. **Focus Management**: Is focus order logical? Are focus traps handled for modals/dialogs? Is focus restored after dismissals?
4. **Keyboard Navigation**: Can all interactive elements be reached and activated via keyboard? Are custom widgets keyboard-operable?
5. **Color & Contrast**: Do text/background combinations meet 4.5:1 (normal) or 3:1 (large) ratios? Is color not the sole indicator?
6. **Motion & Animation**: Is `prefers-reduced-motion` respected? Are animations pausable?
7. **Forms**: Are labels associated? Are errors announced? Is required state communicated?

Context:
- Target WCAG version: 2.2
- Compliance level: AA (note AAA opportunities)
- Framework: [React/Vue/Angular/Svelte/vanilla]
- User agents: modern browsers + screen readers (NVDA, VoiceOver)

## Output Format

```
## Audit Results

### Critical (must fix)
- [Issue]: [element/line]  -  [WCAG criterion]  -  [fix]

### Warnings (should fix)
- [Issue]: [element/line]  -  [WCAG criterion]  -  [fix]

### Passed
- [What was checked and passed]

### Recommendations
- [Improvements beyond minimum compliance]

### Testing Notes
- Screen reader behavior to verify manually
- Keyboard flow to test
```
