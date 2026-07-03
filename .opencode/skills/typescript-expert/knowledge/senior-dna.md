---
type: fact
title: "TypeScript Senior DNA"
---

# TypeScript Senior DNA

The judgment that separates a senior from someone who just knows syntax. This is the "when to break the rules" layer.

## The core mental model

TypeScript is **two languages stapled together**: a structural type system that runs at compile time and vanishes, and JavaScript that runs at runtime. Every bug category traces back to confusing the two. A senior always knows which world they're in.

- **Compile-time world**: types, generics, `interface`, `type`, `as`, `satisfies`. Gone at runtime. Cannot be trusted for anything the compiler didn't verify.
- **Runtime world**: values, `typeof`, `instanceof`, validators, actual data. This is what breaks in prod.

The boundary between them is where you validate. Untrusted data enters as `unknown`, gets parsed into a real type, and only then is trusted.

## Decision heuristics

**`type` vs `interface`**
- `interface`: object shapes, especially public APIs meant to be extended or that benefit from declaration merging. Better error messages for object types. Extendable.
- `type`: unions, intersections, tuples, function types, mapped/conditional types, anything not a plain object.
- Rule: pick one convention per codebase for object shapes and stick to it. The debate is 90% bikeshedding; consistency is the real win.

**When `as` is legitimate**
- Genuinely narrowing after a check the compiler can't follow (rare, comment it).
- `as const` for literal inference (always fine).
- `satisfies` almost always beats `as` when you want both inference and a constraint.
- Test doubles / mocks where full typing is noise.
- NEVER on data from JSON, network, env, files, or user. That's a parse, not a cast.

**When to reach for a validator (Zod/valibot)**
- Any data crossing a trust boundary: HTTP request/response, env vars, config files, DB rows (if untyped driver), message queue payloads, localStorage, user input.
- Parse once at the edge, derive the type with `z.infer`, trust it inside. One source of truth for shape + type.

**When NOT to over-type**
- Internal glue code where inference is obvious.
- Prototypes/spikes (but flag the debt).
- When a runtime check is clearer than a 4-line conditional type. Readability wins.

**When to push logic into the type system**
- Making illegal states unrepresentable (discriminated unions, branded types).
- Public API contracts where misuse should fail at build.
- NOT to show off. If maintainers can't read it, it's a liability regardless of correctness.

## The strictness ladder (migrating a loose codebase)

Don't flip everything at once on a legacy repo. Climb:
1. `strict: false` but `noImplicitAny: true` first (biggest bug catch, least noise).
2. `strictNullChecks: true` (the big one; most valuable, most work).
3. `strict: true` (turns on the rest).
4. `noUncheckedIndexedAccess: true` (catches array/object access assumptions).
5. `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`.
Fix file-by-file with `// @ts-expect-error` as a tracked TODO, not `@ts-ignore`.

## Code review lens (what a senior flags)

- `any` or `as` on untrusted data -> "validate this, don't cast it."
- `!` non-null assertions -> "prove it or handle null."
- Missing exhaustiveness in `switch` over a union -> add `never` default.
- Mutable shared state / returned mutable references -> `readonly` or copy.
- Floating promises -> await/void/catch.
- Default exports in shared code -> named.
- `enum` under bundler/isolatedModules -> `as const` union.
- Over-clever types -> "can this be a plain type + a runtime check?"
- `interface`/`type` inconsistency -> align to convention.
- Public function without return annotation -> annotate (stability, build speed).

## Performance-of-the-compiler awareness

Types have build cost. A senior knows:
- Deeply recursive/conditional types slow `tsc` and the editor. Cap recursion, prefer simpler.
- `skipLibCheck: true` is a pragmatic speed win but hides errors in deps; know the tradeoff.
- Project references + `isolatedDeclarations` for monorepo build speed.
- Annotate public return types so TS doesn't re-infer across the graph.

## The one-liner test

Before shipping a type: "If a competent teammate reads this without me in the room, do they understand what it enforces and why, in under 30 seconds?" If no, simplify.
