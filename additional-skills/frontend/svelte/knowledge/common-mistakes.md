---
type: pitfall
title: Common Svelte 5 Mistakes and Fixes
---

# Common Mistakes

## 1. Deriving State in $effect (Most Common)

```svelte
<!-- WRONG -->
<script>
  let items = $state<Item[]>([]);
  let count = $state(0);

  $effect(() => {
    count = items.length; // Derived value in effect = anti-pattern
  });
</script>

<!-- CORRECT -->
<script>
  let items = $state<Item[]>([]);
  let count = $derived(items.length);
</script>
```

**Why**: `$effect` runs after render. Assigning state in it causes an extra render cycle. `$derived` is synchronous and avoids the double-render.

## 2. Expecting Reactivity Without $state

```svelte
<!-- WRONG -->
<script>
  let count = 0; // Not reactive in Svelte 5!
</script>
<button onclick={() => count++}>{count}</button>
<!-- Button click updates variable but UI won't reflect it -->

<!-- CORRECT -->
<script>
  let count = $state(0);
</script>
<button onclick={() => count++}>{count}</button>
```

## 3. Async Reads Not Tracked in $effect

```svelte
<!-- WRONG: searchTerm changes won't re-trigger after await -->
<script>
  let searchTerm = $state('');
  let results = $state([]);

  $effect(() => {
    const res = await fetch(`/api?q=${searchTerm}`); // tracked
    const data = await res.json();
    results = data; // BUT if searchTerm changes during await, no re-run
  });
</script>

<!-- CORRECT: capture dependency synchronously -->
<script>
  let searchTerm = $state('');
  let results = $state([]);

  $effect(() => {
    const query = searchTerm; // tracked synchronously
    const controller = new AbortController();

    fetch(`/api?q=${query}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { results = data; });

    return () => controller.abort();
  });
</script>
```

## 4. Mutating $derived

```svelte
<!-- WRONG: $derived is read-only -->
<script>
  let items = $state([1, 2, 3]);
  let sorted = $derived(items.toSorted());

  function addItem() {
    sorted.push(4); // ERROR: cannot mutate derived
  }
</script>

<!-- CORRECT: mutate the source state -->
<script>
  let items = $state([1, 2, 3]);
  let sorted = $derived(items.toSorted());

  function addItem() {
    items.push(4); // sorted auto-updates
  }
</script>
```

## 5. Missing Key in {#each} with animate

```svelte
<!-- WRONG: animate requires keyed each -->
{#each items as item}
  <li animate:flip>{item.name}</li>
{/each}
<!-- Compiler error: animate requires keyed each block -->

<!-- CORRECT -->
{#each items as item (item.id)}
  <li animate:flip>{item.name}</li>
{/each}
```

## 6. Using Stores in New Svelte 5 Code

```typescript
// WRONG: legacy pattern
import { writable } from 'svelte/store';
export const count = writable(0);

// CORRECT: .svelte.ts module
// count.svelte.ts
let count = $state(0);
export function getCount() { return count; }
export function setCount(v: number) { count = v; }
```

## 7. Event Dispatch Pattern (Removed)

```svelte
<!-- WRONG: createEventDispatcher is legacy -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>
<button onclick={() => dispatch('save', data)}>Save</button>

<!-- CORRECT: callback props -->
<script lang="ts">
  let { onsave }: { onsave?: (data: Data) => void } = $props();
</script>
<button onclick={() => onsave?.(data)}>Save</button>
```

## 8. $state with Non-POJOs

```svelte
<!-- CAUTION: $state proxies deeply -->
<script>
  // Map/Set/Date are proxied but may behave unexpectedly
  let map = $state(new Map()); // Works but be careful

  // For complex non-POJO objects, prefer $state.raw
  let map = $state.raw(new Map());

  // Trigger updates by reassignment
  function addEntry(k: string, v: string) {
    map = new Map([...map, [k, v]]);
  }
</script>
```

## 9. Forgetting Cleanup in $effect

```svelte
<!-- WRONG: memory leak -->
<script>
  $effect(() => {
    window.addEventListener('resize', handleResize);
    // Missing cleanup! Listeners accumulate on re-runs
  });
</script>

<!-- CORRECT -->
<script>
  $effect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
</script>
```

## 10. Infinite Effect Loops

```svelte
<!-- WRONG: reading and writing same state in effect -->
<script>
  let count = $state(0);

  $effect(() => {
    count = count + 1; // reads count (tracks) then writes (triggers re-run) = infinite loop
  });
</script>

<!-- CORRECT: use untrack if you must read without tracking -->
<script>
  import { untrack } from 'svelte';

  let count = $state(0);

  $effect(() => {
    // Only runs when `trigger` changes, not `count`
    if (trigger) {
      count = untrack(() => count) + 1;
    }
  });
</script>
```

## 11. Snippet Typing Mistakes

```svelte
<!-- WRONG: snippet with wrong parameter type -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  // Snippet generic is a TUPLE of parameters
  let { row }: { row: Snippet<Item> } = $props(); // WRONG
  let { row }: { row: Snippet<[Item]> } = $props(); // CORRECT
</script>
```

## 12. Props Reactivity Assumption

```svelte
<!-- WRONG assumption: destructured props lose reactivity? -->
<script>
  // Actually CORRECT in Svelte 5 - compiler handles this
  let { count } = $props(); // reactive! Updates when parent changes
</script>

<!-- But: you cannot reassign a prop locally unless $bindable -->
<script>
  let { count } = $props();
  count = 5; // WARNING: reassigning prop without $bindable
</script>
```

## Summary Decision Tree

```
Need a value? →
  Static (never changes)? → const x = value
  Changes over time? → let x = $state(value)
  Computed from other state? → let x = $derived(expr)
  Need side effect on change? → $effect(() => { ... })
  Received from parent? → let { x } = $props()
  Two-way from parent? → let { x = $bindable() } = $props()
  Shared across components? → .svelte.ts with exported $state
```
