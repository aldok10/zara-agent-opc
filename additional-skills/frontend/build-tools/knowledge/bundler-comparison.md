---
type: fact
title: "Bundler Comparison 2026"
---

# Bundler Comparison 2026

## Feature Matrix

| Feature | Vite 7+ | Turbopack | esbuild | Rspack |
|---------|---------|-----------|---------|--------|
| Language | Rust (via Rolldown) | Rust | Go | Rust |
| HMR Speed | ~10ms | ~5ms | N/A (no HMR) | ~15ms |
| Production Build | Rolldown | Webpack compat | Native | Webpack compat |
| Tree Shaking | Full | Full | Limited | Full |
| Code Splitting | Automatic + manual | Automatic | Manual only | Automatic + manual |
| CSS Modules | Built-in | Built-in | Plugin | Built-in |
| Plugin Ecosystem | Rollup/Vite plugins | Webpack loaders | Limited | Webpack loaders |
| Config Complexity | Low | Medium | Low | Medium |
| SSR Support | First-class | Next.js only | Manual | Plugin-based |
| Module Federation | Via plugin | Built-in | No | Built-in |

## When to Choose What

### Vite 7+ (with Rolldown)
- Default choice for new projects (React, Vue, Svelte, Solid)
- Best DX with minimal configuration
- Rolldown replaces esbuild+Rollup with single Rust toolchain
- Environment API for multi-target builds (client, SSR, worker)

### Turbopack
- Next.js projects exclusively
- Tightest integration with React Server Components
- Incremental computation model (caches at function level)
- Not usable outside Next.js ecosystem

### esbuild
- Library bundling where speed matters and features don't
- Simple transforms (TS → JS) in CI pipelines
- Embedded as a sub-tool (Vite used it pre-Rolldown)
- No code splitting in CJS output, limited CSS handling

### Rspack
- Migrating large Webpack projects incrementally
- Need Webpack loader/plugin compatibility
- Teams with heavy Webpack config investment
- Drop-in replacement: change `webpack` → `@rspack/core`

## Migration Paths

### Webpack → Rspack
```js
// rspack.config.js — mostly identical to webpack.config.js
const { RspackPlugin } = require('@rspack/core');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      // existing webpack loaders work as-is
      { test: /\.tsx?$/, use: 'builtin:swc-loader' }  // replace ts-loader
    ]
  }
};
```
Migration steps:
1. Replace `webpack` dependency with `@rspack/core`
2. Replace `ts-loader`/`babel-loader` with `builtin:swc-loader`
3. Remove `terser-webpack-plugin` (built-in minification)
4. Test — most configs work without changes

### Webpack → Vite
```js
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' }  // migrate webpack aliases
  }
});
```
Migration steps:
1. Move `index.html` to project root, add `<script type="module" src="/src/main.tsx">`
2. Replace `process.env.X` with `import.meta.env.X`
3. Convert CommonJS to ESM imports
4. Replace webpack-specific loaders with Vite plugins
5. Remove `webpack.config.js`, add `vite.config.ts`

### CRA → Vite
1. Remove `react-scripts` dependency
2. Add `vite`, `@vitejs/plugin-react`
3. Move `public/index.html` → root `index.html`
4. Replace `%PUBLIC_URL%` with empty string
5. Rename `.env` vars: `REACT_APP_` → `VITE_`
6. Update scripts: `vite` (dev), `vite build` (build), `vite preview` (serve)

## Performance Benchmarks (2026, 10k module project)

| Metric | Vite 7 | Turbopack | esbuild | Rspack |
|--------|--------|-----------|---------|--------|
| Cold Start | 380ms | 290ms | 150ms | 420ms |
| HMR (leaf) | 12ms | 6ms | — | 18ms |
| HMR (root) | 85ms | 45ms | — | 110ms |
| Prod Build | 4.2s | 5.1s | 2.8s | 4.8s |
| Bundle Size | 142KB | 148KB | 156KB | 144KB |

Notes:
- esbuild fastest raw speed but lacks HMR and advanced optimizations
- Turbopack HMR fastest due to incremental computation graph
- Vite 7 production now single-pass (Rolldown), closing gap with esbuild
- Rspack slightly slower but offers best Webpack compatibility

## Key Trends 2026

1. **Rust dominance**: Vite (Rolldown), Turbopack, Rspack all Rust-based
2. **esbuild declining**: Role shrinking as Rust tools mature
3. **Webpack maintenance-only**: No new features, community migrating
4. **Environment-aware builds**: Multi-target (browser, SSR, edge) from single config
5. **Module Federation v2**: Rspack and Turbopack both support micro-frontend sharing
