---
type: subskill
title: "Subskill: Composition API (Vue 3.5+)"
---

# Subskill: Composition API (Vue 3.5+)

Activate when: building components, extracting composables, managing reactivity, lifecycle hooks, provide/inject patterns.

## Core Principles

1. **Reactivity is the foundation.** `ref()` for primitives, `reactive()` for objects you don't reassign. Never mix without understanding unwrapping rules.
2. **Composables extract logic, not UI.** A composable is a function that uses Vue reactivity/lifecycle. Name: `use*`. Returns reactive state + methods.
3. **Lifecycle is explicit.** `onMounted`, `onUnmounted`, etc. No implicit `this` lifecycle.
4. **Provide/inject replaces prop drilling.** Type it with `InjectionKey<T>`.

## Decision Table: ref vs reactive

| Situation | Use | Why |
|-----------|-----|-----|
| Primitive value (string, number, boolean) | `ref()` | `reactive()` can't wrap primitives |
| Object you may reassign entirely | `ref()` | `reactive()` loses reactivity on reassign |
| Object with stable shape, no reassignment | `reactive()` | Cleaner access (no `.value`) |
| Return from composable | `ref()` | Destructurable without losing reactivity |
| Template ref | `useTemplateRef<T>()` | Type-safe, 3.5+ pattern |

## Reactive Props Destructuring (3.5+)

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
}

const { title, count = 0 } = defineProps<Props>()
// `title` and `count` are reactive  -  they track in templates and computed

// IMPORTANT: when passing to a composable that needs reactivity, wrap in getter
const doubled = computed(() => count * 2) // works directly in computed
useExternalComposable(() => count) // getter for external composable
</script>
```

## Composable Pattern

```typescript
// composables/useFetch.ts
import { ref, watchEffect, toValue, type MaybeRefOrGetter } from 'vue'

export function useFetch<T>(url: MaybeRefOrGetter<string>) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const isLoading = ref(false)

  async function execute() {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(toValue(url))
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      data.value = await response.json()
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      isLoading.value = false
    }
  }

  watchEffect(() => {
    toValue(url) // track reactive URL
    execute()
  })

  return { data, error, isLoading, execute }
}
```

## Provide/Inject with Type Safety

```typescript
// keys.ts
import type { InjectionKey } from 'vue'

export interface UserContext {
  id: string
  name: string
  permissions: readonly string[]
}

export const USER_KEY: InjectionKey<UserContext> = Symbol('user')

// Parent component
import { provide } from 'vue'
import { USER_KEY } from './keys'
provide(USER_KEY, { id: '1', name: 'Aldo', permissions: ['read'] })

// Child component (any depth)
import { inject } from 'vue'
import { USER_KEY } from './keys'
const user = inject(USER_KEY) // UserContext | undefined
if (!user) throw new Error('UserContext not provided')
```

## Lifecycle: When to Use What

| Hook | Use case |
|------|----------|
| `onMounted` | DOM access, third-party lib init, intersection observers |
| `onUnmounted` | Cleanup: event listeners, timers, subscriptions |
| `onBeforeMount` | Rare. Prefer `onMounted`. |
| `watchEffect` | Reactive side effects that auto-track deps |
| `watch` | Explicit dep tracking, access old/new value, debounce |

## Anti-Patterns

```typescript
// WRONG: losing reactivity by destructuring reactive()
const state = reactive({ count: 0 })
const { count } = state // count is now a plain number, not reactive

// RIGHT: use toRefs if you must destructure reactive
const { count } = toRefs(state) // count is Ref<number>

// WRONG: reassigning reactive object
let state = reactive({ items: [] })
state = reactive({ items: newItems }) // breaks reactivity for watchers

// RIGHT: mutate the existing reactive, or use ref for reassignable
const state = ref({ items: [] })
state.value = { items: newItems } // fine
```

## MaybeRefOrGetter Pattern (3.5+)

Accept flexible input in composables:

```typescript
import { toValue, type MaybeRefOrGetter } from 'vue'

export function useTitle(title: MaybeRefOrGetter<string>) {
  watchEffect(() => {
    document.title = toValue(title) // unwraps ref, calls getter, or returns plain value
  })
}

// All work:
useTitle('Static Title')
useTitle(titleRef)
useTitle(() => props.title)
```
