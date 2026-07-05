# Subskill: Vue Performance

Activate when: optimizing render performance, reducing bundle size, Vapor Mode, lazy loading, virtualization.

## Core Principles

1. **Measure first.** Vue DevTools performance tab, Lighthouse, `performance.mark()`. Never optimize blind.
2. **Render less.** `v-once`, `v-memo`, computed caching, conditional rendering.
3. **Load less.** Code splitting, lazy components, tree-shaking, dynamic imports.
4. **Vapor Mode for hot paths.** Opt-in per component to skip virtual DOM overhead.
5. **List virtualization.** 100+ items = virtualize. Never render thousands of DOM nodes.

## Decision Table: Optimization Technique

| Problem | Solution | Impact |
|---------|----------|--------|
| Large list rendering | Virtual scroll (`@tanstack/vue-virtual`, `vue-virtual-scroller`) | High |
| Expensive computed re-running | `computed()` auto-caches; verify deps aren't changing unnecessarily | Medium |
| Component re-renders when props unchanged | Compiler handles this in Vue 3; check for object reference changes | Low |
| Heavy component tree on route | `defineAsyncComponent()` + `<Suspense>` | High |
| Static content re-rendering | `v-once` directive | Low |
| List item re-renders | `v-memo` with dependency array | Medium |
| Large bundle | Route-level code splitting, `defineAsyncComponent` | High |
| Perf-critical component (tables, charts) | Vapor Mode opt-in | High |

## Lazy Components

```typescript
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
const ModalDialog = defineAsyncComponent({
  loader: () => import('./ModalDialog.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200, // show spinner after 200ms
  errorComponent: ErrorFallback,
  timeout: 10000,
})
```

## v-memo (skip re-renders for list items)

```vue
<template>
  <div v-for="item in list" :key="item.id" v-memo="[item.id, item.updated]">
    <ExpensiveComponent :data="item" />
  </div>
</template>
```

Only re-renders when `item.id` or `item.updated` changes. Use sparingly  -  premature optimization otherwise.

## Vapor Mode (Vue 3.5+)

Opt-in per component. Compiles to direct DOM operations, no virtual DOM diff.

```vue
<!-- PerformanceCriticalTable.vapor.vue -->
<script setup lang="ts">
// Same Composition API. The .vapor.vue extension (or config flag) enables Vapor compilation.
const { rows } = defineProps<{ rows: TableRow[] }>()
</script>

<template>
  <table>
    <tr v-for="row in rows" :key="row.id">
      <td>{{ row.name }}</td>
      <td>{{ row.value }}</td>
    </tr>
  </table>
</template>
```

Configuration in `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      vapor: {
        include: ['**/components/vapor/**'], // or specific files
      },
    }),
  ],
})
```

## Code Splitting (Route-level)

```typescript
// router/index.ts
const routes = [
  { path: '/', component: () => import('../pages/Home.vue') },
  { path: '/dashboard', component: () => import('../pages/Dashboard.vue') },
  { path: '/settings', component: () => import('../pages/Settings.vue') },
]
```

Nuxt does this automatically for `pages/` directory.

## Reactivity Optimization

```typescript
// WRONG: creating new objects in computed (triggers child re-renders)
const style = computed(() => ({ color: theme.value })) // new object every time

// RIGHT: use shallowRef for large data you replace atomically
const bigList = shallowRef<Item[]>([])
// Trigger update explicitly
bigList.value = [...newItems] // only triggers on .value reassignment

// RIGHT: triggerRef for mutation of shallowRef
bigList.value.push(item)
triggerRef(bigList) // manually notify
```

## Bundle Analysis

```bash
# Vite
npx vite-bundle-visualizer

# Nuxt
npx nuxi analyze
```

## Anti-Patterns

```typescript
// WRONG: watching for derived state (use computed)
watch(items, () => { total.value = items.value.length }) // extra watcher, sync issues
// RIGHT:
const total = computed(() => items.value.length)

// WRONG: v-if + v-for on same element
<li v-for="item in list" v-if="item.active"> // v-if runs per item, inefficient
// RIGHT: filter first
const activeItems = computed(() => list.value.filter(i => i.active))

// WRONG: importing entire lodash
import _ from 'lodash'
// RIGHT: import specific functions or use native
import debounce from 'lodash-es/debounce'
```
