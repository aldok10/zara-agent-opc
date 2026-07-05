---
type: subskill
title: "Vite"
---

# Vite

## Activation

Vite configuration, plugins, Environment API, library mode, HMR, dev server, build optimization, SSR.

## Core Principles

- Vite 6 uses native ESM in dev (no bundling). Build uses Rollup.
- Environment API (Vite 6): separate config for client, SSR, and custom environments.
- Plugins are Rollup-compatible with Vite-specific hooks (`configureServer`, `transformIndexHtml`).
- Library mode for packages: dual ESM/CJS output, externalize deps.
- HMR boundary = module that accepts updates. React: `react-refresh`. Vue: `@vitejs/plugin-vue`.

## Decision Table

| Need | Solution |
|------|----------|
| React project | `@vitejs/plugin-react-swc` (faster) or `@vitejs/plugin-react` |
| Vue project | `@vitejs/plugin-vue` |
| Svelte project | `@sveltejs/vite-plugin-svelte` |
| Path aliases | `resolve.alias` in config |
| Environment variables | `import.meta.env.VITE_*` (client), `process.env.*` (server) |
| Build library | `build.lib` config |
| Multi-page app | `build.rollupOptions.input` with multiple entries |
| Custom dev server middleware | `configureServer` plugin hook |
| SSR | Environment API or `vite.ssrLoadModule` |
| WASM | `vite-plugin-wasm` |
| SVG as components | `vite-plugin-svgr` (React) |
| Bundle analysis | `rollup-plugin-visualizer` |

## Patterns

### Plugin Authoring

```typescript
import type { Plugin } from 'vite';

function myPlugin(options: MyPluginOptions): Plugin {
  return {
    name: 'my-plugin',
    enforce: 'pre', // 'pre' | 'post' | undefined

    // Vite-specific hooks
    configureServer(server) {
      server.middlewares.use('/api', customMiddleware);
    },

    // Rollup-compatible hooks
    transform(code, id) {
      if (!id.endsWith('.custom')) return null;
      return { code: transformCustomFile(code), map: null };
    },

    // HTML transformation
    transformIndexHtml(html) {
      return html.replace('<!-- inject -->', '<script>...</script>');
    },
  };
}
```

### Environment API (Vite 6)

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
        rollupOptions: { input: 'src/entry-client.ts' },
      },
    },
    ssr: {
      build: {
        outDir: 'dist/server',
        rollupOptions: { input: 'src/entry-server.ts' },
      },
      resolve: {
        conditions: ['node'],
      },
    },
  },
});
```

### Library Mode

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', /^react\//],
    },
  },
});
```

### Chunk Strategy

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

## Anti-patterns

- Using `require()` in Vite projects  -  breaks ESM.
- `process.env` in client code  -  use `import.meta.env`.
- Large `manualChunks` that bundle unrelated code together.
- Missing `external` in library mode  -  bundles peer deps.
- Not setting `sideEffects: false`  -  prevents tree-shaking.
