---
name: build-tools
description: "Frontend build tools: Vite 6-8, Turbopack, Rspack, monorepos, bundler config, module federation"
---

# Build Tools

## Scope

Frontend build tooling decisions, configuration, optimization, migration. Vite, Turbopack, Rspack, Webpack, Turborepo, pnpm workspaces, module federation.

## First Action

Identify the project type: greenfield (Vite 6), Next.js (Turbopack), legacy Webpack (Rspack migration), or monorepo (Turborepo + pnpm).

## Constraints

1. Vite 6 is default for new projects (non-Next.js).
2. Turbopack for Next.js dev. Rspack for Webpack migration path.
3. pnpm for package management. Strict mode. No phantom deps.
4. Turborepo for monorepo orchestration. Remote caching in CI.
5. Tree-shaking requires ESM. Mark `sideEffects: false` in package.json.
6. Bundle analysis on every major change (`rollup-plugin-visualizer` or `webpack-bundle-analyzer`).
7. Environment-specific config via Vite 6 Environment API (replaces `--mode`).

## DO NOT

- Use Webpack for new projects unless forced by framework constraints.
- Use `npm` or `yarn classic` for monorepos. pnpm workspaces only.
- Ship dev dependencies to production bundles.
- Use dynamic `import()` without chunk naming strategy.
- Disable tree-shaking or minification without documenting why.
- Use CJS in library output meant for modern consumers.

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| Vite config, plugins, library mode, HMR | `subskills/vite.md` |
| Monorepo, Turborepo, workspaces, internal packages | `subskills/monorepo.md` |
| Webpack to Vite/Rspack, legacy migration | `subskills/bundler-migration.md` |
| Module Federation, micro-frontends, shared deps | `subskills/module-federation.md` |

## Verification

- Production build succeeds: `vite build` / `next build` exit 0
- No CJS warnings in output
- Bundle size within budget (check with `npx vite-bundle-visualizer`)
- Tree-shaking working: unused exports not in output
- Dev server starts in < 3s (Vite) or < 5s (Turbopack)
- No duplicate dependencies in lockfile

## Knowledge

- `knowledge/vite6-features.md` - Vite 6 Environment API, new capabilities
- `knowledge/common-mistakes.md` - Top 10 build tool mistakes

## Related Skills

- `frontend/state-management` - Bundle size impacts from state libraries
- `typescript-expert` - tsconfig paths, project references for monorepos
