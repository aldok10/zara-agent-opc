---
type: architecture
title: "Vue Composable Patterns: extraction, async, shared state, VueUse"
---

# Composable Patterns

## The Composable Contract

A composable is a function that:
1. Starts with `use` prefix
2. Uses Vue reactivity/lifecycle internally
3. Returns reactive state and methods
4. Can be called only in `<script setup>` or another composable (lifecycle hooks need component context)

## Pattern 1: State + Actions

The simplest and most common pattern.

```typescript
// composables/useCounter.ts
import { ref, computed } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const isZero = computed(() => count.value === 0)

  function increment() { count.value++ }
  function decrement() { count.value-- }
  function reset() { count.value = initial }

  return { count, isZero, increment, decrement, reset }
}
```

## Pattern 2: Async Data Fetching

```typescript
// composables/useApi.ts
import { ref, type MaybeRefOrGetter, toValue, watchEffect } from 'vue'

interface UseApiReturn<T> {
  data: Ref<T | null>
  error: Ref<Error | null>
  isLoading: Ref<boolean>
  execute: () => Promise<void>
}

export function useApi<T>(url: MaybeRefOrGetter<string>): UseApiReturn<T> {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<Error | null>(null)
  const isLoading = ref(false)

  async function execute() {
    isLoading.value = true
    error.value = null
    try {
      const res = await fetch(toValue(url))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      data.value = await res.json()
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      isLoading.value = false
    }
  }

  watchEffect(() => {
    toValue(url) // track
    execute()
  })

  return { data, error, isLoading, execute }
}
```

## Pattern 3: Event Listener (with cleanup)

```typescript
// composables/useEventListener.ts
import { onMounted, onUnmounted, type MaybeRefOrGetter, toValue, watch } from 'vue'

export function useEventListener<K extends keyof WindowEventMap>(
  target: MaybeRefOrGetter<EventTarget | null>,
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
) {
  let cleanup: (() => void) | undefined

  function attach() {
    cleanup?.()
    const el = toValue(target)
    if (!el) return
    el.addEventListener(event, handler as EventListener, options)
    cleanup = () => el.removeEventListener(event, handler as EventListener, options)
  }

  onMounted(attach)
  onUnmounted(() => cleanup?.())

  // Re-attach if target changes
  watch(() => toValue(target), attach)
}
```

## Pattern 4: Shared Singleton State

For state shared across components without Pinia (lightweight alternative for small features).

```typescript
// composables/useNotifications.ts
import { ref, readonly } from 'vue'

interface Notification {
  id: string
  message: string
  type: 'info' | 'error' | 'success'
}

// State declared OUTSIDE the function = singleton
const notifications = ref<Notification[]>([])

export function useNotifications() {
  function add(message: string, type: Notification['type'] = 'info') {
    const id = crypto.randomUUID()
    notifications.value.push({ id, message, type })
    setTimeout(() => remove(id), 5000)
  }

  function remove(id: string) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  return {
    notifications: readonly(notifications),
    add,
    remove,
  }
}
```

## Pattern 5: Composable Composition

Composables can call other composables.

```typescript
// composables/useUser.ts
import { computed } from 'vue'
import { useApi } from './useApi'
import { useLocalStorage } from '@vueuse/core'

export function useUser() {
  const token = useLocalStorage<string | null>('auth-token', null)
  const { data: user, isLoading, execute } = useApi<User>('/api/me')

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function logout() {
    token.value = null
    user.value = null
  }

  return { user, isAuthenticated, isLoading, token, logout, refresh: execute }
}
```

## Pattern 6: MaybeRefOrGetter Input (flexible API)

Accept reactive or static input. The standard for Vue 3.5+ composables.

```typescript
import { toValue, watchEffect, type MaybeRefOrGetter } from 'vue'

export function useTitle(title: MaybeRefOrGetter<string>) {
  watchEffect(() => {
    document.title = toValue(title)
  })
}

// All valid:
useTitle('Static')
useTitle(titleRef)
useTitle(() => props.pageTitle)
```

## VueUse: Don't Reinvent

Before writing a composable, check VueUse. Common ones:

| Need | VueUse | Don't write your own |
|------|--------|---------------------|
| localStorage/sessionStorage | `useLocalStorage`, `useSessionStorage` | Handles serialization, SSR |
| Debounce/throttle | `useDebounceFn`, `useThrottleFn` | Proper cleanup |
| Clipboard | `useClipboard` | Permissions API |
| Dark mode | `useDark` | System preference, persistence |
| Intersection observer | `useIntersectionObserver` | Auto-cleanup |
| Media query | `useMediaQuery` | Reactive matches |
| Window size | `useWindowSize` | Throttled, SSR-safe |
| Mouse position | `useMouse` | Throttled |
| Online status | `useOnline` | Cross-browser |
| Fetch | `useFetch` | Abort, timeout, refetch |

## Rules for Good Composables

1. Return `ref`s, not `reactive` (destructuring-friendly)
2. Accept `MaybeRefOrGetter` for flexible input
3. Clean up side effects in `onUnmounted` or `onWatcherCleanup`
4. Keep composables focused (single responsibility)
5. Prefix with `use`
6. Document return type for complex composables
7. Handle SSR: guard `window`/`document` access with `onMounted` or `typeof window !== 'undefined'`
