---
type: tool
title: "Design System Component Design"
---

# Design System Component Design

## Purpose

Design or review a design system component for consistency, composability, accessibility, and token usage. Ensure components are reusable across products and contexts.

## When to Use

- Creating a new design system component
- Reviewing component API design
- Evaluating token integration and theming
- Checking variant/state coverage
- Ensuring component accessibility compliance

## Prompt Template

Component to design/review:

```
[paste component code OR describe the component requirements]
```

Design tokens available:

```
[paste relevant token definitions or reference token structure]
```

Evaluate/design for:

1. **API Design**: Is the prop interface minimal and intuitive? Are defaults sensible? Is the component composable via slots/children? Are compound components used where appropriate?
2. **Token Usage**: Are all visual values derived from tokens (color, spacing, typography, radius, shadow)? Are semantic tokens used over primitive tokens? Is theming supported?
3. **Variants & States**: Are all visual variants covered (size, emphasis, color)? Are interactive states complete (hover, focus, active, disabled, loading)?
4. **Accessibility**: Does the component have correct roles/aria? Is it keyboard-operable? Does it announce state changes? Is focus managed?
5. **Composability**: Can it be composed with other components? Is it flexible without being bloated? Does it follow single-responsibility?
6. **Documentation**: Are props documented? Are usage examples clear? Are do/don't guidelines present?
7. **Cross-platform**: Does it work in light/dark mode? Does it handle RTL? Does it scale across viewport sizes?

Context:
- Design system: [name/framework]
- Component framework: [React/Vue/Angular/Web Components]
- Token format: [CSS variables/JS tokens/Style Dictionary]

## Output Format

```
## Component Assessment

### API
- Props: [well-designed / issues found]
- Composability: [score and notes]

### Token Compliance
- [tokens used correctly / gaps found]

### Variant Coverage
| Variant | Covered | Notes |
|---------|---------|-------|
| ...     | yes/no  | ...   |

### Accessibility
- [pass/fail per criterion]

### Recommendations
- [specific improvements]

### Verdict
[ready for library / needs iteration / major gaps]
```
