---
type: subskill
title: "Subskill: Performance (build + runtime + bundle)"
---

# Subskill: Performance (build + runtime + bundle)

Three separate performance domains. Don't confuse them.

## Build/compiler speed

- **`skipLibCheck: true`**: skips type-checking dependency `.d.ts`. Big speed win; tradeoff is hidden dep type bugs. Fine for apps.
- **`incremental: true`** + `tsBuildInfoFile`: reuse prior check results.
- **Project references** (`composite: true`, `tsc --build`): parallel, incremental monorepo builds. Only rebuild changed packages.
- **`isolatedDeclarations: true`**: `.d.ts` generated per-file without the full type graph -> parallelizable, much faster lib builds. Requires annotated public exports.
- **Avoid deep recursive/conditional types**: they blow up check time and editor responsiveness. If the editor lags, a type is too clever.
- Type-check (`tsc --noEmit`) separately from transpile (esbuild/swc/Bun). Transpilers are 10-100x faster but don't type-check; run both.

## Runtime performance

- Types are erased; they cost nothing at runtime. Runtime perf is a JavaScript problem, not a TS one.
- Hot paths: avoid allocations in loops, prefer `for` over `.map/.filter` chains when it's hot (each creates an array), reuse objects.
- `structuredClone` for deep copy; spread for shallow. Don't `JSON.parse(JSON.stringify())` (slow, lossy).
- Lazy-init expensive things. Cache pure computations. Measure with `--prof` / `clinic` / `node --cpu-prof`, don't guess.
- Async: parallelize independent awaits with `Promise.all` (a common 3x-5x win over sequential awaits).

## Bundle size (frontend/edge)

- **valibot over Zod** when bundle matters (tree-shakeable, modular).
- `import type` so type-only imports are fully erased (verbatimModuleSyntax enforces).
- Named exports + tree-shaking; avoid barrel files (`index.ts` re-exporting everything) that defeat tree-shaking.
- No `enum` (emits runtime code); `as const` unions are zero-runtime.
- Analyze with the bundler's visualizer before optimizing. Measure the actual bytes.

## The rule

Measure before optimizing, in the RIGHT domain. "The build is slow" (compiler), "the app is slow" (runtime JS), and "the bundle is huge" (tree-shaking/deps) are three different problems with three different tools. A senior identifies which one before touching anything.
