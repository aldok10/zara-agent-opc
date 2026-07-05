# Layout

## Activation

Trigger when task involves: page layout, grid systems, sidebar layouts, card grids, centering, multi-column, alignment, spacing systems, responsive page structure.

## Core Principles

1. Grid for 2D layouts, flexbox for 1D distribution
2. Subgrid for aligning nested grid children to parent tracks
3. Logical properties for internationalization-ready layouts
4. `auto-fill` / `auto-fit` with `minmax()` for intrinsic responsive grids
5. Named grid areas for readable layout declarations
6. `gap` over margins for consistent spacing between items

## Decision Table

| Scenario | Approach |
|----------|----------|
| Full page layout (header/sidebar/main/footer) | CSS Grid with named areas |
| Card grid with flexible columns | `grid-template-columns: repeat(auto-fill, minmax(min, 1fr))` |
| Nested items aligning to parent grid | Subgrid |
| Single row/column of items | Flexbox |
| Navigation bar | Flexbox |
| Equal-height cards | Grid (inherent) or flexbox `align-items: stretch` |
| Centering | `place-items: center` (grid) or `margin: auto` (flexbox) |
| Multi-column text | `columns` property |
| Sidebar + main content | Grid with `minmax()` or `fr` units |
| Sticky elements | `position: sticky` with proper overflow context |

## Patterns

### Responsive Grid (No Media Queries)

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 1.5rem;
}
```

### Named Grid Areas

```css
.page {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: minmax(200px, 1fr) 3fr;
  grid-template-rows: auto 1fr auto;
  min-block-size: 100dvh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }

@media (max-width: 768px) {
  .page {
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
    grid-template-columns: 1fr;
  }
}
```

### Subgrid

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3; /* header, body, footer */
}

.card-header { align-self: start; }
.card-body   { align-self: start; }
.card-footer { align-self: end; }
```

### Sidebar Layout (Flexible)

```css
.with-sidebar {
  display: grid;
  grid-template-columns: fit-content(300px) minmax(50%, 1fr);
  gap: 2rem;
}

/* Collapse to stack on narrow viewports */
@media (max-width: 768px) {
  .with-sidebar {
    grid-template-columns: 1fr;
  }
}
```

### Flexbox Navigation

```css
.nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-inline: 1.5rem;
  padding-block: 0.75rem;
}

.nav-spacer {
  margin-inline-start: auto;
}
```

### Centering (Modern)

```css
/* Grid centering */
.center-grid {
  display: grid;
  place-items: center;
  min-block-size: 100dvh;
}

/* Flexbox centering */
.center-flex {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 100dvh;
}
```

### Multi-Column Text

```css
.article-body {
  columns: min(3, var(--columns, 2));
  column-gap: 2rem;
  column-rule: 1px solid var(--color-border);
}

.article-body h2 {
  column-span: all;
}
```

### Logical Properties

```css
/* Instead of: margin-left, padding-right, border-top, width, height */
.element {
  margin-inline-start: 1rem;
  padding-inline-end: 1.5rem;
  border-block-start: 1px solid;
  inline-size: 100%;
  block-size: auto;
}
```
