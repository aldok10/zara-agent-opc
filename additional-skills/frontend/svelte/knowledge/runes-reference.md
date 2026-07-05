---
type: fact
title: Svelte 5 Runes API Reference
---

# Runes Reference

## $state

Creates reactive state. The compiler instruments assignments to trigger updates.

```typescript
let count = $state(0);              // primitive
let user = $state({ name: 'Ada' }); // deep reactive object
let items = $state<string[]>([]);   // typed array

// Reassignment triggers reactivity
count = 1;
user.name = 'Bob';    // deep: property assignment works
items.push('new');    // deep: array methods work
```

### $state.raw

Creates state without deep reactivity. Only reassignment (not property mutation) triggers updates. Use for large datasets or when you need reference equality.

```typescript
let data = $state.raw(largeDataset);

// This triggers update:
data = newDataset;

// This does NOT trigger update:
data.items.push(item); // silent, no reactivity
```

### $state.snapshot

Creates a plain (non-reactive) copy of reactive state. Use when passing to external libraries that don't understand Svelte proxies.

```typescript
let obj = $state({ a: 1, nested: { b: 2 } });
const plain = $state.snapshot(obj); // { a: 1, nested: { b: 2 } }  -  no proxy
JSON.stringify(plain); // safe, no circular proxy refs
```

## $derived

Creates a computed value that auto-updates when dependencies change. Must be a pure expression (no side effects).

```typescript
let count = $state(0);
let doubled = $derived(count * 2);
let message = $derived(`Count is ${count}`);

// Complex derivation with block body
let filtered = $derived.by(() => {
  const result = items.filter(i => i.active);
  return result.sort((a, b) => a.name.localeCompare(b.name));
});
```

### Rules

- Read-only: you cannot assign to `$derived`.
- Lazy: only recalculates when read after a dependency changes.
- Pure: no side effects inside (no fetch, no DOM manipulation, no assignments to other state).

## $effect

Runs side effects when dependencies change. Auto-tracks synchronous reads.

```typescript
$effect(() => {
  // Runs after DOM update when `count` changes
  document.title = `Count: ${count}`;
});

// With cleanup (runs before re-execution and on destroy)
$effect(() => {
  const interval = setInterval(() => tick(), 1000);
  return () => clearInterval(interval);
});
```

### $effect.pre

Runs before DOM update. Use for scroll preservation or pre-render calculations.

```typescript
$effect.pre(() => {
  // Runs before DOM is updated
  previousScrollHeight = container.scrollHeight;
});
```

### $effect.tracking

Returns whether code is running inside a tracking context (effect or derived).

```typescript
$effect(() => {
  console.log($effect.tracking()); // true
});

// Outside any reactive context:
console.log($effect.tracking()); // false
```

### $effect.root

Creates a non-tracked root effect scope. Must be manually cleaned up.

```typescript
const cleanup = $effect.root(() => {
  $effect(() => {
    // This effect's lifecycle is controlled by the root
  });
});

// Later: manually destroy
cleanup();
```

### Dependency Tracking Rules

- Only synchronous reads are tracked.
- Reads inside `await`, `setTimeout`, `Promise.then` are NOT tracked.
- Reads inside `untrack()` are NOT tracked.

```typescript
import { untrack } from 'svelte';

$effect(() => {
  // `a` is tracked, `b` is not
  console.log(a, untrack(() => b));
});
```

## $props

Declares component props. Replaces `export let`.

```typescript
// Basic
let { name, age } = $props();

// With types
interface Props {
  name: string;
  age?: number;
  children?: import('svelte').Snippet;
}
let { name, age = 25, children }: Props = $props();

// Rest props
let { class: className, ...rest } = $props();
```

## $bindable

Marks a prop as two-way bindable. Parent can use `bind:prop`.

```typescript
interface Props {
  value?: string;
  open?: boolean;
}
let { value = $bindable(''), open = $bindable(false) }: Props = $props();
```

Parent usage:
```svelte
<Input bind:value={searchTerm} />
<Dialog bind:open={isOpen} />
```

## $inspect

Development-only debugging. Logs when tracked values change. Stripped in production.

```typescript
let count = $state(0);
$inspect(count); // logs: "init 0", then "update 1", etc.

// Custom handler
$inspect(count).with((type, value) => {
  if (type === 'update') debugger;
});
```

## $host

Access the host element in custom elements (web components only).

```typescript
// Only in components compiled as custom elements
$host().dispatchEvent(new CustomEvent('change'));
```

## Snippets

Replace slots for content projection. Type-safe, composable.

```svelte
<!-- Declaring a snippet -->
{#snippet greeting(name: string)}
  <h1>Hello {name}!</h1>
{/snippet}

<!-- Rendering a snippet -->
{@render greeting('World')}

<!-- Optional snippet (check before render) -->
{#if footer}
  {@render footer()}
{/if}
```

### Snippet as Props

```svelte
<!-- Parent -->
<List items={data}>
  {#snippet row(item)}
    <span>{item.name}</span>
  {/snippet}
</List>

<!-- List.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    items: Item[];
    row: Snippet<[Item]>;
  }
  let { items, row }: Props = $props();
</script>

<ul>
  {#each items as item}
    <li>{@render row(item)}</li>
  {/each}
</ul>
```

### Children Snippet

`children` is the implicit snippet for content between component tags.

```svelte
<!-- Parent -->
<Card>
  <p>This becomes the children snippet</p>
</Card>

<!-- Card.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children?: Snippet } = $props();
</script>

<div class="card">
  {@render children?.()}
</div>
```
