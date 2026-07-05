---
name: design-system
description: "Design systems: tokens, Storybook, component APIs, theming, CVA, multi-brand"
---

# Design System

Build scalable, consistent component libraries with tokens, variants, and documentation.

## Scope

- Design tokens (W3C format, CSS custom properties, multi-platform)
- Storybook 8/9 development and documentation
- Component API design (props, slots, compound patterns)
- Theming (dark mode, multi-brand, runtime switching)
- Variant composition (CVA)
- Visual testing and documentation

## First Action

Identify the token layer first. Check for existing tokens file, CSS variables, or theme config. Component work builds on top of tokens.

## Constraints

1. Tokens are single source of truth (W3C Design Tokens format).
2. Storybook 8/9 for development, documentation, visual testing. Storybook 9: native RSC support, improved test runner.
3. Component API: minimal props, compound pattern for complex components.
4. Semantic versioning for component library releases.
5. Theme via CSS custom properties (tokens) - runtime switchable.
6. Variants over boolean props. `<Button variant="primary">` not `<Button primary>`.
7. Components are headless logic + styled wrapper.
8. Document: props table, usage examples, do/don't, accessibility notes.
9. CVA (class-variance-authority) for type-safe variant composition.
10. Design token types: color, dimension, fontFamily, fontWeight, duration, shadow, typography.

## DO NOT

- Hardcode colors, spacing, or typography values in components
- Create boolean prop soup (`<Button primary large disabled rounded>`)
- Skip accessibility in component documentation
- Couple components to specific data-fetching or state management
- Ship components without Storybook stories
- Use inline styles for themeable properties
- Break existing APIs without major version bump

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| Tokens, variables, Style Dictionary | `subskills/tokens.md` |
| Storybook stories, visual testing | `subskills/storybook.md` |
| Props, compound components, CVA | `subskills/component-api.md` |
| Dark mode, multi-brand, themes | `subskills/theming.md` |

## Verification

1. Tokens compile without errors (Style Dictionary build)
2. All components have Storybook stories with all variants
3. Visual regression tests pass (Chromatic or similar)
4. Component props are typed and documented
5. Theme switching works at runtime without page reload
6. axe-core passes in Storybook for each component

## Knowledge

- `knowledge/w3c-tokens-spec.md` - W3C Design Tokens format reference
- `knowledge/component-api-patterns.md` - 8 component API patterns
- `knowledge/common-mistakes.md` - 10 design system mistakes with fixes

## AI-Era Context (2026)

- W3C Design Tokens spec is the standard format; AI generates ad-hoc token structures
- Storybook 8/9 visual testing catches UI regressions that unit tests miss entirely
- AI generates components that hardcode values instead of consuming design tokens
- CVA (class-variance-authority) is the standard for type-safe variants; AI uses conditional classnames
- AI often misses compound component patterns and generates prop-heavy monolithic components

## Related Skills

- `frontend/accessibility` - Component accessibility requirements
- `testing-strategy` - Visual regression testing integration
