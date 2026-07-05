---
type: fact
title: Svelte 4 to Svelte 5 Migration Reference
---

# Svelte 5 Migration Guide

## Syntax Changes (Complete Map)

| Svelte 4 | Svelte 5 | Notes |
|----------|----------|-------|
| `let x = 0` (reactive) | `let x = $state(0)` | Explicit reactivity |
| `export let prop` | `let { prop } = $props()` | Destructured props |
| `export let prop = default` | `let { prop = default } = $props()` | Default values |
| `$: derived = x * 2` | `let derived = $derived(x * 2)` | Computed values |
| `$: { sideEffect() }` | `$effect(() => { sideEffect() })` | Side effects |
| `$: if (x) { ... }` | `$effect(() => { if (x) { ... } })` | Conditional effects |
| `$$props` | `let props = $props()` | All props object |
| `$$restProps` | `let { known, ...rest } = $props()` | Rest props |
| `<slot />` | `{@render children()}` | Default content projection |
| `<slot name="header" />` | `{@render header()}` | Named content projection |
| `let:item` (slot props) | Snippet parameters | `{#snippet row(item)}` |
| `on:click={handler}` | `onclick={handler}` | Event handlers |
| `on:click\|preventDefault` | Manual in handler | No more modifiers |
| `createEventDispatcher()` | Callback props | `onclick` prop |
| `<Component on:click>` | `<Component onclick={handler}>` | Event forwarding gone |
| `writable(x)` | `$state(x)` in `.svelte.ts` | Shared state |
| `readable(x)` | Exported getter in `.svelte.ts` | Read-only shared |
| `derived(store, fn)` | `$derived(expr)` | Computed |
| `$store` (auto-subscribe) | Direct access (state is value) | No $ prefix needed |
| `beforeUpdate` | `$effect.pre` | Pre-DOM update |
| `afterUpdate` | `$effect` | Post-DOM update |
| `onMount` | `$effect` (return cleanup) | Still works but effect preferred |
| `onDestroy` | `$effect` return | Cleanup function |
| `tick()` | `flushSync()` from `svelte` | Synchronous flush |

## Migration Strategy

### Phase 1: Mechanical Transforms (Safe, No Logic Changes)

1. `export let` → `$props()` (one component at a time)
2. `on:event` → `onevent` attribute syntax
3. `<slot>` → snippets (start with leaf components)

### Phase 2: Reactivity (Requires Understanding Logic)

1. Identify reactive `let` declarations → `$state()`
2. Identify `$:` that are derivations → `$derived()`
3. Identify `$:` that are side effects → `$effect()`
4. Watch for `$:` that are BOTH (split into derived + effect)

### Phase 3: Stores → Shared State

1. Find `writable`/`readable`/`derived` imports
2. Create equivalent `.svelte.ts` modules
3. Replace `$store` references with direct state access
4. Remove `svelte/store` imports

## Event Handling Migration

```svelte
<!-- Svelte 4 -->
<button on:click|preventDefault|stopPropagation={handler}>

<!-- Svelte 5 -->
<button onclick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  handler(e);
}}>
```

```svelte
<!-- Svelte 4: Event forwarding -->
<button on:click>

<!-- Svelte 5: Explicit callback prop -->
<script lang="ts">
  let { onclick }: { onclick?: (e: MouseEvent) => void } = $props();
</script>
<button {onclick}>
```

## Snippet Migration

```svelte
<!-- Svelte 4: Named slots with props -->
<Card>
  <span slot="header">Title</span>
  <div slot="body" let:data>{data.content}</div>
</Card>

<!-- Card.svelte (Svelte 4) -->
<slot name="header" />
<slot name="body" {data} />
```

```svelte
<!-- Svelte 5: Snippets -->
<Card>
  {#snippet header()}
    <span>Title</span>
  {/snippet}
  {#snippet body(data)}
    <div>{data.content}</div>
  {/snippet}
</Card>

<!-- Card.svelte (Svelte 5) -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    header: Snippet;
    body: Snippet<[{ content: string }]>;
  }
  let { header, body }: Props = $props();
</script>
{@render header()}
{@render body(data)}
```

## Store → Shared State Migration

```typescript
// Svelte 4: src/lib/stores/auth.ts
import { writable, derived } from 'svelte/store';

export const user = writable<User | null>(null);
export const isLoggedIn = derived(user, ($user) => $user !== null);
export function login(u: User) { user.set(u); }
export function logout() { user.set(null); }
```

```typescript
// Svelte 5: src/lib/state/auth.svelte.ts
let user = $state<User | null>(null);

export function getUser() { return user; }
export const isLoggedIn = $derived(user !== null);
export function login(u: User) { user = u; }
export function logout() { user = null; }
```

## Gotchas

1. **`$state` is deep reactive**  -  objects/arrays are proxied. Use `$state.raw()` if you need reference equality checks.
2. **`$derived` must be pure**  -  no side effects inside. If you need both a derived value and a side effect, split them.
3. **`$effect` auto-tracks synchronous reads only**  -  async reads (inside `await`, `setTimeout`) are not tracked.
4. **Props are not reactive by default in parent**  -  passing `$state` to a child: child sees updates. But child mutations don't flow back unless `$bindable()`.
5. **`onMount` still works**  -  but `$effect` with cleanup is more idiomatic in Svelte 5.
6. **Stores still work**  -  migration is recommended but not required. Mix is allowed during transition.
