# Subskill: Forms & Actions

> Activate when: building forms, handling mutations, implementing optimistic UI, or working with `useActionState`/`useFormStatus`/`useOptimistic`.

## Core Principles

1. **Actions replace manual fetch + setState for mutations.** They integrate with React's transition system for pending/error/success states.
2. **`useActionState`** manages form state: previous result, pending status, action dispatch.
3. **`useFormStatus`** reads pending state from the nearest parent `<form>` with an action.
4. **`useOptimistic`** provides instant UI feedback before the server responds.
5. **Server Actions** (`'use server'`) run on the server, callable from Client Components.
6. **Progressive enhancement**: forms with `action` work without JS (the action runs on submit).

## Decision Table: Form Approach

| Scenario | Approach |
|----------|----------|
| Simple mutation (create, update, delete) | Server Action + `useActionState` |
| Need instant feedback | Add `useOptimistic` |
| Need submit button pending state | `useFormStatus` in a child component |
| Complex multi-step form | `useReducer` + Action on final submit |
| Real-time validation | Client-side + Action on submit |
| File upload with progress | Client fetch with `XMLHttpRequest`/`ReadableStream` |
| Third-party API (no server) | Client Action (async function) |

## Pattern 1: Basic Server Action Form

```tsx
// actions.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateTodoSchema = z.object({
  title: z.string().min(1).max(200),
});

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function createTodo(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateTodoSchema.safeParse({
    title: formData.get("title"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await db.todo.create({ data: { title: parsed.data.title } });
  revalidatePath("/todos");
  return { success: true };
}
```

```tsx
// todo-form.tsx
"use client";

import { useActionState } from "react";
import { createTodo, type ActionState } from "./actions";
import { SubmitButton } from "./submit-button";

const initialState: ActionState = {};

export function TodoForm() {
  const [state, formAction] = useActionState(createTodo, initialState);

  return (
    <form action={formAction}>
      <label htmlFor="title">Todo</label>
      <input id="title" name="title" type="text" required />
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p>Created!</p>}
      <SubmitButton />
    </form>
  );
}
```

## Pattern 2: Submit Button with useFormStatus

```tsx
// submit-button.tsx
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}
```

**Important:** `useFormStatus` must be in a component that is a *child* of the `<form>`. It cannot be in the same component that renders the form.

## Pattern 3: Optimistic Updates

```tsx
"use client";

import { useOptimistic } from "react";
import { useActionState } from "react";
import { toggleTodo } from "./actions";

type Todo = { id: string; title: string; completed: boolean };

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (state, updatedId: string) =>
      state.map((todo) =>
        todo.id === updatedId ? { ...todo, completed: !todo.completed } : todo,
      ),
  );

  async function handleToggle(id: string) {
    addOptimistic(id); // instant UI update
    await toggleTodo(id); // server mutation
  }

  return (
    <ul>
      {optimisticTodos.map((todo) => (
        <li key={todo.id}>
          <form action={() => handleToggle(todo.id)}>
            <button type="submit">
              {todo.completed ? "✓" : "○"} {todo.title}
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
```

## Pattern 4: Client-Only Action (no server)

```tsx
"use client";

import { useActionState } from "react";

async function submitFeedback(
  prev: { sent: boolean },
  formData: FormData,
): Promise<{ sent: boolean }> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    body: JSON.stringify({ message: formData.get("message") }),
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed");
  return { sent: true };
}

export function FeedbackForm() {
  const [state, action, isPending] = useActionState(submitFeedback, { sent: false });

  return (
    <form action={action}>
      <textarea name="message" required />
      <button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send"}
      </button>
      {state.sent && <p>Thanks for your feedback!</p>}
    </form>
  );
}
```

## Validation Strategy

| Layer | What | Tool |
|-------|------|------|
| Client (instant) | Format, required, length | HTML attributes + `onChange` |
| Action (server) | Schema validation | Zod/valibot `safeParse` |
| Database | Constraints | DB schema (unique, FK, check) |

Always validate on the server. Client validation is UX only  -  never trust it.

## Anti-Patterns

| Wrong | Right | Why |
|-------|-------|-----|
| `useEffect` + `fetch` for mutations | Server Action / `useActionState` | No pending/error integration |
| `useFormStatus` in same component as `<form>` | Extract to child component | Won't work  -  reads from parent form |
| Trusting `formData` without validation | Zod schema on server | Security: client can send anything |
| `e.preventDefault()` + manual fetch | Use `action` prop on form | Loses progressive enhancement |
| Showing optimistic state without rollback | Handle action failure, revert | Inconsistent UI on error |

## Delegates To

- Complex validation schemas → `typescript-expert` (Zod patterns)
- Server Action infrastructure → `frontend-nextjs`
- Loading/skeleton UI → `subskills/performance.md`
- Testing forms → `subskills/testing.md`
