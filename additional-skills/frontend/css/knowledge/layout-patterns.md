---
type: reference
title: Modern CSS Layout Patterns
---

# Layout Patterns

10 production-ready layout patterns using modern CSS.

## 1. Holy Grail

```css
.holy-grail {
  display: grid;
  grid-template: auto 1fr auto / minmax(200px, 1fr) 3fr minmax(200px, 1fr);
  grid-template-areas:
    "header header header"
    "left   main   right"
    "footer footer footer";
  min-block-size: 100dvh;
}
```

## 2. Responsive Sidebar

```css
.sidebar-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 768px) {
  .sidebar-layout {
    grid-template-columns: clamp(200px, 25%, 300px) 1fr;
    gap: 2rem;
  }
}
```

## 3. Card Grid (Intrinsic)

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 1.5rem;
}
```

## 4. Pancake Stack (Header/Main/Footer)

```css
.pancake {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-block-size: 100dvh;
}
```

## 5. RAM (Repeat, Auto, Minmax) with Subgrid Cards

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.grid > .card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
}
```

## 6. Content + Breakout (Full-Bleed)

```css
.content-grid {
  display: grid;
  grid-template-columns:
    [full-start] minmax(1rem, 1fr)
    [content-start] min(65ch, 100% - 2rem)
    [content-end] minmax(1rem, 1fr)
    [full-end];
}

.content-grid > * {
  grid-column: content;
}

.content-grid > .full-bleed {
  grid-column: full;
}
```

## 7. Sticky Footer

```css
body {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-block-size: 100dvh;
}

/* Footer always at bottom, even with little content */
```

## 8. Masonry-like (Columns)

```css
.masonry {
  columns: min(3, var(--cols, 3));
  column-gap: 1.5rem;
}

.masonry > * {
  break-inside: avoid;
  margin-block-end: 1.5rem;
}
```

## 9. Centered Max-Width Content

```css
.wrapper {
  inline-size: min(100% - 2rem, var(--max-width, 1200px));
  margin-inline: auto;
}
```

## 10. Dashboard (Fixed Sidebar + Scrollable Main)

```css
.dashboard {
  display: grid;
  grid-template-columns: auto 1fr;
  block-size: 100dvh;
}

.dashboard-sidebar {
  inline-size: clamp(200px, 20vw, 280px);
  overflow-y: auto;
  border-inline-end: 1px solid var(--color-border);
}

.dashboard-main {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow-y: auto;
}
```

## Bonus: Aspect Ratio Cards

```css
.media-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.media-card img {
  aspect-ratio: 16 / 9;
  object-fit: cover;
  inline-size: 100%;
}
```
