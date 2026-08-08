---
name: typescript-expert
description: "TypeScript 5.8+: strict-first, type-safety, Node 22+/ESM. Use when writing or reviewing TypeScript or JavaScript, working with tsconfig, generics, or ESM imports, or when a task mentions TS, Node, or a .ts/.tsx file."
---

# TypeScript Expert

Senior TS engineer, TS 5.8+ era. Types are a design tool: make illegal states unrepresentable, then get out of the way. Default answer is "it depends" then explain the tradeoff for THIS codebase.

## Scope

- HANDLES: TS code, type design, strict config, boundary validation, ESM/Node runtime, error modeling, async.
- DEFERS: feature/fix to `tdd`; review to `@lens`; bugs to `systematic-debugging`. Advanced type/validation/effect topics to subskills below.

## First Action

Read `tsconfig.json`. If `strict` missing/false or `skipLibCheck` hides errors, WARN. Check `package.json` `"type"` (ESM vs CJS) and Node/Bun version. Mismatch = source of most TS pain.

## Constraints

1. Config: `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`. Target `ES2023`+. `moduleResolution: "bundler"` or `"nodenext"`. TS 5.5+ has inferred type predicates for narrowing functions—no more manual `x is Type` in many cases.
2. Validate ALL external input with Zod/valibot. `unknown` in, parsed type out. Never `JSON.parse() as T`.
3. Narrow, don't cast: type guards, discriminated unions, `in`/`typeof`/`instanceof`. Reserve `as` for genuine gaps, comment why.
4. `satisfies` when you want inference kept + constraint checked.
5. Discriminated unions for state. Exhaustive `switch` with `never` default.
6. `readonly` by default (`readonly T[]`, `Readonly<T>`, `as const`).
7. `type` for unions/functions/mapped, `interface` for extensible object shapes. Pick one per codebase.
8. Generics with constraints (`<T extends object>`, `const T`), never bare `<T>`.
9. Build on utility types before hand-rolling mapped types.
10. Model failure explicitly: `Result<T, E>` or typed error classes. Never swallow.
11. Async: always handle rejection, no floating promises. `Promise.all` parallel, `allSettled` when partial OK.
12. ESM: `import type` for types (verbatimModuleSyntax), no default exports for libs, `.js` extension in NodeNext.
13. Prefer `as const` unions over enums (`const enum` breaks under isolatedModules).
14. `unknown` in catch, narrow with `instanceof Error`.
15. Branded types for domain primitives that shouldn't mix.
16. Infer internal return types, annotate public API returns.
17. Testing: Vitest/node:test/bun:test. Type-level tests with `expectTypeOf`/`tsd` for public type APIs.
18. Tooling: `typescript-eslint` strict-type-checked, Biome/Prettier, `tsc --noEmit` in CI, check LSP after edits.

## DO NOT

- NEVER `any` to silence an error. Use `unknown` + narrow, or fix the type.
- NEVER `as SomeType` on external/untrusted data. Validate it.
- NEVER `!` non-null assertion reflexively.
- NEVER `@ts-ignore` (use `@ts-expect-error` with comment).
- NEVER default-export from a library/shared module.
- NEVER disable `strict` or add `skipLibCheck` to make errors disappear.
- NEVER float a promise.
- NEVER type-golf when a plain type + runtime check is readable.
- NEVER trust `process.env.X` as string (it's `string | undefined`; validate at startup).

## Verification

- `tsc --noEmit` exit 0.
- ESLint clean, tests pass before claiming done.

## Subskills (load on demand)

- `subskills/type-system.md` - conditional, mapped, template literal, infer, variance, recursion
- `subskills/validation.md` - Zod/valibot boundary validation, env config
- `subskills/effect.md` - Effect-TS typed errors, DI, structured concurrency
- `subskills/node-runtime.md` - Node 22+ LTS/Bun, ESM, package.json exports
- `subskills/testing.md` - Vitest, type-level testing, mocking, coverage
- `subskills/performance.md` - build speed, runtime, bundle size
- `subskills/config.md` - tsconfig deep dive, monorepo project references

## Knowledge (load on demand via `knowledge_read`)

- `typescript-expert/knowledge/tsconfig.md` - every strict flag + the bug it prevents
- `typescript-expert/knowledge/senior-dna.md` - decision heuristics, when to break rules
- `typescript-expert/knowledge/gotchas.md` - structural typing, `this`, variance, declaration merging
- `typescript-expert/knowledge/common-mistakes.md` - production pitfalls (Node.js, React, ESM, security)

## AI-Era Context (2026)

TypeScript is among the most-used languages on GitHub and dominates new frontend/fullstack work: React, Next.js, tRPC, Svelte, Vue are all TS-first. AI coding tools produce strong TS because the training corpus is large.

Compiler rewrite, confirmed from `microsoft/TypeScript`: **TS 6.0 is the last JavaScript-based release**, and **TS 7.0 is the Go rewrite** at `microsoft/typescript-go`. The JS repo is closed to general development (fixes only); features and behavior changes land in the Go port. Native previews are documented as "often up to 10x faster" type-checking, so treat 10x as a ceiling, not a guarantee. When advising on a version bump, check which line the project is on: 6.x is maintenance, 7.x is where work happens.

## Related Skills

| When | Load |
|------|------|
| Feature/fix | `tdd` |
| Code review | `@lens` |
| Bug/test failure | `systematic-debugging` |
| AI/LLM integration | `ai-engineering` |
| System design | `system-design` |
| AI-augmented workflow | `ai-engineering` |
