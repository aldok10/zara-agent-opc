---
type: fact
title: "Vue 3.5+ Features: reactive props, useTemplateRef, useId, Vapor Mode"
---

# Vue 3.5+ Features

## Reactive Props Destructuring (3.5 stable)

Previously, destructuring `defineProps` lost reactivity. In 3.5+, destructured props are reactive by default.

```vue
<script setup lang="ts">
// 3.5+: destructured props are reactive
const { title, count = 0 } = defineProps<{ title: string; count?: number }>()

// They work in computed and templates reactively
const upper = computed(() => title.toUpperCase())
</script>

<template>
  <h1>{{ upper }}</h1>
  <span>{{ count }}</span>
</template>
```

**Critical rule:** When passing destructured props to external functions/composables that need to track reactivity, wrap in a getter:

```typescript
// composable expects reactive input
useDocumentTitle(() => title) // getter preserves reactivity

// In computed/watch, direct access works because they track automatically
const doubled = computed(() => count * 2) // fine
watch(() => count, (val) => console.log(val)) // fine
```

## useTemplateRef (3.5+)

Type-safe template refs. Replaces the old pattern of declaring a ref with matching name.

```vue
<script setup lang="ts">
const inputEl = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  inputEl.value?.focus()
})
</script>

<template>
  <input ref="input" type="text" />
</template>
```

Benefits:
- Full type inference on the element
- No name collision with reactive state
- Works with component refs: `useTemplateRef<InstanceType<typeof MyComponent>>('comp')`

## useId (3.5+)

Generates unique IDs for accessible form labeling. SSR-safe (consistent between server/client).

```vue
<script setup lang="ts">
const id = useId()
</script>

<template>
  <label :for="id">Email</label>
  <input :id="id" type="email" />
</template>
```

For multiple fields:

```vue
<script setup lang="ts">
const nameId = useId()
const emailId = useId()
</script>

<template>
  <label :for="nameId">Name</label>
  <input :id="nameId" type="text" />
  <label :for="emailId">Email</label>
  <input :id="emailId" type="email" />
</template>
```

## defineModel (3.4+, stable 3.5)

Two-way binding without boilerplate emit + prop pattern.

```vue
<!-- ToggleSwitch.vue -->
<script setup lang="ts">
const enabled = defineModel<boolean>({ required: true })
</script>

<template>
  <button @click="enabled = !enabled" :aria-pressed="enabled">
    {{ enabled ? 'On' : 'Off' }}
  </button>
</template>

<!-- Parent usage: -->
<ToggleSwitch v-model="isEnabled" />
```

Multiple models:

```vue
<script setup lang="ts">
const firstName = defineModel<string>('firstName')
const lastName = defineModel<string>('lastName')
</script>

<!-- Parent: -->
<NameForm v-model:firstName="first" v-model:lastName="last" />
```

## Vapor Mode (EXPERIMENTAL, Vue 3.6 beta, NOT production-ready)

Compiles components to direct DOM operations without virtual DOM diffing. For perf-critical paths (large tables, real-time dashboards).

**Status as of mid-2025:**
- Ships in Vue 3.6 (currently beta)
- GitHub repo `vuejs/vue-vapor` archived July 2025 (merged into main Vue repo)
- Evan You noted delays due to compatibility issues
- DO NOT use in production yet

Key points:
- Same Composition API syntax
- No runtime virtual DOM overhead
- Opt-in: does not affect other components
- File convention: `.vapor.vue` or config-based inclusion
- Not all features supported (Teleport, Suspense may have limitations)
- Wait for Vue 3.6 stable before adoption

## Improved Watch: once option (3.4+)

```typescript
watch(source, (val) => {
  // runs only once, then auto-stops
}, { once: true })
```

## Improved computed: previous value access

```typescript
const count = ref(0)
const doubled = computed((prev) => {
  // prev is the previous computed value (undefined on first run)
  return count.value * 2
})
```

## Deferred Teleport (3.5+)

Teleport to a target that hasn't been rendered yet:

```vue
<Teleport to="#modal-container" defer>
  <ModalContent />
</Teleport>
```

## onWatcherCleanup (3.5+)

Cleanup function registered inside a watcher callback:

```typescript
import { onWatcherCleanup } from 'vue'

watch(searchQuery, (query) => {
  const controller = new AbortController()
  fetch(`/api/search?q=${query}`, { signal: controller.signal })

  onWatcherCleanup(() => {
    controller.abort()
  })
})
```
