# Subskill: Vue Testing

Activate when: writing component tests, composable tests, e2e tests, or setting up test infrastructure for Vue/Nuxt.

## Core Principles

1. **Test behavior, not implementation.** Query by role/label, not CSS class or component internals.
2. **Composables are the easiest to unit test.** Pure logic, no DOM.
3. **Component tests verify user interaction.** Mount, interact, assert rendered output.
4. **E2E for critical user flows.** Login, checkout, navigation. Playwright preferred.
5. **Stores are functions.** Test Pinia stores without mounting components.

## Stack

| Layer | Tool | When |
|-------|------|------|
| Unit (composables, utils) | Vitest | Always |
| Component | Vitest + @vue/test-utils + @testing-library/vue | User interaction |
| E2E | Playwright / Cypress | Critical flows |
| Visual regression | Chromatic / Percy | Design systems |

## Testing Composables

```typescript
// composables/useCounter.test.ts
import { useCounter } from './useCounter'
import { ref } from 'vue'

test('increments count', () => {
  const { count, increment } = useCounter()
  expect(count.value).toBe(0)
  increment()
  expect(count.value).toBe(1)
})

// For composables using lifecycle hooks, wrap in a component:
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

function withSetup<T>(composable: () => T) {
  let result: T
  mount(defineComponent({
    setup() {
      result = composable()
      return () => null
    },
  }))
  return result!
}

test('composable with onMounted', () => {
  const result = withSetup(() => useMyHook())
  expect(result.data.value).toBeDefined()
})
```

## Testing Components

```typescript
// components/TodoItem.test.ts
import { render, screen, fireEvent } from '@testing-library/vue'
import TodoItem from './TodoItem.vue'

test('renders todo text', () => {
  render(TodoItem, { props: { title: 'Buy milk', done: false } })
  expect(screen.getByText('Buy milk')).toBeInTheDocument()
})

test('emits toggle on checkbox click', async () => {
  const { emitted } = render(TodoItem, {
    props: { title: 'Buy milk', done: false },
  })
  await fireEvent.click(screen.getByRole('checkbox'))
  expect(emitted().toggle).toHaveLength(1)
})

test('applies done class when completed', () => {
  render(TodoItem, { props: { title: 'Buy milk', done: true } })
  expect(screen.getByText('Buy milk')).toHaveClass('line-through')
})
```

## Testing with Pinia

```typescript
import { render, screen } from '@testing-library/vue'
import { createTestingPinia } from '@pinia/testing'
import CartSummary from './CartSummary.vue'

test('displays total from store', () => {
  render(CartSummary, {
    global: {
      plugins: [createTestingPinia({
        initialState: {
          cart: { items: [{ productId: '1', price: 10, quantity: 2 }] },
        },
      })],
    },
  })
  expect(screen.getByText('$20.00')).toBeInTheDocument()
})
```

## Testing Nuxt Pages

```typescript
// Use @nuxt/test-utils for Nuxt-specific testing
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from '~/pages/index.vue'

test('renders index page', async () => {
  const component = await mountSuspended(IndexPage)
  expect(component.text()).toContain('Welcome')
})
```

## Mocking

```typescript
// Mock composable
vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    user: ref({ name: 'Test User' }),
    isAuthenticated: ref(true),
  }),
}))

// Mock $fetch in Nuxt
vi.mock('#app', () => ({
  $fetch: vi.fn().mockResolvedValue({ items: [] }),
}))
```

## Vitest Config for Vue

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom', // or 'happy-dom' (faster)
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
```

## Anti-Patterns

```typescript
// WRONG: testing implementation details
expect(wrapper.vm.internalState).toBe(true)

// RIGHT: test what the user sees
expect(screen.getByRole('button')).toBeDisabled()

// WRONG: snapshot everything
expect(wrapper.html()).toMatchSnapshot() // brittle, hard to review

// RIGHT: targeted assertions
expect(screen.getByRole('heading')).toHaveTextContent('Dashboard')

// WRONG: testing Vue internals
expect(wrapper.vm.$data.count).toBe(1)

// RIGHT: test via interaction and rendered output
await fireEvent.click(screen.getByRole('button', { name: 'Increment' }))
expect(screen.getByText('Count: 1')).toBeInTheDocument()
```
