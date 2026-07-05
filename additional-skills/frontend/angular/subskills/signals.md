# Signals Subskill

Activation: user works with signals, computed state, effects, resource loading, or RxJS-signal interop.

## Core Principles

1. Signals are synchronous, glitch-free, pull-based reactivity.
2. Computed signals are lazy  -  only recalculate when read and dependencies changed.
3. Effects run in the microtask queue after signal changes settle.
4. Never mutate signal values in computed  -  computed must be pure.
5. Use `untracked()` to read signals without creating dependencies.

## Decision Table

| Scenario | Use |
|----------|-----|
| Simple local state | `signal(initialValue)` |
| Derived from other signals | `computed(() => ...)` |
| Derived + needs reset/override | `linkedSignal({ source, computation })` |
| Side effect on change | `effect(() => { ... })` |
| Async data from HTTP | `httpResource(url)` or `resource({ loader })` |
| RxJS Observable to signal | `toSignal(obs$, { initialValue })` |
| Signal to Observable | `toObservable(sig)` |
| Parent input | `input<T>()` / `input.required<T>()` |
| Two-way binding | `model<T>()` |
| Query signal from parent | `viewChild()` / `viewChildren()` / `contentChild()` |

## Signal Primitives

### signal()

```typescript
import { signal } from '@angular/core';

// Writable signal with initial value
const count = signal(0);

// Read
console.log(count()); // 0

// Write
count.set(5);
count.update(v => v + 1);
```

### computed()

```typescript
import { signal, computed } from '@angular/core';

const price = signal(100);
const quantity = signal(2);
const total = computed(() => price() * quantity());
// total() === 200, recalculates only when price or quantity changes
```

### effect()

```typescript
import { signal, effect } from '@angular/core';

const query = signal('');

// Runs when query changes, after stabilization
effect(() => {
  console.log('Search:', query());
});

// Cleanup pattern
effect((onCleanup) => {
  const timer = setTimeout(() => search(query()), 300);
  onCleanup(() => clearTimeout(timer));
});
```

### linkedSignal()

```typescript
import { signal, linkedSignal } from '@angular/core';

const items = signal(['a', 'b', 'c']);

// Resets to first item when source changes, but user can override
const selected = linkedSignal({
  source: items,
  computation: (items) => items[0],
});

selected.set('b'); // manual override
items.set(['x', 'y']); // selected resets to 'x'
```

### resource() / httpResource()

```typescript
import { signal, resource } from '@angular/core';
import { httpResource } from '@angular/common/http';

// Generic resource with custom loader
const userId = signal(1);
const userResource = resource({
  request: () => ({ id: userId() }),
  loader: async ({ request }) => {
    const res = await fetch(`/api/users/${request.id}`);
    return res.json();
  },
});
// userResource.value()  -  the data (or undefined)
// userResource.status()  -  idle | loading | resolved | error
// userResource.error()  -  error if failed

// httpResource (Angular 19.2+)
const user = httpResource<User>(`/api/users/${userId()}`);
```

### toSignal() / toObservable()

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

// Observable -> Signal (requires initialValue or {requireSync: true})
const counter = toSignal(interval(1000), { initialValue: 0 });

// Signal -> Observable
const count = signal(0);
const count$ = toObservable(count);
```

## Input/Output Signals

```typescript
import { Component, input, output, model } from '@angular/core';

@Component({ ... })
export class MyComponent {
  // Input signal (optional with default)
  label = input('default');

  // Required input signal
  id = input.required<string>();

  // Two-way binding signal
  value = model(0);

  // Output
  saved = output<string>();

  save() {
    this.saved.emit(this.id());
  }
}
```

## Patterns

### Debounced search with effect

```typescript
const query = signal('');
const debouncedQuery = signal('');

effect((onCleanup) => {
  const q = query();
  const timer = setTimeout(() => debouncedQuery.set(q), 300);
  onCleanup(() => clearTimeout(timer));
});

const results = httpResource<Result[]>(() =>
  debouncedQuery() ? `/api/search?q=${debouncedQuery()}` : undefined
);
```

### Pagination with linkedSignal

```typescript
const totalPages = signal(10);
const currentPage = linkedSignal({
  source: totalPages,
  computation: () => 1, // reset to page 1 when total changes
});
```

## Gotchas

1. **effect() cannot write signals by default.** Use `allowSignalWrites` option or restructure.
2. **computed() must be pure.** No HTTP calls, no mutations, no effects inside.
3. **toSignal() without initialValue returns `T | undefined`.** Use `{ initialValue }` or handle undefined.
4. **resource() loader must be pure async.** Don't read signals inside the loader; use `request` param.
5. **Signals in templates auto-track.** No need for async pipe or manual subscription.
6. **untracked() prevents dependency.** Use when reading a signal in effect/computed without wanting to re-trigger.
