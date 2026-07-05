---
type: pitfall
title: "Vue Common Mistakes: reactivity loss, watcher abuse, prop mutation, ref unwrapping"
---

# Common Mistakes in Vue 3.5+

## 1. Reactivity Loss from Destructuring reactive()

```typescript
// WRONG
const state = reactive({ count: 0, name: 'Vue' })
const { count } = state // count is now a plain number (0), NOT reactive

// RIGHT: use toRefs
const { count, name } = toRefs(state) // count is Ref<number>

// RIGHT: or just use ref() from the start
const count = ref(0)
```

**Why:** `reactive()` creates a Proxy on the object. Destructuring extracts the primitive value, losing the Proxy wrapper. `toRefs()` converts each property to a `Ref` that points back to the reactive source.

## 2. Overusing watch for Derived State

```typescript
// WRONG: imperative watcher to keep derived state in sync
const items = ref<Item[]>([])
const count = ref(0)
watch(items, (val) => { count.value = val.length }) // extra ref, race conditions possible

// RIGHT: computed is declarative and cached
const count = computed(() => items.value.length) // always correct, no sync issues
```

**Rule:** If you can express it as `f(state)`, use `computed()`. Only use `watch` for side effects (API calls, logging, DOM manipulation).

## 3. Mutating Props Directly

```vue
<script setup lang="ts">
// WRONG: direct prop mutation (Vue will warn)
const { modelValue } = defineProps<{ modelValue: string }>()
// modelValue = 'new value' // ERROR: props are readonly

// RIGHT: emit an event
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
function update(val: string) {
  emit('update:modelValue', val)
}

// BEST (3.4+): use defineModel
const modelValue = defineModel<string>()
modelValue.value = 'new value' // works! emits automatically
</script>
```

## 4. Ref Unwrapping Confusion in Templates vs Script

```typescript
const count = ref(0)

// In <script setup>:
console.log(count.value) // need .value

// In <template>:
// {{ count }}  -  auto-unwrapped, no .value needed

// GOTCHA: ref inside reactive is auto-unwrapped
const state = reactive({ count: ref(0) })
state.count++ // no .value needed (unwrapped)

// GOTCHA: ref in array/Map inside reactive is NOT unwrapped
const state = reactive({ items: [ref(0)] })
state.items[0].value // need .value here!
```

## 5. Forgetting async in watchEffect Doesn't Make It Await

```typescript
// WRONG: async watchEffect loses tracking after first await
watchEffect(async () => {
  const url = baseUrl.value // tracked (before await)
  const data = await fetch(url)
  const json = await data.json()
  items.value = json // NOT tracked after this point
  otherDep.value // this dependency is NOT tracked!
})

// RIGHT: collect deps synchronously, then do async work
watch(() => baseUrl.value, async (url) => {
  const data = await fetch(url)
  items.value = await data.json()
})
```

**Why:** Vue tracks deps synchronously. After the first `await`, the tracking is done. Any refs accessed after await won't trigger re-execution.

## 6. Not Using Key on v-for with Components

```vue
<!-- WRONG: no key, Vue reuses component instances incorrectly -->
<UserCard v-for="user in users" :user="user" />

<!-- RIGHT: unique key for proper instance management -->
<UserCard v-for="user in users" :key="user.id" :user="user" />
```

Without `:key`, Vue patches in-place by index. If list order changes, component local state gets mixed up.

## 7. Calling Composables Conditionally or in Callbacks

```typescript
// WRONG: composables must be called at top level of setup
function onClick() {
  const { data } = useFetch('/api/thing') // breaks: no component context
}

// WRONG: conditional composable call
if (someCondition) {
  const result = useSearch(query) // breaks lifecycle hook registration
}

// RIGHT: call unconditionally, control behavior with options
const { data, execute } = useFetch('/api/thing', { immediate: false })
function onClick() { execute() }
```

## 8. Creating Watchers Without Cleanup

```typescript
// WRONG: event listeners without cleanup
onMounted(() => {
  window.addEventListener('resize', handler)
  // leaked! never removed
})

// RIGHT: clean up in onUnmounted
onMounted(() => {
  window.addEventListener('resize', handler)
})
onUnmounted(() => {
  window.removeEventListener('resize', handler)
})

// BEST: use VueUse
import { useEventListener } from '@vueuse/core'
useEventListener(window, 'resize', handler) // auto-cleaned
```

## 9. v-if vs v-show Misuse

```vue
<!-- v-if: removes from DOM. Use for rarely-toggled content -->
<HeavyComponent v-if="showPanel" /> <!-- destroyed when hidden -->

<!-- v-show: CSS display:none. Use for frequently toggled content -->
<Dropdown v-show="isOpen" /> <!-- stays in DOM, fast toggle -->
```

Wrong choice: `v-if` on a tooltip that opens/closes rapidly = expensive mount/unmount cycles.

## 10. Passing Reactive Object as Prop Then Modifying Child

```vue
<!-- Parent -->
<ChildForm :user="user" />

<!-- Child WRONG: modifying parent's reactive object directly -->
<script setup>
const { user } = defineProps<{ user: User }>()
user.name = 'modified' // works but BAD: implicit parent mutation, no event trail
</script>
```

Props flow down, events flow up. If child needs to modify, emit or use `defineModel`.

## 11. Not Handling Loading/Error States

```vue
<script setup lang="ts">
const { data } = useFetch<User[]>('/api/users')
</script>

<!-- WRONG: assumes data is always present -->
<template>
  <div v-for="user in data" :key="user.id">{{ user.name }}</div>
</template>

<!-- RIGHT: handle all states -->
<template>
  <div v-if="error">Error: {{ error.message }}</div>
  <div v-else-if="isLoading">Loading...</div>
  <div v-else-if="data">
    <div v-for="user in data" :key="user.id">{{ user.name }}</div>
  </div>
  <div v-else>No users found</div>
</template>
```

## 12. Using reactive() for Arrays You Replace

```typescript
// WRONG: reassignment loses reactivity
let items = reactive<Item[]>([])
items = reactive(newItems) // watchers on old `items` are broken

// RIGHT: use ref for arrays you replace
const items = ref<Item[]>([])
items.value = newItems // works

// Or mutate in place:
const items = reactive<Item[]>([])
items.splice(0, items.length, ...newItems) // keeps same reactive array
```
