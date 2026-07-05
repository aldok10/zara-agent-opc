---
type: fact
title: Angular Signals Complete Reference
---

# Angular Signals Complete Reference

## Mental Model

Signals form a reactive graph:
- **signal()** = writable leaf node. Push new values in.
- **computed()** = derived node. Pull-based, lazy, memoized. Recalculates only when dependencies change AND the value is read.
- **effect()** = terminal node. Runs side effects when dependencies change. Scheduled in microtask.

Glitch-free: multiple simultaneous updates propagate atomically before effects/re-renders fire.

## API Reference

### signal<T>(initialValue: T, options?: SignalOptions<T>)

```typescript
const name = signal('Angular');
name();          // read: 'Angular'
name.set('Vue'); // overwrite
name.update(v => v + '!'); // derive from current
```

Options:
- `equal?: (a: T, b: T) => boolean`  -  custom equality (skip redundant updates).

### computed<T>(computation: () => T, options?: { equal? })

```typescript
const firstName = signal('John');
const lastName = signal('Doe');
const fullName = computed(() => `${firstName()} ${lastName()}`);
// fullName() === 'John Doe'
// Only recalculates when firstName or lastName change
```

Rules:
- MUST be pure (no side effects, no signal writes).
- Lazy: doesn't compute until read.
- Memoized: same deps = same cached value.

### effect(fn: (onCleanup: (fn: () => void) => void) => void)

```typescript
effect((onCleanup) => {
  const id = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(id));
});
```

Rules:
- Runs at least once.
- Re-runs when any signal read inside changes.
- Cannot write signals by default (use `{ allowSignalWrites: true }` if needed).
- Tied to injection context (auto-destroyed with component/service).
- Use `untracked(() => sig())` to read without tracking.

### linkedSignal<T>(options)

```typescript
// Short form
const selected = linkedSignal(() => items()[0]);

// Long form with source + computation
const selected = linkedSignal({
  source: items,
  computation: (items) => items[0],
});

// Writable  -  can be manually set, resets when source changes
selected.set(items()[2]);
```

Use cases: pagination reset, form defaults, selection state tied to data source.

### resource<T>(options)

```typescript
const userResource = resource({
  request: () => ({ id: userId() }),
  loader: async ({ request, abortSignal }) => {
    const res = await fetch(`/api/users/${request.id}`, { signal: abortSignal });
    return await res.json() as User;
  },
});
```

Signals exposed:
- `value(): T | undefined`  -  resolved value.
- `status(): ResourceStatus`  -  `idle | loading | resolved | error | reloading | local`.
- `error(): unknown`  -  error if status is `error`.
- `isLoading(): boolean`  -  true during `loading` or `reloading`.
- `reload()`  -  re-trigger loader.
- `set(value)` / `update(fn)`  -  optimistic local update (status becomes `local`).

Behavior:
- `request` re-evaluates reactively. New request value = new loader call.
- Previous loader is aborted via `abortSignal`.
- Return `undefined` from `request` to skip loading.

### httpResource<T>(url | () => url, options?)

```typescript
const users = httpResource<User[]>('/api/users');
const user = httpResource<User>(() => `/api/users/${userId()}`);

// With options
const user = httpResource<User>(() => ({
  url: `/api/users/${userId()}`,
  method: 'GET',
  headers: { 'X-Custom': 'value' },
}));
```

Same signals as `resource()`. Uses Angular's HttpClient internally (interceptors apply).

### toSignal<T>(observable$, options?)

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

// With initial value  -  returns Signal<T>
const data = toSignal(data$, { initialValue: [] });

// Without  -  returns Signal<T | undefined>
const data = toSignal(data$);

// Require synchronous emission (BehaviorSubject)  -  returns Signal<T>
const data = toSignal(data$, { requireSync: true });
```

Options:
- `initialValue: T`  -  value before first emission.
- `requireSync: boolean`  -  error if source doesn't emit synchronously.
- `manualCleanup: boolean`  -  don't auto-unsubscribe on destroy.
- `injector: Injector`  -  custom injection context.

### toObservable<T>(signal)

```typescript
import { toObservable } from '@angular/core/rxjs-interop';

const count = signal(0);
const count$ = toObservable(count);
// Emits on every signal change (via effect internally)
```

### untracked<T>(fn: () => T): T

```typescript
effect(() => {
  const query = searchQuery(); // tracked
  const config = untracked(() => appConfig()); // NOT tracked
  // Effect re-runs only when searchQuery changes, not appConfig
});
```

## Input/Output/Model Signals

### input()

```typescript
// Optional with default
label = input('Click me');           // InputSignal<string>

// Required
id = input.required<string>();       // InputSignal<string>

// With transform
size = input(0, { transform: numberAttribute }); // InputSignal<number>
disabled = input(false, { transform: booleanAttribute });

// With alias
name = input('', { alias: 'userName' }); // bound as [userName]
```

### output()

```typescript
clicked = output<MouseEvent>();  // OutputEmitterRef<MouseEvent>
saved = output<void>();          // OutputEmitterRef<void>

// Emit
this.clicked.emit(event);
this.saved.emit();

// With alias
done = output<string>({ alias: 'completed' }); // (completed)="handler($event)"
```

### model()

```typescript
value = model(0);              // ModelSignal<number>
value = model.required<string>(); // required two-way binding

// Parent template: <child [(value)]="parentSignal" />
// Child can read and write: this.value.set(newValue)
```

### viewChild / viewChildren / contentChild / contentChildren

```typescript
// Query signal  -  updates when view changes
chart = viewChild<ElementRef>('chartCanvas');         // Signal<ElementRef | undefined>
chart = viewChild.required<ElementRef>('chartCanvas'); // Signal<ElementRef>
items = viewChildren(ItemComponent);                   // Signal<readonly ItemComponent[]>
header = contentChild(HeaderComponent);                // Signal<HeaderComponent | undefined>
```

## Patterns

### Derived state with reset

```typescript
const items = signal<Item[]>([]);
const selectedIndex = linkedSignal({
  source: items,
  computation: () => 0, // reset to first when items change
});
```

### Conditional resource loading

```typescript
const userId = signal<string | null>(null);
const user = resource({
  request: () => userId() ? { id: userId()! } : undefined, // skip when null
  loader: async ({ request }) => fetchUser(request.id),
});
```

### Signal-based form field

```typescript
const email = signal('');
const emailError = computed(() => {
  const v = email();
  if (!v) return 'Required';
  if (!v.includes('@')) return 'Invalid email';
  return null;
});
const isValid = computed(() => emailError() === null);
```

### Optimistic update with resource

```typescript
const todoResource = resource({ ... });

function toggleTodo(id: string) {
  // Optimistic update  -  status becomes 'local'
  todoResource.update(todos =>
    todos?.map(t => t.id === id ? { ...t, done: !t.done } : t)
  );
  // Then persist
  saveTodo(id).catch(() => todoResource.reload());
}
```

## Performance Notes

1. **computed() is lazy.** Unread computed signals never evaluate. Free to create many.
2. **Signal equality check prevents cascading.** Default is `Object.is`. Custom for objects.
3. **Effects batch.** Multiple signal writes before microtask = single effect execution.
4. **Template signals auto-track.** Angular CD only re-checks components with changed signal deps.
5. **Avoid expensive computation in signal reads.** Move to computed with memoization.
