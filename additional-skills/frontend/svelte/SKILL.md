---
name: svelte
description: "Svelte 5 + SvelteKit: runes-first reactivity, compiled output, progressive enhancement"
---

# Frontend Svelte 5 Skill

## Scope

Svelte 5 components, SvelteKit applications, runes reactivity, form actions, load functions, animations, testing. Covers new projects and Svelte 4 → 5 migration.

## First Action

1. Check `svelte.config.js` and `package.json` for Svelte version and adapter
2. Identify if project uses runes or legacy syntax
3. Read existing component patterns before writing new ones

## Constraints

1. Runes only. Never use `$:` reactive statements or `export let` for props.
2. `$derived` before `$effect`. If a value is a pure function of state, use `$derived`.
3. `$effect` is for side effects only: DOM, network, logging. Never derive state in effects.
4. Shared state lives in `.svelte.ts` files using exported `$state`. No stores for new code.
5. Snippets replace slots. Use `{@render children()}` for content projection.
6. Event handlers use `onclick={handler}` syntax, not `on:click`.
7. SvelteKit form actions for mutations. Progressive enhancement by default.
8. Load functions for data fetching. Server-first, client on navigation.
9. Type all props with TypeScript. Use `interface Props` pattern.
10. Accessibility: semantic HTML, ARIA when needed, keyboard navigation.

## DO NOT

- Use `let x = 0` expecting reactivity (must be `let x = $state(0)`)
- Use `writable()` / `readable()` / `derived()` stores (legacy)
- Use `<slot>` or `<slot name="x">` (replaced by snippets)
- Put derived values in `$effect` (most common rune misuse)
- Use `$state` for values that never change (just use `const`)
- Import from `svelte/store` in new code
- Use `createEventDispatcher` (use callback props instead)
- Use `$$props` or `$$restProps` (use `$props()` with rest)

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| Reactive state, $state, $derived, $effect, props | `subskills/runes.md` |
| Routing, form actions, load, SSR, adapters | `subskills/sveltekit.md` |
| Component testing, e2e, vitest | `subskills/testing.md` |
| Transitions, animations, motion | `subskills/animations.md` |

## Verification

1. `npx svelte-check --tsconfig ./tsconfig.json`  -  zero errors
2. `npm run test` or `npx vitest run`  -  tests pass
3. No `$:` or `export let` in new code (grep verify)
4. No stores imported from `svelte/store` in new files
5. All `$effect` usages justified (side effect, not derivation)

## Knowledge

- `knowledge/runes-reference.md`  -  Complete runes API
- `knowledge/svelte5-migration.md`  -  Svelte 4 → 5 migration patterns
- `knowledge/common-mistakes.md`  -  Anti-patterns and fixes

## AI-Era Context (2026)

- Runes (`$state`, `$derived`, `$effect`) fully replace stores -- AI generating `writable()` is wrong
- SvelteKit 2 uses universal load functions; AI often generates server-only patterns incorrectly
- Svelte 5 compiles to smallest bundles of any framework -- less AI-generated bloat matters here
- Snippets replace slots (`{@render children()}`); AI still generates `<slot>` syntax
- Event handlers use `onclick={fn}` not `on:click={fn}` -- AI generates the old Svelte 4 syntax

## Related Skills

- `typescript-expert`  -  Type-safe component interfaces
- `testing-strategy`  -  Test architecture decisions
- `system-design`  -  SvelteKit deployment and SSR patterns
