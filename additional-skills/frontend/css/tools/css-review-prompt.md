---
type: tool
title: "CSS Code Review"
---

# CSS Code Review

## Purpose

Review CSS/SCSS code for maintainability, performance, and correctness. Evaluate specificity management, layout patterns, custom properties usage, and modern CSS features.

## When to Use

- Reviewing stylesheets or styled components
- Debugging layout or specificity conflicts
- Evaluating CSS architecture decisions
- Adopting modern CSS features (container queries, cascade layers, nesting)

## Prompt Template

Given the following CSS/SCSS:

```
[paste stylesheet or styled component code]
```

Review for:

1. **Specificity**: Are selectors low-specificity? Is `!important` avoided? Are cascade layers (`@layer`) used for ordering? Is nesting depth reasonable (max 3 levels)?
2. **Layout**: Are modern layout methods used (grid, flexbox)? Is the layout responsive without breakpoint overload? Are container queries used where appropriate?
3. **Custom Properties**: Are design tokens defined as custom properties? Is the naming consistent? Are fallbacks provided? Is scope managed well?
4. **Performance**: Are expensive properties avoided in animations (layout triggers)? Is `will-change` used sparingly? Are repaints minimized?
5. **Maintainability**: Is the naming convention consistent (BEM, utility, module)? Are magic numbers avoided? Is duplication minimal?
6. **Modern CSS**: Are new features used where supported (`has()`, `container`, `@scope`, `color-mix()`)? Are fallbacks provided for progressive enhancement?
7. **Responsiveness**: Is the approach mobile-first? Are relative units preferred over fixed pixels? Is content reflow handled gracefully?

Context:
- Methodology: [BEM/utility-first/CSS Modules/CSS-in-JS]
- Preprocessor: [none/SCSS/PostCSS/Tailwind]
- Browser support: [modern only / legacy included]

## Output Format

```
## CSS Review

### Issues
- [severity] [selector/line]  -  [problem]  -  [fix]

### Specificity Concerns
- [selectors with high specificity and alternatives]

### Layout Improvements
- [current approach] → [better approach]

### Modern CSS Opportunities
- [feature to adopt]  -  [benefit]  -  [browser support note]

### Verdict
[clean / minor issues / needs refactoring]
```
