---
type: decision
title: "State Management Decision Matrix"
---

# State Decision Matrix

## Primary Classification

| Question | If YES | If NO |
|----------|--------|-------|
| Does it come from an API? | Server state → TanStack Query / framework loader | Client state → continue below |
| Is it URL-representable? | URL state → searchParams | Continue below |
| Used by one component only? | Local state → useState / signal | Continue below |
| Used by parent-child subtree? | Lifted state → nearest ancestor | Continue below |
| Used app-wide? | Global store → Zustand/Pinia/signals | Scoped context or module |

## Tool Selection by Framework

| Framework | Server State | Client Sync (Local) | Client Sync (Global) | URL State |
|-----------|-------------|--------------------|--------------------|-----------|
| React/Next.js | RSC + TanStack Query | useState/useReducer | Zustand | nuqs / useSearchParams |
| Vue/Nuxt | useFetch/useAsyncData + TQ | ref/reactive | Pinia | useRoute().query |
| Svelte/SvelteKit | load functions + TQ | $state | $state (module) | $page.url.searchParams |
| Angular | HttpClient + TQ | signals | signal services | Router queryParams |
| Solid | createResource + TQ | createSignal | context + signals | useSearchParams |

## Stale Time Guidelines (TanStack Query)

| Data Type | staleTime | Reasoning |
|-----------|-----------|-----------|
| User profile | 5 min | Rarely changes mid-session |
| List/feed | 1 min | Balance freshness vs requests |
| Real-time data | 0 | Always refetch |
| Static config | 30 min+ | Almost never changes |
| Search results | 2 min | Same query = same results briefly |

## Normalization Decision

| Condition | Normalize? |
|-----------|-----------|
| Entity referenced in 3+ queries | Yes — prevent inconsistency |
| Deeply nested response, only display | No — use as-is |
| Editing entity shown in list + detail | Yes — single update point |
| One-off report/aggregate data | No — not entity-based |

## Re-render Optimization

| Problem | Solution |
|---------|----------|
| Context re-renders all consumers | Split context by update frequency |
| Zustand re-renders on any change | Use selectors: `useStore(s => s.field)` |
| Large list re-renders entirely | Virtualization + memo + stable keys |
| Computed value recalculates | useMemo / computed signal (cached) |
| Child re-renders when parent state changes | React.memo + stable references |
