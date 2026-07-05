import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from '@tanstack/react-query';

// Types
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  userId: string;
}

interface CreateTodoDto {
  title: string;
  userId: string;
}

interface UpdateTodoDto {
  id: string;
  title?: string;
  completed?: boolean;
}

// API layer (separate concern)
const todosApi = {
  list: (userId: string): Promise<Todo[]> =>
    fetch(`/api/users/${userId}/todos`).then((r) => r.json()),
  get: (id: string): Promise<Todo> =>
    fetch(`/api/todos/${id}`).then((r) => r.json()),
  create: (data: CreateTodoDto): Promise<Todo> =>
    fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
  update: (data: UpdateTodoDto): Promise<Todo> =>
    fetch(`/api/todos/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
  delete: (id: string): Promise<void> =>
    fetch(`/api/todos/${id}`, { method: 'DELETE' }).then(() => undefined),
};

// Query options factory (reusable, composable)
export const todosQueries = {
  all: () => queryOptions({ queryKey: ['todos'] }),
  list: (userId: string) =>
    queryOptions({
      queryKey: ['todos', 'list', userId],
      queryFn: () => todosApi.list(userId),
      staleTime: 5 * 60 * 1000,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ['todos', 'detail', id],
      queryFn: () => todosApi.get(id),
      staleTime: 2 * 60 * 1000,
    }),
};

// Hooks
export function useTodos(userId: string) {
  return useQuery(todosQueries.list(userId));
}

export function useTodo(id: string) {
  return useQuery(todosQueries.detail(id));
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.create,
    onSuccess: (newTodo) => {
      // Optimistic: add to list cache immediately
      queryClient.setQueryData<Todo[]>(
        todosQueries.list(newTodo.userId).queryKey,
        (old) => (old ? [...old, newTodo] : [newTodo]),
      );
      // Also seed the detail cache
      queryClient.setQueryData(todosQueries.detail(newTodo.id).queryKey, newTodo);
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.update,
    // Optimistic update with rollback
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: todosQueries.detail(variables.id).queryKey });

      // Snapshot previous value
      const previous = queryClient.getQueryData<Todo>(
        todosQueries.detail(variables.id).queryKey,
      );

      // Optimistically update detail
      if (previous) {
        queryClient.setQueryData<Todo>(
          todosQueries.detail(variables.id).queryKey,
          { ...previous, ...variables },
        );
      }

      return { previous };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          todosQueries.detail(variables.id).queryKey,
          context.previous,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: todosQueries.detail(variables.id).queryKey });
      queryClient.invalidateQueries({
        queryKey: ['todos', 'list'],
        exact: false,
      });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.delete,
    onMutate: async (id) => {
      // Optimistic removal from all list caches
      queryClient.setQueriesData<Todo[]>(
        { queryKey: ['todos', 'list'] },
        (old) => old?.filter((t) => t.id !== id),
      );
      return { id };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', 'list'] });
    },
  });
}
