---
type: subskill
title: "Theming"
---

# Theming

## Activation

Triggered when: implementing dark mode, multi-brand themes, runtime theme switching, or token-based color schemes.

## Core Principles

- Theme = semantic token override. Same token names, different values.
- CSS custom properties enable runtime switching without rebuild.
- Respect `prefers-color-scheme` as default, allow manual override.
- Store user preference in localStorage, sync with system changes.
- Semantic tokens reference primitives; themes only change semantic layer.

## CSS Variables Theming

```css
/* Base theme (light) */
:root {
  --color-bg: #ffffff;
  --color-surface: #f8f9fa;
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;
  --color-primary: #0055cc;
  --color-primary-hover: #003d99;
  --color-border: #e5e7eb;
  --color-focus: #0055cc;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Dark theme */
[data-theme="dark"] {
  --color-bg: #0f0f0f;
  --color-surface: #1a1a1a;
  --color-text: #f0f0f0;
  --color-text-muted: #9ca3af;
  --color-primary: #66aaff;
  --color-primary-hover: #88bbff;
  --color-border: #2d2d2d;
  --color-focus: #66aaff;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
}

/* System preference as default */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #0f0f0f;
    --color-surface: #1a1a1a;
    --color-text: #f0f0f0;
    --color-text-muted: #9ca3af;
    --color-primary: #66aaff;
    --color-primary-hover: #88bbff;
    --color-border: #2d2d2d;
    --color-focus: #66aaff;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  }
}
```

## Theme Switching (Vanilla JS)

```js
function getTheme() {
  return localStorage.getItem('theme') || 'system';
}

function setTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
}

// Apply saved theme on load (put in <head> to avoid flash)
(function() {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

// Listen for system changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    // System preference changed and user hasn't manually set theme
    // CSS media query handles it, but fire event for JS consumers
    document.dispatchEvent(new CustomEvent('themechange', { detail: e.matches ? 'dark' : 'light' }));
  }
});
```

## React Theme Provider

```tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) || 'system'
  );
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const resolve = (): ResolvedTheme => {
      if (theme !== 'system') return theme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };
    setResolved(resolve());

    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') setResolved(resolve()); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (t === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

## Multi-Brand Theming

```css
/* Brand A */
[data-brand="acme"] {
  --color-primary: #e63946;
  --color-primary-hover: #c1121f;
  --font-heading: 'Playfair Display', serif;
  --radius-md: 8px;
}

/* Brand B */
[data-brand="nova"] {
  --color-primary: #06d6a0;
  --color-primary-hover: #04a87e;
  --font-heading: 'Space Grotesk', sans-serif;
  --radius-md: 4px;
}
```

Combine with theme: `<html data-brand="acme" data-theme="dark">`

## Token-to-Theme Mapping

```
primitives/           <- Never changes per theme
  blue-500: #0055cc
  blue-300: #66aaff

semantic/light/       <- Light theme maps
  color-primary: {color.blue.500}

semantic/dark/        <- Dark theme maps
  color-primary: {color.blue.300}
```

## Anti-flash Script (Critical)

Place in `<head>` before any CSS:
```html
<script>
  (function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)})();
</script>
```

## Decision Table

| Need | Approach |
|------|----------|
| Light/dark toggle | `data-theme` attribute + CSS variables |
| System preference default | `prefers-color-scheme` media query + manual override |
| Multi-brand | Additional `data-brand` attribute layer |
| Prevent flash of wrong theme | Inline `<script>` in `<head>` |
| Token generation per theme | Style Dictionary with multiple output files |
| Component-level theme | CSS scope with nested variables (rare) |
| Third-party components | Override their CSS vars or wrap with token class |
