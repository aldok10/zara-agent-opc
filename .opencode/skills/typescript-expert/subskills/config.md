# Subskill: tsconfig deep dive & monorepo

See `../knowledge/tsconfig.md` for the annotated baseline config and the flags people get wrong. This subskill covers structure decisions.

## Layered configs

```
tsconfig.base.json    # all strict flags, shared compilerOptions, no files
tsconfig.json         # extends base, project-specific include/paths
tsconfig.build.json   # extends, for emit (declaration, outDir), excludes tests
```
Editor and CI use `tsconfig.json`; build uses `tsconfig.build.json`. Keeps test files type-checked in editor but out of shipped output.

## Monorepo: project references

```jsonc
// root
{ "files": [], "references": [{ "path": "packages/core" }, { "path": "packages/api" }] }
// packages/core/tsconfig.json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "composite": true, "outDir": "dist", "rootDir": "src" } }
// packages/api references core
{ "references": [{ "path": "../core" }] }
```
- `tsc --build` (or `-b`): incremental, parallel, topologically ordered. Only rebuilds changed + dependents.
- `composite: true` is required for referenced projects; forces `declaration: true`.
- Pair with `isolatedDeclarations` for fastest `.d.ts` gen.

## Path aliases

```jsonc
"paths": { "@core/*": ["packages/core/src/*"] }
```
- Works for type-checking. Runtime needs the bundler/runtime to resolve them too (`tsconfig-paths`, Vite alias, or `imports` field in package.json). A common "works in editor, breaks at runtime" trap: aliases are a tsc-only fiction unless the runtime is told.
- Prefer package.json `"imports"` (`#core/*`) for runtime-real aliases in Node.

## Strictness ladder for adoption

Turning on strictness in a legacy repo: see `../knowledge/senior-dna.md` "strictness ladder". Never flip all at once; climb flag by flag, fix with `@ts-expect-error` as tracked TODOs.

## Per-runtime baseline

- **App on Node 24+**: `module/moduleResolution: nodenext`, `target: es2023`, `noEmit` (bundler emits) or `outDir`.
- **Library**: add `declaration`, `isolatedDeclarations`, `exports` map in package.json, ESM-only if possible.
- **Frontend (Vite)**: `moduleResolution: bundler`, `noEmit`, `lib: ["es2023", "dom", "dom.iterable"]`, `jsx` if React.
- **Bun**: `moduleResolution: bundler`, Bun runs TS directly.
