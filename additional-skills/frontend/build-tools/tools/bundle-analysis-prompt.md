---
type: tool
title: "Bundle Size Analysis"
---

# Bundle Size Analysis

## Purpose

Analyze and reduce JavaScript bundle size through tree-shaking audit, code splitting strategy, and dependency optimization. Identifies bloat sources and provides actionable reduction paths.

## When to Use

- Initial load time exceeding performance budgets
- Bundle size growing after adding dependencies
- Evaluating tree-shaking effectiveness
- Designing code splitting boundaries
- Comparing bundler output before/after changes

## Prompt Template

```
CONTEXT:
- Bundler: [webpack | Vite/Rollup | esbuild | Turbopack | Parcel]
- Framework: [React | Vue | Svelte | Angular | Next.js | Nuxt]
- Current bundle: [total size gzipped, main chunk size]
- Performance budget: [target KB for initial load]
- Analysis tool: [webpack-bundle-analyzer | source-map-explorer | bundlephobia]
- Deployment: [CDN | edge | origin server]
- Target browsers: [modern only | legacy support needed]

ANALYSIS STEPS:
1. Size audit
   - Identify largest chunks and their contents
   - Dependency size contribution (direct vs transitive)
   - Duplicate modules across chunks
   - Dead code included despite tree-shaking

2. Tree-shaking effectiveness
   - ESM vs CJS dependencies (CJS blocks tree-shaking)
   - Side effects in package.json (sideEffects: false)
   - Barrel file re-exports pulling entire packages
   - Dynamic imports that defeat static analysis

3. Code splitting strategy
   - Route-based splitting (lazy routes)
   - Component-based splitting (heavy components)
   - Vendor chunk strategy (framework vs app code)
   - Shared chunks (common code across routes)
   - Prefetch/preload hints for likely navigation

4. Dependency optimization
   - Replace heavy deps with lighter alternatives
   - Partial imports (lodash/get vs lodash)
   - Date library choice (date-fns vs moment vs Temporal)
   - Icon library subsetting
   - Polyfill reduction (target modern browsers)

5. Asset optimization
   - Image format (WebP, AVIF) and lazy loading
   - Font subsetting and display strategy
   - CSS extraction and critical CSS inlining
   - SVG optimization and spriting

6. Build configuration
   - Minification (terser vs esbuild)
   - Compression (gzip vs brotli)
   - Module/nomodule for differential serving
   - External CDN for large stable deps

MEASUREMENT:
- Size tracking in CI (fail on budget exceed)
- Lighthouse performance score
- Real User Monitoring (FCP, LCP correlation with bundle size)
```

## Output Format

```
## Bundle Analysis: [project name]

### Size Breakdown
| Chunk | Size (gzip) | Contents | Opportunity |
|-------|-------------|----------|-------------|
| ... | ... | ... | ... |

### Top Offenders
| Package | Size Impact | Used Features | Alternative |
|---------|-------------|---------------|-------------|
| ... | ... | ... | ... |

### Reduction Plan
| Action | Size Saved | Effort | Risk |
|--------|-----------|--------|------|
| ... | ... | low/med/high | ... |

### Code Splitting Boundaries
[Route/component split diagram]

### Budget Enforcement
- Target: [KB per chunk type]
- CI check: [tool and configuration]

### Expected Results
- Before: [total gzipped]
- After: [projected total with all optimizations]
- Initial load improvement: [percentage]
```
