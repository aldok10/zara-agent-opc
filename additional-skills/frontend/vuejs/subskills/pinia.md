# Subskill: Pinia State Management

Activate when: cross-component state, stores, actions with side effects, SSR state hydration, store composition.

## Core Principles

1. **Setup stores for complex logic.** Function syntax (`defineStore('id', () => {...})`) gives full Composition API power.
2. **Options stores for simple CRUD.** `{ state, getters, actions }` when logic is trivial.
3. **Stores are composables.** Call `useStore()` in setup, composables, or other stores.
4. **Never mutate state outside actions** for traceability (use `$patch` for bulk mutations).
5. **One store per domain.** Don't create god-stores. Compose multiple stores.

## Decision Table: Options vs Setup Store

| Situation | Use | Why |
|-----------|-----|-----|
| Simple state + getters + basic actions | Options | Less boilerplate, familiar |
| Complex async flows, watchers needed | Setup | Full Composition API |
| Need to compose other stores | Setup | Just call `useOtherStore()` inside |
| Need watchers on state | Setup | `watch()` works naturally |
| SSR with Nuxt | Either | Both hydrate correctly with `@pinia/nuxt` |

## Setup Store Pattern

```typescript
// stores/cart.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  // State
  const items = ref<CartItem[]>([])
  const coupon = ref<string | null>(null)

  // Getters (computed)
  const totalItems = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )
  const totalPrice = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  // Actions (plain functions)
  function addItem(product: Product, quantity = 1) {
    const existing = items.value.find(i => i.productId === product.id)
    if (existing) {
      existing.quantity += quantity
    } else {
      items.value.push({ productId: product.id, price: product.price, quantity })
    }
  }

  function removeItem(productId: string) {
    items.value = items.value.filter(i => i.productId !== productId)
  }

  async function checkout() {
    const result = await $fetch('/api/checkout', {
      method: 'POST',
      body: { items: items.value, coupon: coupon.value },
    })
    items.value = []
    coupon.value = null
    return result
  }

  return { items, coupon, totalItems, totalPrice, addItem, removeItem, checkout }
})

interface CartItem {
  productId: string
  price: number
  quantity: number
}

interface Product {
  id: string
  price: number
}
```

## Store Composition

```typescript
// stores/order.ts
import { defineStore } from 'pinia'
import { useCartStore } from './cart'
import { useAuthStore } from './auth'

export const useOrderStore = defineStore('order', () => {
  const cart = useCartStore()
  const auth = useAuthStore()

  async function placeOrder() {
    if (!auth.isAuthenticated) throw new Error('Must be logged in')
    if (cart.totalItems === 0) throw new Error('Cart is empty')
    return await cart.checkout()
  }

  return { placeOrder }
})
```

## Usage in Components

```vue
<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { storeToRefs } from 'pinia'

const cart = useCartStore()

// Destructure reactive state with storeToRefs (preserves reactivity)
const { items, totalItems, totalPrice } = storeToRefs(cart)

// Actions can be destructured directly (they're plain functions)
const { addItem, removeItem } = cart
</script>
```

## $patch for Bulk Mutations

```typescript
// Object syntax (merged)
cart.$patch({ coupon: 'SAVE10', items: [] })

// Function syntax (for complex mutations)
cart.$patch((state) => {
  state.items = state.items.filter(i => i.quantity > 0)
  state.coupon = null
})
```

## Persistence (pinia-plugin-persistedstate)

```typescript
// stores/preferences.ts
export const usePreferencesStore = defineStore('preferences', () => {
  const theme = ref<'light' | 'dark'>('light')
  const locale = ref('en')
  return { theme, locale }
}, {
  persist: true, // localStorage by default
})
```

## Testing Stores

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './cart'

beforeEach(() => {
  setActivePinia(createPinia())
})

test('addItem increases totalItems', () => {
  const cart = useCartStore()
  cart.addItem({ id: '1', price: 10 }, 2)
  expect(cart.totalItems).toBe(2)
})
```

## Anti-Patterns

```typescript
// WRONG: destructuring state without storeToRefs (loses reactivity)
const { items } = useCartStore() // items is a plain array, not reactive
// RIGHT:
const { items } = storeToRefs(useCartStore())

// WRONG: mutating state from outside with direct assignment in component
cart.items.push(newItem) // works but no tracing, no devtools tracking
// RIGHT: use actions
cart.addItem(product)

// WRONG: one massive store for entire app
// RIGHT: one store per domain (auth, cart, ui, notifications)
```
