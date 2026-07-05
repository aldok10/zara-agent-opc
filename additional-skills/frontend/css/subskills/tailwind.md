# Tailwind CSS

## Activation

Trigger when task involves: Tailwind setup, v4 migration, custom theme configuration, design tokens, utility creation, `@theme` blocks, Tailwind plugins.

## Core Principles

1. Tailwind v4 is CSS-first — configuration lives in CSS via `@theme`, not `tailwind.config.js`
2. Rust-based engine (Oxide) — faster builds, no PostCSS dependency for core
3. Native `@layer` integration — Tailwind layers map to CSS cascade layers
4. OKLCH color space for perceptually uniform color palettes
5. Design tokens as CSS custom properties via `@theme`
6. Zero-config content detection — no `content` array needed
7. `@utility` and `@variant` for custom extensions in CSS

## Decision Table

| Scenario | Approach |
|----------|----------|
| Project setup (v4) | Single CSS import: `@import "tailwindcss"` |
| Custom colors/spacing | `@theme` block in CSS |
| One-off custom utility | `@utility` directive |
| Custom variant | `@variant` directive |
| Design tokens from Figma | CSS custom properties in `@theme` |
| Dark mode | `@variant dark { &:where(.dark, .dark *) }` or media strategy |
| Migrating from v3 | Remove `tailwind.config.js`, move to `@theme` |
| Component library | `@layer components { }` |

## Patterns

### v4 Setup (Minimal)

```css
/* app.css */
@import "tailwindcss";
```

### Custom Theme

```css
@import "tailwindcss";

@theme {
  /* Colors (OKLCH for perceptual uniformity) */
  --color-primary-50: oklch(0.97 0.01 250);
  --color-primary-100: oklch(0.93 0.03 250);
  --color-primary-500: oklch(0.55 0.15 250);
  --color-primary-700: oklch(0.40 0.12 250);
  --color-primary-900: oklch(0.25 0.08 250);

  /* Spacing scale */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;

  /* Breakpoints */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

### Custom Utilities

```css
@utility text-balance {
  text-wrap: balance;
}

@utility content-grid {
  display: grid;
  grid-template-columns:
    [full-start] minmax(1rem, 1fr)
    [content-start] min(65ch, 100% - 2rem)
    [content-end] minmax(1rem, 1fr)
    [full-end];
}

@utility scrollbar-hidden {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### Custom Variants

```css
@variant hocus (&:hover, &:focus-visible);
@variant group-hocus (group:hover &, group:focus-visible &);

/* Usage: class="hocus:text-primary-500" */
```

### Dark Mode

```css
@import "tailwindcss";

/* Class-based dark mode (default in v4) */
@variant dark (&:where(.dark, .dark *));

@theme {
  --color-surface: oklch(0.99 0 0);
  --color-surface-dark: oklch(0.15 0 0);
  --color-text: oklch(0.1 0 0);
  --color-text-dark: oklch(0.95 0 0);
}
```

### Component Layer

```css
@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-md px-md py-sm;
    @apply text-sm font-medium transition-colors;
    @apply focus-visible:outline-2 focus-visible:outline-offset-2;
  }

  .btn-primary {
    @apply btn bg-primary-500 text-white;
    @apply hover:bg-primary-700;
    @apply focus-visible:outline-primary-500;
  }
}
```

### Migration from v3

```
v3 (tailwind.config.js)          → v4 (CSS @theme)
─────────────────────────────────────────────────────
theme.colors.primary             → --color-primary-*
theme.spacing                    → --spacing-*
theme.fontFamily.sans            → --font-sans
theme.borderRadius.lg            → --radius-lg
theme.screens.md                 → --breakpoint-md
plugins[]                        → @utility / @variant in CSS
content: [...]                   → automatic detection
darkMode: 'class'                → @variant dark (default)
```
