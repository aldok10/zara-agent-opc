---
type: tool
title: "Vue Code Review"
---

# Vue Code Review

## Purpose

Review Vue 3 code for correctness, modern patterns, and best practices. Focus on Composition API, reactivity, Pinia stores, and Nuxt patterns where applicable.

## When to Use

- Reviewing Vue components, composables, or stores
- Evaluating reactivity patterns and computed usage
- Checking Pinia store design
- Reviewing Nuxt pages, middleware, or server routes

## Prompt Template

Given the following Vue code:

```
[paste component/composable/store/page code]
```

File path: `[e.g., src/components/UserProfile.vue]`

Review for:

1. **Composition API**: Is `<script setup>` used? Are composables extracted for reusable logic? Is Options API usage justified if present?
2. **Reactivity**: Are `ref` vs `reactive` chosen appropriately? Is destructuring preserved with `toRefs`/`storeToRefs`? Are watchers scoped and cleaned up? Is `computed` used for derived values?
3. **Props & Emits**: Are props typed with `defineProps<T>()`? Are defaults set with `withDefaults`? Are emits typed with `defineEmits<T>()`? Is `v-model` implemented correctly?
4. **Pinia**: Are stores organized by domain? Is state minimal (no derived data stored)? Are actions used for async? Are getters used for computed state? Is `storeToRefs` used for destructuring?
5. **Template**: Is logic minimal in templates? Are `v-for` keys stable and unique? Is `v-if`/`v-show` chosen correctly? Are slots used for composition?
6. **Nuxt (if applicable)**: Are `useFetch`/`useAsyncData` used correctly? Is data fetching deduplicated? Are middleware/plugins typed? Is server-only logic in server routes?
7. **Performance**: Are expensive components lazy-loaded? Is `v-once` used for static content? Are large lists virtualized? Is `shallowRef` used where deep reactivity is unnecessary?

Context:
- Vue version: [3.3+/3.4+/3.5+]
- Framework: [Nuxt/Vite-only/Quasar]
- State: [Pinia/composables/Vuex]
- TypeScript: [yes/no]

## Output Format

```
## Vue Review

### Issues
- [severity] [file:line]  -  [issue]  -  [fix]

### Reactivity
- [correctness observations]
- [potential pitfalls (lost reactivity, unintended watchers)]

### Component Design
- [composition/structure assessment]

### Store Architecture (if applicable)
- [Pinia store observations]

### Verdict
[approve / request changes / needs restructuring]
```
