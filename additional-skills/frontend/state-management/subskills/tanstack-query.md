# TanStack Query

## Activation

Data fetching, server state caching, mutations, optimistic updates, prefetching, infinite queries, background refetch.

## Core Principles

- Server state is NOT your state. TanStack Query owns it. You configure cache behavior.
- `queryKey` is the cache address. Include all variables that affect the response.
- `staleTime` vs `gcTime`: stale = refetch on trigger, gc = remove from memory.
- Mutations + `invalidateQueries` for writes. Optimistic for instant UX.
- Prefetch on hover/route for perceived zero-latency.

## Decision Table

| Need | Pattern |
|------|---------|
| GET data with caching | `useQuery` |
| Paginated list | `useQuery` + page in key |
| Infinite scroll | `useInfiniteQuery` |
| POST/PUT/DELETE | `useMutation` + `invalidateQueries` |
| Instant feedback | Optimistic update via `onMutate` |
| Preload on hover | `queryClient.prefetchQuery` |
| Dependent queries | `enabled: !!dependency` |
| Polling | `refetchInterval` |
| SSR hydration | `prefetchQuery` in server loader + `HydrationBoundary` |

## Patterns

### Basic Query

```typescript
import { useQuery } from '@tanstack/react-query';

function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => api.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 min fresh
  });
}
```

### Mutation with Invalidation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

### Optimistic Update

```typescript
function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todo: Todo) => api.updateTodo(todo),
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({ queryKey: ['todos', newTodo.id] });
      const previous = queryClient.getQueryData<Todo>(['todos', newTodo.id]);
      queryClient.setQueryData(['todos', newTodo.id], newTodo);
      return { previous };
    },
    onError: (_err, _todo, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos', context.previous.id], context.previous);
      }
    },
    onSettled: (_data, _err, todo) => {
      queryClient.invalidateQueries({ queryKey: ['todos', todo.id] });
    },
  });
}
```

### Prefetching

```typescript
function UserListItem({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => api.getUser(userId),
      staleTime: 60 * 1000,
    });
  };

  return <Link onMouseEnter={prefetch} href={`/users/${userId}`}>View</Link>;
}
```

### Infinite Query

```typescript
function useInfinitePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => api.getPosts({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

### Dependent Query

```typescript
function useUserPosts(userId: string | undefined) {
  return useQuery({
    queryKey: ['posts', userId],
    queryFn: () => api.getUserPosts(userId!),
    enabled: !!userId, // only runs when userId exists
  });
}
```

## Configuration Defaults

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 min
      gcTime: 5 * 60 * 1000,       // 5 min
      retry: 1,
      refetchOnWindowFocus: false,  // personal preference
    },
  },
});
```

## Anti-patterns

- Storing query data in Zustand/Redux — double source of truth.
- Missing variables in `queryKey` — stale/wrong cache hits.
- `refetchOnWindowFocus: true` with real-time subscriptions — redundant fetches.
- Not cancelling queries in optimistic updates — race conditions.
- Using `queryClient.setQueryData` without `invalidateQueries` on settle — stale data.
