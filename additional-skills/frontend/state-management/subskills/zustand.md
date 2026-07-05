# Zustand

## Version Note (v5  -  current stable, released 2024)

- **Breaking:** Custom equality function as second arg to `create` is removed. Use `useShallow` from `zustand/shallow` for shallow comparison:
  ```ts
  import { useShallow } from 'zustand/shallow';
  const { name, age } = useStore(useShallow((s) => ({ name: s.name, age: s.age })));
  ```
- `subscribeWithSelector` middleware is less necessary  -  `subscribe` now supports selectors natively.
- TypeScript: `create<T>()(...)` double-call pattern is still required for type inference with middleware.

## Activation

React client-side synchronous state, stores, slices, middleware, persistence, devtools.

## Core Principles

- One store per domain concern (auth, UI, cart) not one mega-store.
- Slices pattern for large stores: compose independently, merge at creation.
- Selectors prevent unnecessary re-renders. Always select minimal state.
- Middleware order matters: `devtools(persist(immer(...)))`  -  outer wraps inner.
- Actions live inside the store. No external mutation.

## Decision Table

| Need | Pattern |
|------|---------|
| Simple state | Single store, direct set |
| Complex updates | `immer` middleware |
| Persistence | `persist` middleware with storage adapter |
| Debugging | `devtools` middleware (dev only) |
| Large store | Slice pattern with `StateCreator` |
| Shared across tabs | `persist` + `BroadcastChannel` or `shared` storage |
| Transient state (no re-render) | `subscribeWithSelector` + `getState()` |
| Computed values | Derive in selector, not in store |

## Patterns

### Basic Store

```typescript
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  reset: () => void;
}

const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set({ count: 0 }),
}));

// Usage with selector (prevents re-render on unrelated changes)
const count = useCounterStore((s) => s.count);
```

### Slice Pattern

```typescript
import { create, StateCreator } from 'zustand';

interface AuthSlice {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

type AppStore = AuthSlice & UISlice;

const createAuthSlice: StateCreator<AppStore, [], [], AuthSlice> = (set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
});

const createUISlice: StateCreator<AppStore, [], [], UISlice> = (set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
});

const useAppStore = create<AppStore>()((...a) => ({
  ...createAuthSlice(...a),
  ...createUISlice(...a),
}));
```

### Persist Middleware

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token: string) => set({ token }),
      clearToken: () => set({ token: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ token: state.token }), // only persist token
    },
  ),
);
```

### Immer for Complex Updates

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useCartStore = create<CartState>()(
  immer((set) => ({
    items: [],
    addItem: (item: CartItem) =>
      set((state) => {
        const existing = state.items.find((i) => i.id === item.id);
        if (existing) existing.quantity += 1;
        else state.items.push({ ...item, quantity: 1 });
      }),
    removeItem: (id: string) =>
      set((state) => {
        state.items = state.items.filter((i) => i.id !== id);
      }),
  })),
);
```

## Anti-patterns

- Selecting entire store: `useStore()`  -  causes re-render on any change.
- Storing server data  -  use TanStack Query instead.
- Effects that sync between stores  -  derive or merge stores.
- Creating stores inside components  -  creates new store per render.
