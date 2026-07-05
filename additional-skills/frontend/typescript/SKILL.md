---
name: typescript
description: "TypeScript 5.5-7.0 for frontend: strict types, patterns, generics, branded types, config"
---

# TypeScript Frontend

Type-safe frontend development with TypeScript 5.5+. Strict-first, pattern-driven, zero `any`.

## Scope

Frontend TypeScript: component props, state machines, API types, form handling, domain modeling, config optimization. Framework-agnostic patterns that apply to React, Vue, Svelte, Solid.

## First Action

1. Check `tsconfig.json` for strict mode and recommended flags
2. Identify type boundaries (API calls, form inputs, external data)
3. Apply appropriate pattern from knowledge base

## Constraints

1. `strict: true` always. Enable `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
2. `satisfies` over type assertion  -  validates without widening.
3. Discriminated unions for state machines and variant types.
4. Branded types for domain primitives (UserId, Email, Slug).
5. Template literal types for string patterns (routes, event names).
6. Generics: constrain with `extends`, `infer` for extraction. Max 3 type params.
7. Return types explicit on public APIs, inferred on internals.
8. `unknown` over `any` at boundaries (API responses, JSON.parse).
9. `const` assertions and `as const` for literal types.
10. No enums  -  use `const` objects with `as const` + value union type.
11. Type predicates (`x is T`) for reusable narrowing.
12. Zod/Valibot for runtime validation matching TS types at boundaries.
13. tsc-go (TS 7.0) is 10x faster - enables full type-check in CI without caching, pre-commit hooks viable.

## DO NOT

- Use `any` (use `unknown` + narrowing instead)
- Use enums (use const objects + union types)
- Assert with `as` to silence errors (fix the type instead)
- Over-engineer generics (max 3 type params, prefer simplicity)
- Skip null checks on optional chaining results
- Use `@ts-ignore` without a linked issue explaining why
- Export mutable state from modules

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Generic function/class, type inference, conditional types | `generics` |
| Domain IDs, validated strings, nominal types | `branded-types` |
| Pick/Omit/Record, mapped types, satisfies patterns | `utility-types` |
| tsconfig flags, module resolution, path aliases | `config` |

## Verification

1. `tsc --noEmit` passes with zero errors
2. No `any` in diff (search with `grep -n ': any'`)
3. Exported functions have explicit return types
4. Union types are exhaustively handled (switch with `never` default)
5. API boundaries use runtime validation (Zod/Valibot schema)

## Knowledge

- `knowledge/typescript55-features.md`  -  TS 5.5+ features and syntax
- `knowledge/type-patterns.md`  -  15 essential type patterns with code
- `knowledge/common-mistakes.md`  -  12 common mistakes with fixes

## AI-Era Context (2026)

- TypeScript 7.0 native Go compiler is 10x faster -- `tsc --noEmit` is now viable in pre-commit hooks
- AI generates types that are often too loose (`string` where branded type is needed, `any` at boundaries)
- Branded types (UserId, Email) prevent cross-domain mixing -- AI rarely generates these unprompted
- `satisfies` operator is preferred over `as` assertions; AI defaults to type assertions
- AI often generates enums which are discouraged -- use `as const` objects with union types instead

## Related Skills

- `react`  -  React-specific component typing
- `testing-strategy`  -  Type-safe test patterns
- `system-design`  -  API contract design
