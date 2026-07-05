---
name: css
description: Modern CSS 2025: native features, layout, animations, Tailwind v4, cascade layers
---

# CSS Frontend Skill

## Scope

Modern CSS architecture and implementation. Native CSS features over JS solutions. Covers layout (grid/subgrid/flexbox), cascade management (@layer), container queries, animations (View Transitions, scroll-driven), color systems, and Tailwind CSS v4.

## First Action

1. Identify if the task is layout, styling, animation, or architecture
2. Check existing CSS approach in project (Tailwind, modules, native)
3. Route to appropriate subskill

## Constraints

1. Native CSS features over JS runtime solutions. Container Queries > JS resize observers.
2. `@layer` for cascade management: reset, base, components, utilities.
3. `:has()` for parent/sibling selection  -  replaces many JS-driven class toggles.
4. `color-mix()` for consistent color variations.
5. Subgrid for nested grid alignment.
6. View Transitions API for page/state transitions.
7. Logical properties (`inline-start`/`block-end`) over physical (`left`/`right`).
8. Prefer Tailwind or native CSS over runtime CSS-in-JS.
9. `@scope` for component-scoped styles without BEM or CSS Modules.
10. Tailwind CSS v4: CSS-first config (`@theme`), Rust engine, native `@layer`, OKLCH colors.

## DO NOT

- Use runtime CSS-in-JS (styled-components, Emotion in production bundles)
- Nest selectors deeper than 3 levels
- Use `px` for font-size (use `rem`)
- Use `@media` for component-level responsiveness (use `@container`)
- Override with `!important` (fix cascade with `@layer` instead)
- Use vendor prefixes manually (use build tooling)
- Hardcode colors without design tokens or custom properties
- Use `float` for layout (use grid/flexbox)

## Route to Subskill

| Task | Subskill | Trigger |
|------|----------|---------|
| Responsive components | `container-queries` | "responsive", "resize", "container", "card layout" |
| Page layout, grids | `layout` | "grid", "layout", "columns", "sidebar", "holy grail" |
| Transitions, motion | `animations` | "animate", "transition", "scroll", "view transition" |
| Tailwind setup/config | `tailwind` | "tailwind", "utility", "theme", "design tokens" |

## Verification

- Visual: component renders correctly at multiple container/viewport sizes
- Cascade: no `!important` overrides, layers ordered correctly
- Performance: no layout thrashing, animations use compositor-friendly properties
- Accessibility: respects `prefers-reduced-motion`, sufficient contrast, focus-visible styles
- Browser support: check caniuse for features used, provide fallbacks where needed

## Knowledge

- `knowledge/modern-css-2025.md`  -  New features reference
- `knowledge/layout-patterns.md`  -  10 modern layout patterns
- `knowledge/common-mistakes.md`  -  12 common CSS mistakes

## AI-Era Context (2026)

- Container queries replace media queries for component-level responsiveness; AI still generates `@media`
- `@layer` controls cascade specificity -- AI-generated CSS often fights specificity without layers
- AI struggles with modern CSS (`:has()`, `color-mix()`, subgrid) and falls back to JS solutions
- Tailwind CSS v4 uses CSS-first config (`@theme`) and Rust engine -- AI generates v3 config syntax
- Logical properties (`inline-start`/`block-end`) are standard; AI generates physical `left`/`right`

## Related Skills

- `typescript-expert`  -  For type-safe design token generation
- `system-design`  -  For design system architecture decisions
