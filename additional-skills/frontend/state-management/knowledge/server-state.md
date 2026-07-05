---
type: fact
title: "Server State Management"
---

# Server State Management

## Core Concept

Server state is data owned by the server, accessed asynchronously, shared across clients. Differs from client state because it can become stale and needs background refresh + cache management.

## Library Comparison

| Feature | TanStack Query v5 | SWR v2 | Apollo Client |
|---------|-------------------|--------|---------------|
| Protocol | Any (REST, GraphQL) | Any | GraphQL-first |
| Bundle Size | ~13KB | ~4KB | ~35KB |
| Cache Model | Query key based | Key string | Normalized entity |
| Mutations | Built-in | useSWRMutation | Built-in |
| SSR/Hydration | Full | Limited | Full |
| Framework Support | React, Vue, Solid, Svelte, Angular | React only | React |

## TanStack Query Patterns

```tsx
// Basic query with cache config
const { data, isLoading } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
  staleTime: 5 * 60 * 1000,   // fresh for 5 min
  gcTime: 30 * 60 * 1000,     // keep in cache 30 min
});

// Mutation with cache update
const mutation = useMutation({
  mutationFn: (user: User) => fetch(`/api/users/${user.id}`, { method: 'PUT', body: JSON.stringify(user) }).then(r => r.json()),
  onSuccess: (data, variables) => {
    queryClient.setQueryData(['user', variables.id], data);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

## Cache Invalidation Strategies

**Time-based**: `staleTime` + `refetchOnWindowFocus` + `refetchOnReconnect`

**Event-based**:
```tsx
queryClient.invalidateQueries({ queryKey: ['todos'] });           // after mutation
queryClient.invalidateQueries({ queryKey: ['user'] });            // prefix match
socket.on('order:updated', (id) => queryClient.invalidateQueries({ queryKey: ['order', id] }));
```

## Optimistic Updates

```tsx
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previous = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (old: Todo[]) =>
      old.map(t => t.id === newTodo.id ? { ...t, ...newTodo } : t)
    );
    return { previous };
  },
  onError: (_err, _vars, context) => queryClient.setQueryData(['todos'], context?.previous),
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
});
```

## Common Pitfalls

1. **Over-fetching**: No `staleTime` set → refetch on every mount
2. **Key instability**: Object keys without stable references → infinite refetches
3. **Missing error boundaries**: Network failures crash component tree
4. **Premature normalization**: Key-based cache is sufficient for most apps

## Decision Guide

- **REST + React**: TanStack Query (most features, best DX)
- **REST + minimal bundle**: SWR (lighter, simpler)
- **GraphQL**: Apollo Client (normalized cache, schema-aware)
- **Multi-framework**: TanStack Query (Vue, Solid, Svelte, Angular)
- **Offline-first**: TanStack Query + persistQueryClient plugin
