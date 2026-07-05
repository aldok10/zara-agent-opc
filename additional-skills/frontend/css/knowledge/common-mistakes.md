---
type: reference
title: Common CSS Mistakes
---

# Common CSS Mistakes

12 frequent CSS mistakes with wrong/right patterns.

## 1. Using px for font-size

```css
/* WRONG */
.text { font-size: 14px; }

/* RIGHT — respects user's browser settings */
.text { font-size: 0.875rem; }
```

## 2. Media queries for component responsiveness

```css
/* WRONG — viewport doesn't reflect container size */
@media (min-width: 600px) {
  .card { flex-direction: row; }
}

/* RIGHT — component responds to its own container */
.card-wrapper { container-type: inline-size; }

@container (min-inline-size: 400px) {
  .card { flex-direction: row; }
}
```

## 3. Using !important to fix specificity

```css
/* WRONG */
.nav .link.active { color: blue !important; }

/* RIGHT — use @layer to control cascade */
@layer base, components, overrides;

@layer components {
  .nav-link.active { color: blue; }
}
```

## 4. Deep nesting

```css
/* WRONG — fragile, high specificity */
.page .content .card .card-body .card-title a { color: blue; }

/* RIGHT — flat, low specificity */
.card-title-link { color: blue; }
```

## 5. Physical properties for layout

```css
/* WRONG — breaks in RTL languages */
.sidebar { margin-left: 2rem; padding-right: 1rem; }

/* RIGHT — works in all writing directions */
.sidebar { margin-inline-start: 2rem; padding-inline-end: 1rem; }
```

## 6. Fixed width/height

```css
/* WRONG — clips content or leaves empty space */
.card { height: 300px; width: 350px; }

/* RIGHT — flexible with constraints */
.card { min-block-size: 300px; inline-size: min(100%, 350px); }
```

## 7. Using floats for layout

```css
/* WRONG — clearfix hacks, fragile */
.col { float: left; width: 33.33%; }
.clearfix::after { content: ""; display: table; clear: both; }

/* RIGHT */
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
```

## 8. Animating layout properties

```css
/* WRONG — triggers layout/paint, janky */
.box { transition: width 0.3s, height 0.3s, top 0.3s; }

/* RIGHT — compositor-only, smooth 60fps */
.box { transition: transform 0.3s, opacity 0.3s; }
```

## 9. No reduced-motion handling

```css
/* WRONG — ignores vestibular disorders */
.hero { animation: bounce 2s infinite; }

/* RIGHT */
.hero { animation: bounce 2s infinite; }

@media (prefers-reduced-motion: reduce) {
  .hero { animation: none; }
}
```

## 10. Using 100vh for full-height on mobile

```css
/* WRONG — doesn't account for mobile browser chrome */
.fullscreen { height: 100vh; }

/* RIGHT — dynamic viewport height */
.fullscreen { min-block-size: 100dvh; }
```

## 11. z-index wars

```css
/* WRONG — arbitrary escalation */
.modal { z-index: 99999; }
.tooltip { z-index: 999999; }

/* RIGHT — managed scale with custom properties */
:root {
  --layer-base: 0;
  --layer-dropdown: 100;
  --layer-modal: 200;
  --layer-tooltip: 300;
}
.modal { z-index: var(--layer-modal); }
.tooltip { z-index: var(--layer-tooltip); }
```

## 12. Hardcoded colors throughout

```css
/* WRONG — impossible to maintain or theme */
.btn { background: #3b82f6; }
.link { color: #3b82f6; }
.badge { border: 1px solid #3b82f6; }

/* RIGHT — design tokens via custom properties */
:root { --color-primary: oklch(0.55 0.15 250); }

.btn { background: var(--color-primary); }
.link { color: var(--color-primary); }
.badge { border: 1px solid var(--color-primary); }
```
