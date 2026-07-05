---
type: subskill
title: "Animations"
---

# Animations

## Activation

Trigger when task involves: page transitions, state animations, scroll-driven effects, enter/exit animations, View Transitions API, motion design, loading states.

## Core Principles

1. View Transitions API for page/state transitions  -  replaces JS animation libraries for navigation
2. `@starting-style` for entry animations (animating from `display: none`)
3. Scroll-driven animations via `animation-timeline: scroll()` or `view()`
4. Compositor-friendly properties only: `transform`, `opacity`, `filter`
5. Always respect `prefers-reduced-motion`
6. `transition-behavior: allow-discrete` for animating discrete properties (`display`, `overlay`)

## Decision Table

| Scenario | Approach |
|----------|----------|
| Page-to-page navigation transitions | View Transitions API (`@view-transition`) |
| Element enter animation (from hidden) | `@starting-style` + `transition` |
| Scroll-linked progress bar | `animation-timeline: scroll()` |
| Element appears on scroll | `animation-timeline: view()` |
| Simple hover/focus state | `transition` on the property |
| Complex multi-step animation | `@keyframes` |
| Shared element between pages | `view-transition-name` |
| Exit animation before removal | `transition-behavior: allow-discrete` + `display` |

## Patterns

### View Transitions (Same-Document / SPA)

Same-document transitions use `document.startViewTransition()` in JS.
`@view-transition { navigation: auto; }` is cross-document (MPA) only.

```ts
// Trigger a same-document view transition
document.startViewTransition(() => {
  // Update the DOM (e.g., swap route content)
  updateDOM();
});
```

```css
/* Custom transition for specific elements */
.hero-image {
  view-transition-name: hero;
}

::view-transition-old(hero) {
  animation: fade-out 0.3s ease-out;
}

::view-transition-new(hero) {
  animation: fade-in 0.3s ease-in;
}
```

### View Transitions (Cross-Document / MPA)

```css
/* Source page */
@view-transition {
  navigation: auto;
}

/* Both pages must opt in */
.product-card img {
  view-transition-name: product-hero;
}

/* Destination page */
@view-transition {
  navigation: auto;
}

.product-hero {
  view-transition-name: product-hero;
}

/* Custom animation */
::view-transition-group(product-hero) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### @starting-style (Entry Animations)

```css
.dialog {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s, transform 0.3s, display 0.3s;
  transition-behavior: allow-discrete;

  @starting-style {
    opacity: 0;
    transform: translateY(-1rem);
  }
}

.dialog[hidden] {
  opacity: 0;
  transform: translateY(-1rem);
  display: none;
}
```

### Scroll-Driven Animation (Progress)

```css
.progress-bar {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: 3px;
  background: var(--color-accent);
  transform-origin: inline-start;
  animation: grow-progress linear both;
  animation-timeline: scroll();
}

@keyframes grow-progress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
```

### Scroll-Driven Animation (Element Reveal)

```css
.reveal-on-scroll {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Or per-component: */
.hero {
  animation: slide-in 0.5s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .hero {
    animation: fade-in 0.1s ease-out;
  }
}
```

### Anchor Positioning + Animation

```css
.tooltip {
  position: fixed;
  position-anchor: --trigger;
  position-area: block-start;
  margin-block-end: 0.5rem;

  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.2s, transform 0.2s, display 0.2s;
  transition-behavior: allow-discrete;

  @starting-style {
    opacity: 0;
    transform: translateY(0.5rem);
  }
}

.tooltip[hidden] {
  opacity: 0;
  transform: translateY(0.5rem);
  display: none;
}

.trigger {
  anchor-name: --trigger;
}
```
