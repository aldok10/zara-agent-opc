/**
 * Example composable: useSearch
 * Demonstrates: MaybeRefOrGetter input, async data, debounce, abort, cleanup.
 */
import { ref, watchEffect, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { onWatcherCleanup } from 'vue'

interface UseSearchOptions {
  debounce?: number
  minLength?: number
}

interface UseSearchReturn<T> {
  results: Ref<T[]>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
}

export function useSearch<T>(
  query: MaybeRefOrGetter<string>,
  endpoint: string,
  options: UseSearchOptions = {},
): UseSearchReturn<T> {
  const { debounce = 300, minLength = 2 } = options

  const results = ref<T[]>([]) as Ref<T[]>
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  watchEffect(() => {
    const q = toValue(query)

    if (q.length < minLength) {
      results.value = []
      return
    }

    isLoading.value = true
    error.value = null

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        results.value = await res.json()
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          error.value = e
        }
      } finally {
        isLoading.value = false
      }
    }, debounce)

    onWatcherCleanup(() => {
      clearTimeout(timer)
      controller.abort()
    })
  })

  return { results, isLoading, error }
}
