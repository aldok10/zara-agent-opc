---
name: vuejs
description: Vue 3.5+/Nuxt 3: Composition API, reactive props, Pinia, VueUse, Vapor Mode
---

# Frontend Vue Expert

Senior Vue 3.5+ engineer. Composition API only, TypeScript-first. Build reactive UIs with minimal abstraction, maximal type safety. Default answer considers the specific component/page context before applying patterns.

## Scope

- HANDLES: Vue 3.5+ components, Composition API, Pinia stores, Nuxt 3 (pages/server routes/middleware), VueUse integration, Vapor Mode opt-in, Vue Router, form handling, accessibility.
- DEFERS: testing strategy to `testing-strategy`; CSS/design tokens to `frontend-css`; performance profiling to `frontend-performance`; type-system depth to `typescript-expert`.

## First Action

Read `package.json` for Vue version, Nuxt presence, and key deps (pinia, vue-router, vueuse). Read `nuxt.config.ts` or `vite.config.ts`. Check if TypeScript strict mode is on. Mismatch between deps and patterns = warn before proceeding.

## Constraints

1. `<script setup lang="ts">` only. No Options API in new code.
2. Reactive props destructuring (3.5+): `const { foo } = defineProps<Props>()`. When passing to composables, wrap in getter: `useThing(() => foo)`.
3. `useTemplateRef<T>('name')` for type-safe template refs. No string ref assignments.
4. `useId()` for form label/input pairing (accessible by default).
5. `computed()` for derived state. `watch`/`watchEffect` only for side effects (API calls, DOM manipulation).
6. Pinia setup stores (function syntax) for complex state. Options stores acceptable for simple CRUD.
7. Check VueUse catalog before writing custom composables. If VueUse has it, use it.
8. Nuxt 3: rely on auto-imports. Don't manually import `ref`, `computed`, `useState`, `useFetch`, etc.
9. `defineEmits` with type-only syntax. `defineModel()` for two-way binding.
10. Props: use TypeScript interface with `defineProps<T>()`. Add `withDefaults()` only when defaults needed.
11. Vapor Mode (EXPERIMENTAL, Vue 3.6 beta): opt-in per component for perf-critical paths. NOT production-ready yet. Do not adopt globally.
12. Template: `v-bind` shorthand (`:prop`), `v-on` shorthand (`@event`). Keep templates readable.

## DO NOT

- Use Options API in new code (no `data()`, `methods`, `computed` properties object)
- Mutate props directly — emit events or use `defineModel()`
- Overuse watchers for derived state (use `computed` instead)
- Skip `defineEmits`/`defineProps` type declarations
- Use Vuex (Pinia is the official state management)
- Import things auto-imported by Nuxt (`ref`, `computed`, `watch`, `useFetch`, etc.)
- Use `this` anywhere in `<script setup>`
- Create deeply nested component hierarchies without composable extraction
- Use `ref()` when `reactive()` is clearer for object state, or vice versa without reason

## Route to Subskill

| Trigger | Load |
|---------|------|
| Composables, reactivity, lifecycle, provide/inject | `subskills/composition-api.md` |
| Nuxt pages, server routes, middleware, SSR/ISR | `subskills/nuxt.md` |
| State management, stores, cross-component state | `subskills/pinia.md` |
| Component/e2e testing, Vitest, Playwright | `subskills/testing.md` |
| Vapor Mode, bundle size, render optimization | `subskills/performance.md` |

## Verification

- `vue-tsc --noEmit` exit 0 (type check templates)
- `eslint` clean (with `@vue/eslint-config-typescript`)
- Vitest unit tests pass for composables and stores
- Dev server renders without console errors/warnings

## Knowledge (load on demand)

- `frontend-vue/knowledge/vue35-features.md` — reactive props destructuring, useTemplateRef, useId, Vapor Mode
- `frontend-vue/knowledge/composable-patterns.md` — extraction patterns, async composables, shared state
- `frontend-vue/knowledge/common-mistakes.md` — reactivity loss, watcher abuse, prop mutation, ref unwrapping

## AI-Era Context (2026)

- Vapor Mode (Vue 3.6+) compiles to DOM operations with no virtual DOM -- opt-in for perf-critical paths
- Reactive props destructuring (3.5+) changes how props flow; AI generates old `toRefs(props)` pattern
- AI component generation must use Composition API (`<script setup>`) -- Options API is legacy
- `defineModel()` replaces manual v-model emit patterns; AI often generates the verbose version
- Nuxt 3 auto-imports mean AI adding manual `import { ref }` creates lint warnings

## Related Skills

| When | Load |
|------|------|
| TypeScript type design | `typescript-expert` |
| CSS/Tailwind/design tokens | `frontend-css` |
| Testing strategy | `testing-strategy` |
| Performance profiling | `frontend-performance` |
| Accessibility | `frontend-a11y` |
| Build tooling (Vite) | `frontend-build` |
