# Signals

## Activation

Fine-grained reactivity, Angular signals, Svelte 5 runes, Preact signals, SolidJS signals, framework-agnostic reactive primitives.

## Core Principles

- Signals are reactive atoms. Reading subscribes, writing notifies.
- Computed/derived signals are lazy and cached  -  only recompute when dependencies change.
- Effects run when signal dependencies change. Minimize effects.
- Fine-grained = only the exact consumer re-renders, not the whole component tree.
- Signals replace the "push" model (setState + re-render tree) with "pull" model (read when needed).

## Framework Comparison

| Concept | Angular | Svelte 5 | Preact | SolidJS |
|---------|---------|-----------|--------|---------|
| Create | `signal(value)` | `$state(value)` | `signal(value)` | `createSignal(value)` |
| Read | `mySignal()` | `myState` | `mySignal.value` | `mySignal()` |
| Write | `mySignal.set(v)` | `myState = v` | `mySignal.value = v` | `setMySignal(v)` |
| Computed | `computed(() => ...)` | `$derived(...)` | `computed(() => ...)` | `createMemo(() => ...)` |
| Effect | `effect(() => ...)` | `$effect(() => ...)` | `effect(() => ...)` | `createEffect(() => ...)` |
| Untrack | `untracked(() => ...)` | `$state.raw(...)` | `batch(() => ...)` | `untrack(() => ...)` |

## Patterns

### Angular Signals

```typescript
import { signal, computed, effect } from '@angular/core';

@Component({ ... })
export class CartComponent {
  items = signal<CartItem[]>([]);
  total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.qty, 0)
  );

  addItem(item: CartItem) {
    this.items.update((items) => [...items, item]);
  }

  constructor() {
    effect(() => {
      console.log(`Cart total: ${this.total()}`);
    });
  }
}
```

### Svelte 5 Runes

```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);

  $effect(() => {
    console.log(`count changed: ${count}`);
  });

  function increment() {
    count += 1;
  }
</script>

<button onclick={increment}>{count} (doubled: {doubled})</button>
```

### Preact Signals

```typescript
import { signal, computed, effect } from '@preact/signals';

// Can live OUTSIDE components  -  truly global
const count = signal(0);
const doubled = computed(() => count.value * 2);

// Auto-subscribes  -  only this text node re-renders
function Counter() {
  return <div>Count: {count} Doubled: {doubled}</div>;
}

// Batch updates
import { batch } from '@preact/signals';
batch(() => {
  count.value = 5;
  // other signal updates...
});
```

### Shared Signal Pattern (Cross-Component)

```typescript
// signals/theme.ts
import { signal, computed } from '@preact/signals';

export const theme = signal<'light' | 'dark'>('light');
export const isDark = computed(() => theme.value === 'dark');
export const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
};
```

## When to Use Signals vs Traditional State

| Scenario | Signals | useState/stores |
|----------|---------|-----------------|
| Frequent updates (animations, timers) | Preferred  -  no re-render overhead | Expensive re-renders |
| Deeply nested component reads | Preferred  -  surgical updates | Context re-renders all consumers |
| Simple form state | Either works | Familiar pattern |
| Server state / caching | No  -  use TanStack Query | No  -  use TanStack Query |
| Shared across distant components | Signals shine here | Requires context/store |

## Anti-patterns

- Effects that write to other signals (cascading updates)  -  use computed instead.
- Reading signals outside reactive context loses tracking.
- Storing signal references in plain objects breaks reactivity in some frameworks.
- Over-granular signals (one per field of one object)  -  group related state.
