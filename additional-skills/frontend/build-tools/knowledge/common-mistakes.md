---
type: pitfall
title: "10 Build Tool Mistakes"
---

# 10 Build Tool Mistakes

## 1. Not Externalizing Peer Dependencies in Library Mode

**Wrong**: Library bundles React/Vue into output. Consumers get duplicate framework.
**Right**: `build.rollupOptions.external: ['react', 'react-dom', /^react\//]`
**Impact**: 2x bundle size, runtime errors from multiple React instances.

## 2. Missing `sideEffects: false` in package.json

**Wrong**: Omitting `sideEffects` field. Bundlers can't tree-shake unused exports.
**Right**: `"sideEffects": false` or `"sideEffects": ["*.css", "./src/polyfills.ts"]`
**Impact**: Dead code shipped to production. 10-40% larger bundles.

## 3. Using `process.env` in Client Code (Vite)

**Wrong**: `process.env.API_URL`  -  undefined at runtime in Vite dev.
**Right**: `import.meta.env.VITE_API_URL` for client. Only `VITE_` prefixed vars exposed.
**Impact**: Silent undefined values, broken API calls, hard-to-debug production issues.

## 4. No Bundle Size Budget

**Wrong**: No monitoring. Bundle grows 50KB per sprint. Nobody notices.
**Right**: `bundlesize` or `size-limit` in CI. Alert on regression > 5KB.
**Impact**: Gradual performance degradation. Death by a thousand imports.

## 5. Barrel Files Without Tree-Shaking Awareness

**Wrong**: `export * from './ComponentA'` in `index.ts` for 50+ components.
**Right**: Direct imports `from './components/Button'` or ensure bundler handles barrel correctly.
**Impact**: Importing one component pulls entire library into bundle.

## 6. Duplicate Dependencies in Monorepo

**Wrong**: Same dep at different versions across packages. Multiple copies bundled.
**Right**: `pnpm dedupe`, shared version in root `package.json`, `pnpm.overrides` for conflicts.
**Impact**: Larger bundles, version conflicts, subtle bugs from mixed versions.

## 7. No Chunk Strategy

**Wrong**: Default chunking. Everything in one 2MB JS file, or 200 tiny chunks.
**Right**: Explicit `manualChunks`: vendor, framework, per-route, shared.
**Impact**: Poor caching (any change invalidates everything) or request waterfalls.

## 8. Ignoring Production Build in Dev

**Wrong**: Only running `dev` during development. Build fails at deploy time.
**Right**: Run `build` in CI on every PR. Different codepaths in dev vs build.
**Impact**: Friday night deploy failures. Dev/prod divergence.

## 9. Eager Loading Module Federation Shared Deps

**Wrong**: `eager: true` on all shared dependencies.
**Right**: `eager: true` only for bootstrap deps. Rest loaded async.
**Impact**: Eliminates code-splitting benefit. Initial load includes everything.

## 10. Not Using Remote Caching in Monorepo CI

**Wrong**: Every CI run rebuilds every package from scratch.
**Right**: Turborepo remote caching (Vercel or self-hosted). Only rebuild what changed.
**Impact**: 10-30 minute CI runs that could be 2-5 minutes. Wasted compute cost.
