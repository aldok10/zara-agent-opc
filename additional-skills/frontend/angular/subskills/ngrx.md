# NgRx Subskill

Activation: user works with NgRx SignalStore, global state management, or NgRx effects.

## Core Principles

1. NgRx SignalStore is the modern approach  -  signals-first, no boilerplate.
2. Use SignalStore for feature/global state; component signals for local state.
3. `withComputed()` for derived state, `withMethods()` for actions, `withHooks()` for lifecycle.
4. `rxMethod()` bridges RxJS effects into SignalStore.
5. Prefer SignalStore over classic Store/Reducers/Actions for new code.

## Decision Table

| Scenario | Pattern |
|----------|---------|
| Simple local state | Component `signal()`  -  no store needed |
| Shared feature state | `signalStore()` at feature level |
| Global app state | `signalStore()` with `providedIn: 'root'` |
| Complex async flows | `rxMethod()` in store methods |
| Entity collections | `withEntities()` from `@ngrx/signals/entities` |
| Legacy NgRx codebase | Keep classic Store; migrate incrementally |
| DevTools debugging | `withDevtools()` from `@ngrx/signals/devtools` |

## SignalStore Setup

```typescript
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';

interface TodoState {
  todos: Todo[];
  loading: boolean;
  filter: 'all' | 'active' | 'completed';
}

const initialState: TodoState = {
  todos: [],
  loading: false,
  filter: 'all',
};

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    filteredTodos: computed(() => {
      const filter = store.filter();
      const todos = store.todos();
      switch (filter) {
        case 'active': return todos.filter(t => !t.completed);
        case 'completed': return todos.filter(t => t.completed);
        default: return todos;
      }
    }),
    totalCount: computed(() => store.todos().length),
    completedCount: computed(() => store.todos().filter(t => t.completed).length),
  })),
  withMethods((store, todoService = inject(TodoService)) => ({
    setFilter(filter: TodoState['filter']) {
      patchState(store, { filter });
    },
    addTodo(title: string) {
      const todo: Todo = { id: crypto.randomUUID(), title, completed: false };
      patchState(store, { todos: [...store.todos(), todo] });
    },
    toggleTodo(id: string) {
      patchState(store, {
        todos: store.todos().map(t => t.id === id ? { ...t, completed: !t.completed } : t),
      });
    },
    loadTodos: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
          todoService.getAll().pipe(
            tapResponse({
              next: (todos) => patchState(store, { todos, loading: false }),
              error: () => patchState(store, { loading: false }),
            }),
          ),
        ),
      ),
    ),
  })),
  withHooks({
    onInit(store) {
      store.loadTodos();
    },
  }),
);
```

## Entity Management

```typescript
import { signalStore, withMethods, patchState } from '@ngrx/signals';
import { withEntities, addEntity, removeEntity, updateEntity, setAllEntities } from '@ngrx/signals/entities';

interface User {
  id: string;
  name: string;
  email: string;
}

export const UserStore = signalStore(
  { providedIn: 'root' },
  withEntities<User>(),
  withMethods((store) => ({
    setUsers(users: User[]) {
      patchState(store, setAllEntities(users));
    },
    addUser(user: User) {
      patchState(store, addEntity(user));
    },
    removeUser(id: string) {
      patchState(store, removeEntity(id));
    },
    updateUserName(id: string, name: string) {
      patchState(store, updateEntity({ id, changes: { name } }));
    },
  })),
);

// Usage  -  store exposes: entities(), ids(), entityMap()
```

## Using Store in Component

```typescript
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TodoStore } from './todo.store';

@Component({
  selector: 'app-todo-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.loading()) {
      <app-spinner />
    } @else {
      @for (todo of store.filteredTodos(); track todo.id) {
        <app-todo-item
          [todo]="todo"
          (toggle)="store.toggleTodo(todo.id)"
        />
      } @empty {
        <p>No todos found.</p>
      }
    }
    <p>{{ store.completedCount() }}/{{ store.totalCount() }} completed</p>
  `,
})
export class TodoListComponent {
  readonly store = inject(TodoStore);
}
```

## Custom Store Features

```typescript
import { signalStoreFeature, withState, withMethods, patchState } from '@ngrx/signals';

// Reusable loading feature
export function withLoading() {
  return signalStoreFeature(
    withState({ loading: false, error: null as string | null }),
    withMethods((store) => ({
      setLoading() { patchState(store, { loading: true, error: null }); },
      setLoaded() { patchState(store, { loading: false }); },
      setError(error: string) { patchState(store, { loading: false, error }); },
    })),
  );
}

// Usage
export const ProductStore = signalStore(
  withLoading(),
  withState({ products: [] as Product[] }),
  // ...
);
```

## DevTools Integration

```typescript
import { withDevtools } from '@ngrx/signals/devtools';

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withDevtools('todos'), // name shown in Redux DevTools
  withState(initialState),
  // ...
);
```

## Gotchas

1. **`patchState()` does shallow merge.** Deep nested updates need spread operators.
2. **`rxMethod()` needs `rxjs-interop` package.** Import from `@ngrx/signals/rxjs-interop`.
3. **Store methods are synchronous unless using `rxMethod()`.** Don't await in regular methods.
4. **`withEntities()` requires `id` property.** Or configure with `{ idKey: 'customId' }`.
5. **Don't inject store in another store.** Use services or store features for composition.
6. **SignalStore is class-based internally.** Provide it in `providers` array or use `providedIn`.
