---
type: subskill
title: "Container Queries"
---

# Container Queries

## Activation

Trigger when task involves: responsive components, element-level breakpoints, component resize behavior, card/widget layouts that adapt to parent size.

## Core Principles

1. Container queries scope responsiveness to the component, not the viewport
2. Name containers explicitly for clarity and nested container support
3. Use `cq` units (`cqi`, `cqb`, `cqw`, `cqh`) for container-relative sizing
4. Style queries (`@container style()`) enable conditional styling based on custom property values
5. Always define `container-type`  -  `inline-size` is safest default (avoids height loops)

## Decision Table

| Scenario | Approach |
|----------|----------|
| Component adapts to its parent width | `container-type: inline-size` + `@container` |
| Component adapts to both axes | `container-type: size` (use sparingly) |
| Named container for nested layouts | `container-name: card` + `@container card` |
| Theme-variant styling | `@container style(--variant: compact)` |
| Font scaling relative to container | `cqi` units |
| Viewport-level responsiveness | `@media` (not container queries) |

## Patterns

### Basic Container Query

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

.card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@container card (min-inline-size: 400px) {
  .card {
    grid-template-columns: 200px 1fr;
  }
}

@container card (min-inline-size: 700px) {
  .card {
    grid-template-columns: 250px 1fr auto;
  }
}
```

### Container Query Units

```css
.card-wrapper {
  container-type: inline-size;
}

.card-title {
  font-size: clamp(1rem, 3cqi, 1.5rem);
}

.card-body {
  padding: 2cqi;
}
```

### Style Queries

```css
.card-wrapper {
  container-name: card;
  --variant: default;
}

@container card style(--variant: compact) {
  .card {
    padding: 0.5rem;
    gap: 0.25rem;
  }
  .card-image {
    display: none;
  }
}

@container card style(--variant: featured) {
  .card {
    border: 2px solid var(--color-accent);
    padding: 2rem;
  }
}
```

### Nested Containers

```css
.page-section {
  container-type: inline-size;
  container-name: section;
}

.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

@container section (min-inline-size: 800px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@container card (min-inline-size: 300px) {
  .card {
    flex-direction: row;
  }
}
```

## Fallback Strategy

```css
/* Fallback for browsers without container query support */
.card {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 600px) {
  .card {
    grid-template-columns: 200px 1fr;
  }
}

/* Enhanced with container queries */
@supports (container-type: inline-size) {
  .card-wrapper {
    container-type: inline-size;
  }

  .card {
    grid-template-columns: 1fr;
  }

  @container (min-inline-size: 400px) {
    .card {
      grid-template-columns: 200px 1fr;
    }
  }
}
```
