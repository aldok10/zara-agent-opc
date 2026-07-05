---
type: fact
title: "Vite 6-8 Features and Environment API"
---

# Vite 6-8 Features

## Environment API (Major Feature)

The Environment API is Vite 6's biggest addition. It replaces the previous `--mode` and `ssr` boolean approach with a unified, extensible environment system.

### Key Concepts

- **Environment**: a distinct execution context (client, SSR, worker, edge, custom).
- Each environment has its own module graph, plugin pipeline, and resolved config.
- Replaces: `ssr` boolean in plugin hooks, `--mode` for env switching.
- Framework authors use it to define custom environments (e.g., RSC, service worker).

### Configuration

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  environments: {
    client: {
      // Default client environment (browser)
      build: { outDir: 'dist/client' },
      optimizeDeps: { include: ['react', 'react-dom'] },
    },
    ssr: {
      // Server-side rendering environment
      build: { outDir: 'dist/server' },
      resolve: { conditions: ['node', 'import'] },
    },
    // Custom environments
    worker: {
      build: { outDir: 'dist/worker' },
      resolve: { conditions: ['worker', 'import'] },
    },
  },
});
```

### Plugin Hook Changes

```typescript
// Vite 5: ssr was a boolean
transform(code, id, options) {
  if (options?.ssr) { /* server transform */ }
}

// Vite 6: environment is explicit and extensible
transform(code, id) {
  if (this.environment.name === 'ssr') { /* server */ }
  if (this.environment.name === 'worker') { /* worker */ }
}
```

### Module Runner

```typescript
// Server-side: run modules in SSR environment
const runner = server.environments.ssr.runner;
const module = await runner.import('/src/entry-server.ts');
```

## Other Vite 6 Changes

### Default Changes
- `resolve.conditions` default now includes `'module'`
- JSON stringify default changed: `json.stringify: 'auto'`
- HTML asset references use `import` instead of side-effect

### Deprecations
- `server.middlewareMode: 'ssr'` → use Environment API
- `ssr.external` / `ssr.noExternal` → use `environments.ssr.resolve`
- `build.ssr` → use `environments.ssr.build`

### Performance
- Faster dep optimization with parallel processing
- Smaller dev server memory footprint per environment
- Better HMR with per-environment module graphs

## Migration from Vite 5

1. Move `ssr.*` config into `environments.ssr.*`
2. Update plugin hooks from `options.ssr` boolean to `this.environment.name`
3. Replace `server.ssrLoadModule` with `server.environments.ssr.runner.import`
4. Update `--mode` usage if using it for environment switching

## Vite 7 (June 2025)

- **Environment API stabilized**: no longer experimental, full public API surface.
- **Node.js 18 dropped**: requires Node 20.19+ or 22.12+.
- **ESM-only config**: `vite.config.ts` must use ESM (`import`/`export`). CJS config no longer supported.
- Deprecated APIs from Vite 5 fully removed (`server.middlewareMode: 'ssr'`, `ssr.external`, etc.).
- Default dev server port changed behavior (auto-increments when busy).

## Vite 8 (2025)

- **Rolldown replaces Rollup** as the production bundler  -  written in Rust, significantly faster builds.
- Backwards-compatible plugin API: most Rollup plugins work unchanged.
- Unified dev/prod pipeline: Rolldown also powers dev transforms (replaces esbuild for transforms).
- Tree-shaking and code-splitting improvements from Rolldown's architecture.

> **Note**: Vite 6 content above remains valid for Vite 6 projects. For Vite 7+ check Environment API changes; for Vite 8+ check Rolldown bundler behavior.
