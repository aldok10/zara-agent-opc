---
type: fact
title: "React 19 hooks: complete quick reference"
---

# React 19 Hooks Cheatsheet

Sorted by frequency of use in production code.

## Tier 1: Daily Use

### `useState`
Reactive local state.
```ts
const [value, setValue] = useState<T>(initialValue | () => T)
```
Use: any component-local state. Avoid: derived state (compute inline), shared state (context/store).

### `useEffect`
Synchronize with external systems (DOM, network, subscriptions).
```ts
useEffect(() => { /* setup */ return () => { /* cleanup */ } }, [deps])
```
Use: fetching, subscriptions, DOM manipulation. Avoid: derived computations, state sync (use events).

### `useRef`
Mutable container that persists across renders without triggering re-render.
```ts
const ref = useRef<T>(initialValue)
// ref.current is mutable, never triggers re-render
```
Use: DOM refs, timers, previous values, mutable instance vars.

### `use`
Read a resource (Promise or Context) during render. Can be called conditionally.
```ts
const value = use(promise)       // suspends until resolved
const ctx = use(SomeContext)     // replaces useContext
```
Use: async data in Server/Client Components, conditional context reads. Replaces `useContext`.

### `useActionState`
Manage form action state with pending status. Replaces `useFormState`.
```ts
const [state, formAction, isPending] = useActionState(
  async (prevState, formData) => { /* return next state */ },
  initialState,
  permalink? // optional for progressive enhancement
)
```
Use: forms with server actions, optimistic form submissions.

## Tier 2: Common

### `useFormStatus`
Read parent `<form>` submission status from within a child component.
```ts
const { pending, data, method, action } = useFormStatus()
```
Use: submit buttons, loading indicators inside forms. Must be child of `<form>`.

### `useOptimistic`
Show optimistic state while async action runs, reverts on error.
```ts
const [optimisticState, addOptimistic] = useOptimistic(state, (current, optimisticValue) => /* merge */)
```
Use: instant UI feedback (likes, adds, toggles) before server confirms.

### `useReducer`
Complex state logic with explicit transitions.
```ts
const [state, dispatch] = useReducer(reducer, initialArg, init?)
```
Use: multiple related state values, complex update logic, state machines.

### `useContext`
Read context value (prefer `use(Context)` in React 19).
```ts
const value = useContext(SomeContext)
```
Use: theme, locale, auth. Being superseded by `use()`.

### `useId`
Generate unique IDs stable across server/client.
```ts
const id = useId() // e.g. ":r1:"
```
Use: form labels, aria attributes, any HTML id that needs SSR stability.

### `useMemo`
Cache expensive computation result between re-renders.
```ts
const result = useMemo(() => expensiveComputation(a, b), [a, b])
```
Use: expensive calculations, referential stability for objects/arrays passed as props. Note: React Compiler makes this less necessary.

### `useCallback`
Cache a function reference between re-renders.
```ts
const handler = useCallback((args) => { /* ... */ }, [deps])
```
Use: passing callbacks to memoized children, effect deps. Note: React Compiler makes this less necessary.

## Tier 3: Specialized

### `useTransition`
Mark a state update as non-urgent (doesn't block UI).
```ts
const [isPending, startTransition] = useTransition()
startTransition(async () => { /* async or expensive update */ })
```
Use: tab switches, search filtering, navigation that shouldn't block typing.

### `useDeferredValue`
Defer re-rendering a value until urgent updates complete.
```ts
const deferredQuery = useDeferredValue(query)
```
Use: search results list that trails behind input, expensive child trees.

### `useSyncExternalStore`
Subscribe to external store with SSR support.
```ts
const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)
```
Use: Redux-like stores, browser APIs (matchMedia, online status), shared mutable sources.

### `useImperativeHandle`
Customize the ref handle exposed to parent via `forwardRef` (or `ref` prop in React 19).
```ts
useImperativeHandle(ref, () => ({ focus, scrollTo }), [deps])
```
Use: exposing limited imperative API from a component (focus, scroll, play).

### `useLayoutEffect`
Fires synchronously after DOM mutations, before browser paint.
```ts
useLayoutEffect(() => { /* measure/mutate DOM */ }, [deps])
```
Use: tooltips/popovers measuring position, preventing flicker. Avoid: anything async.

### `useDebugValue`
Display label in React DevTools for custom hooks.
```ts
useDebugValue(value, formatFn?)
```
Use: custom hooks you debug often. No runtime cost in production.

## Custom Hook Rules

1. Must start with `use`
2. Can call other hooks (top-level only, no conditions unless using `use()`)
3. Extract when: logic reused 2+ times OR complex enough to name
4. Return tuple `[value, setter]` for single state, object for multiple values
