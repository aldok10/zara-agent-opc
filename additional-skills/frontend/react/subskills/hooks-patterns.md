# Subskill: Hooks Patterns

> Activate when: building custom hooks, composing hooks, debugging hook rules violations, or choosing between hooks.

## Core Principles

1. Hooks are functions that let you "hook into" React state and lifecycle from function components.
2. Rules of Hooks: call at top level only, never inside conditions/loops/nested functions.
3. Custom hooks extract reusable stateful logic — they share logic, not state.
4. Name custom hooks `use*` — the Compiler and linter rely on this convention.
5. A hook should do ONE thing. Compose small hooks into larger ones.

## React 19 Hook Changes

| Hook | Status in React 19 |
|------|-------------------|
| `use()` | NEW — unwrap promises and context |
| `useActionState` | NEW — form action state management |
| `useFormStatus` | NEW — pending state in forms |
| `useOptimistic` | NEW — optimistic UI updates |
| `useContext` | Still works but `use(Context)` preferred |
| `useMemo`/`useCallback` | Compiler handles — remove manual calls |
| `forwardRef` | DEPRECATED — ref is a regular prop |

## Decision Table: Which Hook?

| Need | Hook |
|------|------|
| Local UI state (toggle, input value) | `useState` |
| Complex state with transitions | `useReducer` |
| Read context | `use(MyContext)` |
| Unwrap async data from server | `use(promise)` |
| Side effect after render (DOM, subscriptions) | `useEffect` |
| Measure/mutate DOM before paint | `useLayoutEffect` |
| Expose imperative API to parent | `useImperativeHandle` |
| Unique IDs for accessibility | `useId` |
| Non-blocking state update | `useTransition` |
| Mutable value without re-render | `useRef` |
| Form mutation + result | `useActionState` |
| Optimistic UI during mutation | `useOptimistic` |

## Custom Hook Patterns

### Pattern 1: State + Effect (subscription)

```tsx
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
```

### Pattern 2: Derived/computed (no state needed)

```tsx
function useFormattedDate(date: Date, locale = "en-US"): string {
  // No state, no effect — pure derivation. React Compiler optimizes this.
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}
```

### Pattern 3: Composition (hooks calling hooks)

```tsx
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function useDebouncedSearch(query: string) {
  const debouncedQuery = useDebounced(query, 300);
  // use debouncedQuery for fetch...
  return { debouncedQuery };
}
```

### Pattern 4: SSR-safe hook

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false); // safe default for SSR

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
```

## Anti-Patterns

| Wrong | Right | Why |
|-------|-------|-----|
| `useEffect` to set state from props | Compute during render | Extra render cycle, stale state |
| Hook inside `if` | Move condition inside hook | Rules of Hooks violation |
| `useRef` to store derived data | Local variable or `useMemo` | Refs don't trigger updates |
| `useEffect(fn, [])` as "componentDidMount" | Think in sync, not lifecycle | Mental model mismatch |
| Giant hook with 5 states | Split into composed hooks | Violates single-responsibility |

## When NOT to Use a Custom Hook

- Pure computation: just write a function (not everything needs `use*`).
- Shared static config: use a module-level constant.
- Only used in one component: inline it until reuse is proven.

## Delegates To

- Complex state machines → `frontend-state` (Zustand/XState)
- Data fetching hooks → `subskills/server-components.md` or TanStack Query
- Form hooks → `subskills/forms-actions.md`
- Testing hooks → `subskills/testing.md` (renderHook)
