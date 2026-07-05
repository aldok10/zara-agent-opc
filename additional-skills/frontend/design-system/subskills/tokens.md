---
type: subskill
title: "Design Tokens"
---

# Design Tokens

## Activation

Triggered when: creating/editing tokens, setting up Style Dictionary, generating CSS variables, multi-platform token output, or migrating to W3C format.

## Core Principles

- Tokens are the single source of truth for all visual decisions.
- Three layers: primitive (raw values) > semantic (purpose) > component (specific use).
- W3C Design Tokens Community Group format is the standard.
- Tokens generate output for all platforms (CSS, iOS, Android, Figma).

## W3C Design Tokens Format

```json
{
  "color": {
    "blue": {
      "500": {
        "$value": "#0055cc",
        "$type": "color"
      }
    }
  },
  "spacing": {
    "md": {
      "$value": "1rem",
      "$type": "dimension"
    }
  }
}
```

Key rules:
- `$value` holds the token value
- `$type` declares the type (color, dimension, fontFamily, fontWeight, duration, shadow, etc.)
- Groups are nested objects (no `$value` or `$type` on group level)
- References use `{path.to.token}` syntax: `"$value": "{color.blue.500}"`

## Token Types

| Type | Example values |
|------|---------------|
| `color` | `#0055cc`, `rgba(0,0,0,0.5)` |
| `dimension` | `16px`, `1rem`, `0.5em` |
| `fontFamily` | `"Inter, system-ui, sans-serif"` |
| `fontWeight` | `400`, `700` |
| `duration` | `200ms`, `0.3s` |
| `cubicBezier` | `[0.4, 0, 0.2, 1]` |
| `shadow` | `{ color, offsetX, offsetY, blur, spread }` |
| `typography` | composite: `{ fontFamily, fontSize, fontWeight, lineHeight, letterSpacing }` |
| `border` | composite: `{ color, width, style }` |
| `gradient` | array of color stops |

## Three-Layer Architecture

```
primitives/          <- Raw values (blue-500, space-4, font-sans)
  colors.json
  spacing.json
  typography.json

semantic/            <- Purpose (color-primary, space-inline-md, font-body)
  colors.json       References primitives: "$value": "{color.blue.500}"
  spacing.json
  typography.json

component/           <- Component-specific (button-bg, card-padding)
  button.json       References semantic: "$value": "{color.action.primary}"
  card.json
```

## Style Dictionary Setup

```js
// config.mjs
export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables',
        options: { outputReferences: true },
      }],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/js/',
      files: [{
        destination: 'tokens.mjs',
        format: 'javascript/es6',
      }],
    },
    typescript: {
      transformGroup: 'js',
      buildPath: 'dist/ts/',
      files: [{
        destination: 'tokens.d.ts',
        format: 'typescript/es6-declarations',
      }],
    },
  },
};
```

## CSS Custom Properties Output

```css
:root {
  /* Primitives */
  --color-blue-500: #0055cc;
  --color-gray-100: #f5f5f5;
  --space-4: 1rem;

  /* Semantic */
  --color-primary: var(--color-blue-500);
  --color-surface: var(--color-gray-100);
  --space-inline-md: var(--space-4);
}

/* Theme override */
[data-theme="dark"] {
  --color-primary: #66aaff;
  --color-surface: #1a1a1a;
}
```

## Token Naming Convention

Pattern: `{category}-{concept}-{property}-{variant}-{state}`

Examples:
- `color-action-background-primary-hover`
- `space-inline-md`
- `font-heading-size-lg`
- `shadow-elevation-md`
- `duration-animation-fast`

## Decision Table

| Need | Approach |
|------|----------|
| New color | Add primitive, create semantic alias, reference in component tokens |
| Theme support | Semantic tokens only change per theme; primitives stay constant |
| Platform output | Style Dictionary with platform-specific transforms |
| Token validation | JSON schema + CI check for broken references |
| Migration from hardcoded | Extract values to primitives, alias to semantic, replace in code |
| Figma sync | Tokens Studio plugin reads/writes W3C format |
