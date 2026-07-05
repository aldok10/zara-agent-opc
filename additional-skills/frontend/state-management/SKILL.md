---
name: state-management
description: "Frontend state management: server vs client state, caching, reactivity, global patterns"
---

# State Management

## Scope

All frontend state decisions: choosing tools, structuring stores, managing server cache, reactive patterns, URL state, and state composition across components.

## First Action

Classify the state: Is it server state (fetched/async) or client state (UI/sync)? This determines the entire approach.

## Constraints

1. Separate server state (fetched data) from client state (UI state). Never mix.
2. Server state: use framework primitives first (RSC, Server Actions, SvelteKit load, Nuxt useFetch).
3. Client async state: TanStack Query for cache/revalidation/optimistic updates.
4. Client sync state: Zustand (React), Pinia (Vue), `$state` (Svelte), signals (Angular).
5. Colocate state with consumer. Global state is last resort.
6. Derive don't sync. Computed/derived values > manual sync in effects.
7. Normalize nested server data if referenced in multiple places.
8. URL state (searchParams) for shareable/bookmarkable UI state.

## DO NOT

- Put server-fetched data in Zustand/Redux. Use TanStack Query or framework cache.
- Create global state for data only one component uses.
- Sync state between stores with effects. Derive it.
- Use `useEffect` for data fetching in React 19+. Use Suspense + RSC or TanStack Query.
- Store derived values. Compute them.
- Mutate state directly outside designated update functions.

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| Zustand store, React client state, slices | `subskills/zustand.md` |
| Data fetching, cache, mutations, optimistic | `subskills/tanstack-query.md` |
| Angular signals, Svelte runes, fine-grained reactivity | `subskills/signals.md` |
| Global vs local, composition, lifting state | `subskills/global-patterns.md` |

## Verification

- No server data stored in client state stores
- Derived values computed, not synced
- State colocated at lowest necessary level
- No stale closure bugs in subscriptions
- URL state used for shareable UI state

## Knowledge

- `knowledge/state-decision-matrix.md` - Which tool for which scenario
- `knowledge/common-mistakes.md` - Top 10 state mistakes

## AI-Era Context (2026)

- Signals (Angular, Preact, Solid) and fine-grained reactivity are the direction -- AI defaults to hooks
- TanStack Query is the standard for server state; AI puts fetched data in Zustand/Redux stores
- URL as state (searchParams) for shareable UI state is underused; AI creates local state instead
- AI generates useEffect-based sync between stores -- derive state instead of syncing
- Server Components (React/Next.js) eliminate client state for server-fetched data entirely

## Related Skills

- `frontend/build-tools` - Tree-shaking affects state library bundle size
- `typescript-expert` - Type-safe stores and queries
