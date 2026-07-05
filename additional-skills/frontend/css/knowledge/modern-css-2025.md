---
type: reference
title: Modern CSS 2025 Features
---

# Modern CSS 2025

## @layer (Cascade Layers)

Control specificity ordering without selector hacks. Later-declared layers override earlier ones.

```css
@layer reset, base, components, utilities;

@layer reset { /* lowest priority */ }
@layer utilities { /* highest priority */ }
```

Unlayered styles beat all layers. Import into layers: `@import "lib.css" layer(vendor);`

## :has() (Parent Selector)

Select elements based on their descendants or siblings.

```css
/* Style parent when it contains an image */
.card:has(img) { grid-template-rows: auto 1fr; }

/* Form group with invalid input */
.field:has(:invalid) { --border-color: red; }

/* Next sibling of hovered element */
.item:has(+ .item:hover) { opacity: 0.7; }

/* Page with open dialog */
html:has(dialog[open]) { overflow: hidden; }
```

## color-mix()

Blend colors in any color space. Replaces opacity hacks and Sass color functions.

```css
:root {
  --primary: oklch(0.55 0.15 250);
  --primary-light: color-mix(in oklch, var(--primary) 30%, white);
  --primary-dark: color-mix(in oklch, var(--primary) 70%, black);
  --primary-hover: color-mix(in oklch, var(--primary), transparent 20%);
}
```

## @scope

Scoped styles with upper and lower boundaries. No tooling needed.

```css
@scope (.card) to (.card-content) {
  /* Only styles between .card and .card-content */
  img { border-radius: var(--radius-md); }
  h2 { font-size: var(--text-lg); }
}

@scope (.tabs) {
  :scope { display: flex; gap: 0; }
  .tab { padding: 0.5rem 1rem; }
  .tab[aria-selected="true"] { border-block-end: 2px solid; }
}
```

## Anchor Positioning

Position elements relative to an anchor without JS. Replaces Popper.js for many cases.

```css
.trigger {
  anchor-name: --my-anchor;
}

.popover {
  position: fixed;
  position-anchor: --my-anchor;
  inset-area: block-end;
  margin-block-start: 0.5rem;

  /* Fallback if no space below */
  position-try-fallbacks: flip-block;
}
```

## @starting-style

Define initial styles for entry animations from `display: none`.

```css
.popover {
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.2s, transform 0.2s, display 0.2s;
  transition-behavior: allow-discrete;

  @starting-style {
    opacity: 0;
    transform: scale(0.95);
  }
}
```

## Container Style Queries

Query custom property values on containers.

```css
.card { --size: default; }

@container style(--size: compact) {
  .card-image { display: none; }
  .card-body { padding: 0.5rem; }
}
```

## View Transitions (Cross-Document)

```css
@view-transition { navigation: auto; }
.hero { view-transition-name: hero; }
```

Both pages must opt in with `@view-transition`. Browser handles interpolation.

## Nesting (Native)

```css
.card {
  padding: 1rem;

  & .title {
    font-weight: bold;
  }

  &:hover {
    background: var(--hover-bg);
  }

  @media (width >= 768px) {
    padding: 2rem;
  }
}
```

## Logical Properties Summary

| Physical | Logical |
|----------|---------|
| `width` / `height` | `inline-size` / `block-size` |
| `left` / `right` | `inline-start` / `inline-end` |
| `top` / `bottom` | `block-start` / `block-end` |
| `margin-left` | `margin-inline-start` |
| `border-top` | `border-block-start` |
| `text-align: left` | `text-align: start` |

## Custom Media (Future)

```css
@custom-media --tablet (width >= 768px) and (width < 1024px);

@media (--tablet) {
  .sidebar { display: none; }
}
```

## oklch() Color Function

Perceptually uniform — same lightness values look equally bright.

```css
:root {
  --blue-500: oklch(0.55 0.15 250);
  --red-500: oklch(0.55 0.18 25);
  /* Both have lightness 0.55, so they look equally bright */
}
```

## light-dark()

```css
:root {
  color-scheme: light dark;
  --surface: light-dark(#fff, #1a1a1a);
  --text: light-dark(#111, #eee);
}
```
