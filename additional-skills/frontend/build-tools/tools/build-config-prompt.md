---
type: tool
title: "Build Configuration Review"
---

# Build Configuration Review

## Purpose

Analyze and review frontend build configuration for correctness, performance, and production readiness. Covers Vite, webpack, esbuild, Rollup, and related tooling.

## When to Use

- Setting up or modifying build configuration
- Debugging build output size or performance
- Evaluating tree-shaking effectiveness
- Migrating between build tools
- Optimizing dev server or HMR performance

## Prompt Template

Given the following build configuration:

```
[paste vite.config.ts / webpack.config.js / esbuild config / etc.]
```

And package.json (relevant sections):

```
[paste dependencies/scripts sections]
```

Review for:

1. **Output Optimization**: Is tree-shaking effective? Are chunks split appropriately? Is dead code eliminated? Are externals configured for libraries?
2. **Asset Handling**: Are images/fonts optimized? Is CSS extracted and minimized? Are source maps configured correctly per environment?
3. **Module Resolution**: Are aliases configured? Is the resolve strategy correct? Are barrel files causing bundle bloat?
4. **Dev Experience**: Is HMR working efficiently? Are dev-only plugins excluded from production? Is the dev server configured well?
5. **Environment Config**: Are env variables handled safely? Is sensitive data excluded from client bundles? Are feature flags tree-shakeable?
6. **Compatibility**: Is the target configured for supported browsers? Are polyfills included only when needed?
7. **Caching**: Are content hashes in filenames? Is the chunk strategy stable across builds?

Context:
- Tool: [Vite/webpack/esbuild/Rollup/Turbopack]
- Framework: [React/Vue/Angular/Svelte/vanilla]
- Deploy target: [static/SSR/edge]

## Output Format

```
## Configuration Review

### Issues
- [severity] [setting]  -  [problem]  -  [fix]

### Bundle Optimization
- Current: [observations about output]
- Recommendations: [specific changes]

### Missing Configuration
- [what should be added and why]

### Security
- [env/secrets exposure risks]

### Verdict
[production-ready / needs fixes / major rework needed]
```
