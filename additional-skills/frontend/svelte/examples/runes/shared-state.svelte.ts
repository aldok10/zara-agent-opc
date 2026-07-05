// Shared reactive state module
// Import and use in any Svelte 5 component — state is shared across all consumers.

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: Date;
}

// Private reactive state
let todos = $state<Todo[]>([]);
let filter = $state<'all' | 'active' | 'completed'>('all');

// Derived (read-only, auto-updates)
export const filtered = $derived.by(() => {
  switch (filter) {
    case 'active': return todos.filter(t => !t.done);
    case 'completed': return todos.filter(t => t.done);
    default: return todos;
  }
});

export const stats = $derived({
  total: todos.length,
  active: todos.filter(t => !t.done).length,
  completed: todos.filter(t => t.done).length,
});

// Public API
export function getFilter() { return filter; }
export function setFilter(f: typeof filter) { filter = f; }

export function addTodo(text: string) {
  todos.push({
    id: crypto.randomUUID(),
    text: text.trim(),
    done: false,
    createdAt: new Date(),
  });
}

export function toggleTodo(id: string) {
  const todo = todos.find(t => t.id === id);
  if (todo) todo.done = !todo.done;
}

export function removeTodo(id: string) {
  todos = todos.filter(t => t.id !== id);
}

export function clearCompleted() {
  todos = todos.filter(t => !t.done);
}
