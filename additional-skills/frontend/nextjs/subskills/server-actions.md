# Server Actions

Activate when: server action, form, mutation, useActionState, useFormStatus, 'use server', data mutation.

## Core Principles

1. **Server Actions are public HTTP POST endpoints** — anyone can call them. NEVER trust the caller.
2. **Always validate**: auth (who) + authorization (can they) + input (what) inside every action.
3. **Zod for input validation** — parse, don't validate. Return typed errors.
4. **Minimal arguments** — accept IDs, not full objects. Fetch fresh data server-side.
5. **Progressive enhancement** — forms work without JS via `action` prop.
6. **useActionState** for form state management (replaces useFormState in React 19).
7. **useFormStatus** for pending UI (loading states).

## Security Checklist (Every Action)

```tsx
'use server'

import { z } from 'zod'
import { auth } from '@/lib/auth'
import { revalidateTag } from 'next/cache'

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
})

export async function createPost(prevState: State, formData: FormData) {
  // 1. AUTHENTICATE
  const session = await auth()
  if (!session?.user) {
    return { error: 'Unauthorized' }
  }

  // 2. VALIDATE INPUT
  const parsed = schema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  })
  if (!parsed.success) {
    return { error: 'Invalid input', issues: parsed.error.flatten() }
  }

  // 3. AUTHORIZE (ownership, role, etc.)
  // 4. MUTATE (use Data Access Layer)
  await db.post.create({
    data: { ...parsed.data, authorId: session.user.id },
  })

  // 5. REVALIDATE
  revalidateTag('posts')

  // 6. RETURN (or redirect)
  return { success: true }
}
```

## Form Pattern with useActionState

```tsx
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createPost } from '@/app/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  )
}

export function CreatePostForm() {
  const [state, formAction] = useActionState(createPost, { error: null })

  return (
    <form action={formAction}>
      <input name="title" required aria-label="Post title" />
      <textarea name="content" aria-label="Post content" />
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}
```

## Decision Table

| Scenario | Pattern |
|----------|---------|
| Form submission | `<form action={serverAction}>` + `useActionState` |
| Programmatic mutation | `startTransition(() => action(data))` |
| Optimistic UI | `useOptimistic` + Server Action |
| File upload | `FormData` with `formData.get('file')` as `File` |
| Multi-step form | Combine client state + final Server Action |
| Delete with confirmation | Button form + hidden input for ID |

## Inline vs Module Actions

```tsx
// INLINE: defined in Server Component (cannot be imported)
export default async function Page() {
  async function deleteItem(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    // validate + delete
  }
  return <form action={deleteItem}>...</form>
}

// MODULE: separate file (importable, reusable)
// app/actions.ts
'use server'
export async function deleteItem(formData: FormData) { ... }
```

## Optimistic Updates

```tsx
'use client'

import { useOptimistic, startTransition } from 'react'
import { addTodo } from '@/app/actions'

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (state, newTodo: string) => [...state, { id: 'temp', title: newTodo }]
  )

  async function handleAdd(formData: FormData) {
    const title = formData.get('title') as string
    startTransition(() => addOptimistic(title))
    await addTodo(formData)
  }

  return (
    <form action={handleAdd}>
      <input name="title" />
      <ul>{optimisticTodos.map(t => <li key={t.id}>{t.title}</li>)}</ul>
    </form>
  )
}
```

## Common Mistakes

1. No auth check — action is callable by anyone with the URL.
2. Trusting client-sent objects — always re-fetch by ID server-side.
3. Returning sensitive data in action response — only return what UI needs.
4. Using `redirect()` inside try/catch — it throws internally, catch swallows it.
5. Not using `revalidateTag`/`revalidatePath` after mutation — stale UI.
6. Huge payloads in FormData without size limits — add validation.
7. Using `useFormState` (deprecated) instead of `useActionState` (React 19).
