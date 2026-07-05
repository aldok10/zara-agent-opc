---
type: tool
title: "Design Token Architecture"
---

# Design Token Architecture

## Purpose

Design a scalable token system for design systems covering naming conventions, theming structure, multi-brand support, and token distribution. Ensures consistent styling across platforms and themes.

## When to Use

- Creating a design token system from scratch
- Adding dark mode or multi-theme support
- Supporting multiple brands with shared components
- Migrating from hardcoded values to tokens
- Choosing token tooling (Style Dictionary, Figma Tokens, etc.)

## Prompt Template

```
CONTEXT:
- Platforms: [web | iOS | Android | multi-platform]
- Framework: [React | Vue | Angular | native | cross-platform]
- Styling approach: [CSS custom properties | Tailwind | styled-components | vanilla-extract]
- Brands: [single | multi-brand (count)]
- Themes: [light/dark | light/dark/high-contrast | per-brand themes]
- Token tool: [Style Dictionary | Tokens Studio | custom | none yet]
- Source of truth: [Figma | design spec | code-first]

TOKEN ARCHITECTURE:
1. Token tiers
   - Global tokens: raw values (color-blue-500: #3b82f6)
   - Alias/semantic tokens: intent-based (color-primary: {color-blue-500})
   - Component tokens: scoped (button-background: {color-primary})

2. Naming conventions
   - Structure: [category]-[property]-[variant]-[state]
   - Examples: color-text-primary, spacing-md, radius-lg
   - Platform awareness: camelCase (JS) vs kebab-case (CSS)
   - Avoid: numbers without meaning, ambiguous names

3. Categories
   - Color: brand, neutral, semantic (success/warning/error/info)
   - Typography: font family, size scale, weight, line-height, letter-spacing
   - Spacing: consistent scale (4px or 8px base)
   - Border: radius, width, style
   - Shadow: elevation levels
   - Motion: duration, easing curves
   - Breakpoints: layout shift points
   - Z-index: layer system

4. Theming strategy
   - CSS custom properties for runtime theming
   - Token override at semantic layer (not global)
   - Theme detection: system preference, user choice, time-based
   - Reduced motion: separate motion token set
   - High contrast: meet WCAG AAA for forced-colors

5. Multi-brand architecture
   - Shared: component tokens reference semantic tokens
   - Branded: semantic tokens resolve differently per brand
   - Override layers: base -> brand -> theme -> density
   - Build pipeline: same components, different token resolution

6. Distribution
   - Build: Style Dictionary transforms per platform
   - Output: CSS variables, JSON, Swift/Kotlin constants
   - Versioning: semantic versioning for token packages
   - Documentation: auto-generated token reference
   - Sync: Figma <-> code bidirectional (Tokens Studio)

ANTI-PATTERNS:
- Component-specific tokens at global level (pollutes namespace)
- Hard-coding hex values in components instead of using tokens
- Theme-specific tokens without fallback
- Too many token tiers (3 is usually sufficient)
- Naming that encodes visual properties (color-red) at semantic tier
```

## Output Format

```
## Token Architecture: [system name]

### Token Tiers
[Diagram showing global -> semantic -> component resolution]

### Naming Convention
| Category | Pattern | Example |
|----------|---------|---------|
| color | color-[role]-[variant] | color-text-secondary |
| spacing | spacing-[size] | spacing-md |
| ... | ... | ... |

### Theme Structure
| Token | Light | Dark | High Contrast |
|-------|-------|------|---------------|
| ... | ... | ... | ... |

### Multi-Brand Resolution
[How the same component resolves tokens for different brands]

### File Structure
[Token file organization]

### Build Pipeline
1. [Source format and location]
2. [Transformation steps]
3. [Output formats and targets]
4. [Distribution method]

### Migration Path (if applicable)
- [Steps to adopt tokens in existing codebase]
```
