# Subskill: Runes

## Activation

Triggered when task involves: reactive state, `$state`, `$derived`, `$effect`, `$props`, `$bindable`, component props, shared state, `.svelte.ts` files.

## Core Principles

1. **Runes are compiler directives** — they signal the Svelte compiler to instrument reactivity. They are not runtime functions.
2. **Granular reactivity** — `$state` creates deep reactive proxies. Arrays/objects are reactive at property level.
3. **Derivation hierarchy** — `$derived` > `$effect`. If the value is a pure function of other state, it's `$derived`.
4. **Effects are exits** — `$effect` is an escape hatch to the imperative world (DOM, timers, network).

## Decision Table

| Need | Use | Not |
|------|-----|-----|
| Mutable reactive value | `$state(initial)` | `let x = 0` |
| Computed from state | `$derived(expr)` | `$effect` + assignment |
| Complex derivation | `$derived.by(() => { ... })` | `$effect` |
| Side effect on change | `$effect(() => { ... })` | `$derived` |
| Component input | `let { x } = $props()` | `export let x` |
| Two-way binding | `let { x = $bindable() } = $props()` | event dispatch |
| Non-reactive large data | `$state.raw(data)` | `$state(data)` |
| Snapshot for external API | `$state.snapshot(obj)` | spreading |
| Shared across components | `.svelte.ts` with exported `$state` | stores |

## Patterns

### Declaring State

```svelte
<script lang="ts">
  // Simple primitive
  let count = $state(0);

  // Object (deep reactive)
  let user = $state({ name: 'Ada', age: 30 });

  // Array (reactive push/pop/splice)
  let items = $state<string[]>([]);

  // Non-reactive (large dataset, reference equality)
  let cache = $state.raw(new Map<string, Data>());
</script>
```

### Derived Values

```svelte
<script lang="ts">
  let count = $state(0);

  // Simple expression
  let doubled = $derived(count * 2);

  // Complex logic
  let summary = $derived.by(() => {
    if (count === 0) return 'empty';
    if (count < 10) return 'few';
    return 'many';
  });
</script>
```

### Effects (Side Effects Only)

```svelte
<script lang="ts">
  let query = $state('');

  // Runs when query changes, auto-tracks dependencies
  $effect(() => {
    const controller = new AbortController();
    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { results = data; });

    // Cleanup runs before re-execution and on destroy
    return () => controller.abort();
  });

  // Pre-effect (runs before DOM update)
  $effect.pre(() => {
    // scroll position preservation, etc.
  });
</script>
```

### Props

```svelte
<script lang="ts">
  interface Props {
    name: string;
    count?: number;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let { name, count = 0, onclick, children }: Props = $props();
</script>
```

### Bindable Props

```svelte
<script lang="ts">
  interface Props {
    value?: string;
  }

  let { value = $bindable('') }: Props = $props();
</script>

<input bind:value={value} />
```

### Shared State (.svelte.ts)

```typescript
// counter.svelte.ts
let count = $state(0);

export function getCount() { return count; }
export function increment() { count++; }
export function reset() { count = 0; }
```

### Class with Reactive Fields

```typescript
// todo.svelte.ts
export class TodoStore {
  items = $state<Todo[]>([]);
  filter = $state<'all' | 'active' | 'done'>('all');

  filtered = $derived.by(() => {
    if (this.filter === 'all') return this.items;
    return this.items.filter(t =>
      this.filter === 'done' ? t.done : !t.done
    );
  });

  add(text: string) {
    this.items.push({ id: crypto.randomUUID(), text, done: false });
  }

  toggle(id: string) {
    const item = this.items.find(t => t.id === id);
    if (item) item.done = !item.done;
  }
}
```

## Anti-Patterns

```svelte
<!-- BAD: deriving state in $effect -->
<script>
  let count = $state(0);
  let doubled = $state(0);
  $effect(() => { doubled = count * 2; }); // WRONG
</script>

<!-- GOOD: use $derived -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

```svelte
<!-- BAD: untracked dependency -->
<script>
  let a = $state(0);
  let b = $state(0);
  // Only re-runs when `a` changes, not `b`
  $effect(() => {
    console.log(a);
    setTimeout(() => console.log(b), 0); // b read async = untracked
  });
</script>
```

## Rules

- Every `$effect` must have a comment explaining WHY it's an effect, not a derivation.
- Prefer `$derived.by` over `$effect` + state assignment — always.
- Use `$state.raw()` for data > 1000 items or data not rendered reactively.
- Cleanup: always return cleanup function from effects with subscriptions/timers/fetches.
