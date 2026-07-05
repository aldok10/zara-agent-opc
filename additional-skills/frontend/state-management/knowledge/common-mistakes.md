---
type: pitfall
title: "10 State Management Mistakes"
---

# 10 State Management Mistakes

## 1. Storing Server Data in Client Stores

**Wrong**: Fetching data, putting it in Zustand/Redux, manually updating on mutations.
**Right**: TanStack Query owns server data. Client stores for UI-only state.
**Why**: Double source of truth, manual cache invalidation, stale data bugs.

## 2. useEffect for Data Fetching (React 19+)

**Wrong**: `useEffect(() => { fetch(...).then(setData) }, [])`.
**Right**: TanStack Query, RSC, or Suspense-based loading.
**Why**: Race conditions, no caching, no loading/error states, waterfalls.

## 3. Syncing State Between Stores with Effects

**Wrong**: `useEffect(() => { storeB.set(storeA.get()) }, [storeA])`.
**Right**: Derive in a single store or use computed values.
**Why**: Infinite loops, timing bugs, impossible to trace data flow.

## 4. Global State for Form Values

**Wrong**: Every form field in a global store.
**Right**: Local state, or form library (React Hook Form, Formik) scoped to the form.
**Why**: Unnecessary coupling, re-renders across app, can't reuse form.

## 5. Selecting Entire Store

**Wrong**: `const state = useStore()`  -  re-renders on ANY store change.
**Right**: `const count = useStore(s => s.count)`  -  re-renders only when `count` changes.
**Why**: Performance death by a thousand re-renders.

## 6. Missing Query Key Variables

**Wrong**: `queryKey: ['todos']` when fetching `getTodos(userId, filter)`.
**Right**: `queryKey: ['todos', userId, filter]`.
**Why**: Wrong cache hits, stale data from different parameters shown.

## 7. Prop Drilling Instead of Composition

**Wrong**: Passing `user` through 5 levels of components.
**Right**: Composition (render props / children), or context for truly shared state.
**Why**: Couples intermediate components to data they don't use.

## 8. Not Using URL State for Shareable UI

**Wrong**: Active tab, filters, pagination in useState  -  lost on refresh/share.
**Right**: searchParams for any state the user might want to bookmark or share.
**Why**: Better UX, browser back button works, shareable links.

## 9. Creating Stores Inside Components

**Wrong**: `const useStore = create(...)` inside a component body.
**Right**: Create stores at module level or via factory + ref/context.
**Why**: New store instance every render, state resets, memory leaks.

## 10. Optimistic Updates Without Rollback

**Wrong**: `setQueryData` in `onMutate` without saving previous or handling `onError`.
**Right**: Save previous in `onMutate`, restore in `onError`, invalidate in `onSettled`.
**Why**: Failed mutations leave UI in impossible state, user sees phantom data.
