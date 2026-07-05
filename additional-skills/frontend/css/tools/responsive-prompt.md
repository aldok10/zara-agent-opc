---
type: tool
title: "Responsive Layout Strategy"
---

# Responsive Layout Strategy

## Purpose

Design responsive layouts using modern CSS features including container queries, fluid typography, logical properties, and systematic breakpoint strategy. Prioritizes content-driven over device-driven approaches.

## When to Use

- Designing layout system for a new project
- Migrating from fixed breakpoints to fluid/container-based
- Implementing fluid typography scale
- Resolving layout issues across viewport sizes
- Choosing between media queries and container queries

## Prompt Template

```
CONTEXT:
- Design approach: [mobile-first | desktop-first | content-first]
- CSS methodology: [utility-first (Tailwind) | BEM | CSS Modules | vanilla]
- Browser support: [modern only | IE11 | specific baseline]
- Layout types: [content page | dashboard | e-commerce | app shell]
- Design tokens: [existing spacing/sizing scale or creating new]
- Component library: [existing | new | migrating]

STRATEGY DECISIONS:
1. Breakpoint system
   - Content-driven breakpoints (where layout breaks)
   - Named breakpoints: [sm, md, lg, xl] or semantic [compact, medium, expanded]
   - Breakpoint values based on content, not devices
   - Media queries for page-level layout shifts
   - Container queries for component-level adaptation

2. Container queries
   - @container for component-intrinsic responsiveness
   - Container types: inline-size vs size
   - Naming containers for nested contexts
   - Fallback for older browsers (if needed)
   - Use cases: cards, sidebars, reusable widgets

3. Fluid typography
   - clamp() for fluid font sizes: clamp(min, preferred, max)
   - Viewport-based scaling: calc(base + vw increment)
   - Type scale ratios (minor third, major second)
   - Line height scaling with font size
   - Minimum readable size (16px body)

4. Fluid spacing
   - clamp() for margins and padding
   - Consistent spacing scale (4px base or 8px)
   - Logical properties (margin-inline, padding-block)
   - Gap-first layout (grid/flex gap vs margin)

5. Layout patterns
   - CSS Grid: auto-fill/auto-fit + minmax for responsive grids
   - Flexbox wrap with min-width for flexible rows
   - Sidebar layout: grid with minmax (no media query needed)
   - Holy grail: named grid areas with media query swap
   - Stack-to-horizontal: flexbox direction change

6. Image and media
   - srcset and sizes for responsive images
   - aspect-ratio for layout stability
   - object-fit for contained/covered media
   - Art direction with <picture> element

ANTI-PATTERNS:
- Device-specific breakpoints (iPhone 12, iPad Pro)
- Fixed pixel widths on containers
- Viewport units without clamp (text too small/large)
- Hiding content with display:none (still downloaded)
- Media queries inside components (prefer container queries)
```

## Output Format

```
## Responsive Strategy: [project/component]

### Breakpoint System
| Name | Value | Rationale |
|------|-------|-----------|
| ... | ... | content breaks at this point |

### Typography Scale
| Element | Min | Fluid | Max |
|---------|-----|-------|-----|
| h1 | ... | clamp(...) | ... |
| body | ... | clamp(...) | ... |

### Layout Approach
| Pattern | Technique | Responsive Method |
|---------|-----------|-------------------|
| ... | CSS Grid/Flex | container query/media query |

### Container Query Usage
[Which components use container queries and why]

### Code Examples
[Key CSS patterns for the strategy]

### Testing Matrix
- [Viewport sizes to verify]
- [Container size scenarios]
- [Typography readability checks]
```
