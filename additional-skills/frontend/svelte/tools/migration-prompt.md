---
type: tool
title: "SvelteKit Migration"
---

# SvelteKit Migration

## Purpose

Guide migration from Svelte 4 to Svelte 5 covering runes adoption, stores-to-signals transition, component API changes, and SvelteKit routing updates. Enables incremental migration without full rewrites.

## When to Use

- Upgrading from Svelte 4 to Svelte 5
- Converting stores ($store) to runes ($state, $derived, $effect)
- Migrating component props from export let to $props()
- Updating event handling from on: to callback props
- Adopting snippets to replace slots

## Prompt Template

```
CONTEXT:
- Current version: [Svelte 4 | Svelte 5 preview]
- SvelteKit version: [1.x | 2.x]
- Component count: [approximate]
- Store usage: [writable | readable | derived | custom stores]
- Slot usage: [default | named | slot props]
- Event dispatching: [createEventDispatcher usage]
- TypeScript: [yes | no]

MIGRATION PATH:
1. Runes adoption ($state, $derived, $effect)
   - let x = value -> let x = $state(value)
   - $: derived = expr -> let derived = $derived(expr)
   - $: { sideEffect() } -> $effect(() => { sideEffect() })
   - Reactive declarations replaced by fine-grained reactivity
   - $state.raw() for non-deep-reactive objects

2. Props migration
   - export let prop -> let { prop } = $props()
   - Default values: let { prop = default } = $props()
   - Rest props: let { known, ...rest } = $props()
   - Bindable props: let { value = $bindable() } = $props()
   - Two-way binding preserved with $bindable()

3. Events to callbacks
   - on:click={handler} -> onclick={handler}
   - createEventDispatcher -> callback props (onchange, onsubmit)
   - Event modifiers (|preventDefault) -> wrapper functions
   - Bubbling: forward with {...$$restProps} -> spread handlers

4. Slots to snippets
   - <slot> -> {#snippet} + {@render}
   - Named slots: <slot name="x"> -> {#snippet x()} {@render x()}
   - Slot props: <slot {data}> -> {#snippet content(data)}
   - Conditional slots: $$slots.name -> snippet existence check

5. Store migration
   - writable(value) -> $state(value) in .svelte.ts files
   - derived(stores, fn) -> $derived(expr)
   - $store auto-subscription -> direct access in runes mode
   - Custom stores: class with $state fields
   - Shared state: export from .svelte.ts module

6. SvelteKit specifics
   - Load functions unchanged
   - Form actions unchanged
   - +page.svelte and +layout.svelte use runes
   - $app/stores still works (getStores, page, navigating)

INCREMENTAL STRATEGY:
- Svelte 5 is backward-compatible with Svelte 4 syntax
- Migrate per-component (no big-bang required)
- Start with leaf components (no children/slots)
- Use migration script: npx sv migrate svelte-5
- Enable per-component with runes mode
```

## Output Format

```
## Svelte Migration: 4 -> 5

### Automated Migration
| Command | Scope | Success Rate |
|---------|-------|--------------|
| npx sv migrate svelte-5 | full project | ... |

### Manual Changes Required
| Pattern | Old Syntax | New Syntax | Count |
|---------|-----------|-----------|-------|
| Props | export let | $props() | ... |
| Reactivity | $: | $derived/$state | ... |
| Events | on:event | onevent | ... |
| Slots | <slot> | {#snippet} | ... |

### Migration Order
1. [Leaf components: simple props + reactivity]
2. [Components with stores: convert to runes]
3. [Components with slots: convert to snippets]
4. [Event dispatchers: convert to callback props]

### Store Conversion Examples
[Before: writable store pattern]
[After: $state in .svelte.ts module]

### Breaking Changes
| Change | Impact | Workaround |
|--------|--------|-----------|
| ... | ... | ... |

### Testing
- [Verify component behavior unchanged]
- [Check TypeScript inference with new patterns]
- [E2E tests should pass without changes]
```
