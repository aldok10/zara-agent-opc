---
type: subskill
title: "Bundler Migration"
---

# Bundler Migration

## Activation

Migrating from Webpack to Vite or Rspack, CJS to ESM conversion, legacy build modernization.

## Core Principles

- Rspack: drop-in Webpack replacement (same config API, 10x faster). Choose when Webpack plugins needed.
- Vite: different paradigm (no-bundle dev, Rollup build). Choose for new-ish codebases.
- Migration is incremental. Don't rewrite everything at once.
- CJS → ESM is the hardest part. Start with source, then config files.

## Decision: Vite vs Rspack

| Factor | Choose Vite | Choose Rspack |
|--------|------------|---------------|
| Project age | < 3 years, modern deps | Legacy, many Webpack plugins |
| CJS deps | Few or none | Many, hard to replace |
| Custom Webpack plugins | None | Critical ones exist |
| Dev experience priority | High (instant HMR) | Medium (fast enough) |
| Team familiarity | New team / greenfield-ish | Existing Webpack expertise |
| SSR needs | Vite Environment API | Webpack-compatible SSR |
| Migration budget | Large (refactor OK) | Small (drop-in swap) |

## Migration Steps: Webpack → Vite

### Phase 1: Audit
```bash
# List all Webpack plugins and loaders
grep -r "require\|plugin\|loader" webpack.config.* | sort -u

# Check for CJS-only deps
npx publint --check-imports # or manually check "type" field in deps
```

### Phase 2: Prepare Source
1. Convert all `require()` to `import` in source code
2. Replace `module.exports` with `export`
3. Change `process.env.X` to `import.meta.env.VITE_X` (client code)
4. Update asset imports (Vite handles differently: `?url`, `?raw`, `?worker`)

### Phase 3: Config Translation

| Webpack | Vite Equivalent |
|---------|----------------|
| `entry` | `build.rollupOptions.input` |
| `output.publicPath` | `base` |
| `resolve.alias` | `resolve.alias` (same) |
| `module.rules` (loaders) | Plugins (most built-in) |
| `DefinePlugin` | `define` |
| `HtmlWebpackPlugin` | Built-in `index.html` |
| `MiniCssExtractPlugin` | Built-in CSS handling |
| `copy-webpack-plugin` | `vite-plugin-static-copy` |
| `webpack-dev-server.proxy` | `server.proxy` |
| `splitChunks` | `build.rollupOptions.output.manualChunks` |

### Phase 4: Incremental Switch
```typescript
// Start with Vite config that mirrors Webpack behavior
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',            // from Webpack resolve.alias
      'assets': '/src/assets',
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000', // from devServer.proxy
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
});
```

## Migration Steps: Webpack → Rspack

```javascript
// rspack.config.js  -  nearly identical to webpack.config.js
const { defineConfig } = require('@rspack/cli');

module.exports = defineConfig({
  entry: './src/index.ts',
  // Most Webpack config works as-is
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader', // Replace ts-loader/babel-loader
          options: { jsc: { parser: { syntax: 'typescript', tsx: true } } },
        },
      },
    ],
  },
  plugins: [
    new require('@rspack/plugin-html').HtmlRspackPlugin({
      template: './index.html',
    }),
  ],
});
```

## Common Issues

| Problem | Solution |
|---------|----------|
| `require is not defined` | Convert to ESM import |
| `__dirname` not available | Use `import.meta.dirname` (Node 21+) or `fileURLToPath` |
| CSS modules different format | Vite uses `.module.css` convention |
| Environment variables missing | Prefix with `VITE_` for client exposure |
| Webpack-specific imports (`-loader`) | Remove, use Vite plugins |
| `global` not defined | Add `define: { global: 'globalThis' }` |

## Anti-patterns

- Big-bang migration  -  high risk. Run both in parallel first.
- Keeping `process.env` in client code  -  breaks in Vite dev.
- Not testing production build  -  dev works but build fails.
- Ignoring bundle size regression after migration.
