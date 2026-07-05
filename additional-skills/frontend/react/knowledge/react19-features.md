---
type: fact
title: "React 19: complete feature reference and migration"
---

# React 19 Features Reference

## New APIs

### `use()` Hook

Reads resources (promises, context) during render. Replaces `useContext` and fetch-in-useEffect patterns.

```tsx
// Reading context
import { createContext, use } from "react";
const ThemeContext = createContext("light");
function Button() {
  const theme = use(ThemeContext); // replaces useContext(ThemeContext)
  return <button className={theme}>Click</button>;
}

// Reading a promise (must come from Server Component or cached)
function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise); // suspends until resolved
  return comments.map(c => <p key={c.id}>{c.text}</p>);
}
```

**Key rules:**
- CAN be called conditionally (unlike other hooks)
- Promise must be created outside the Client Component (or cached)
- Triggers Suspense boundary while pending

### `useActionState(action, initialState)`

Manages form state for Actions. Returns `[state, formAction, isPending]`.

```tsx
const [state, submitAction, isPending] = useActionState(
  async (prevState, formData) => {
    const result = await saveData(formData);
    return result; // becomes next state
  },
  { error: null }, // initial state
);
```

### `useFormStatus()`

Reads pending status of parent form. Must be called in a child of `<form>`.

```tsx
function SubmitBtn() {
  const { pending, data, method, action } = useFormStatus();
  return <button disabled={pending}>{pending ? "..." : "Submit"}</button>;
}
```

### `useOptimistic(state, updateFn)`

Provides optimistic state during async transitions.

```tsx
const [optimisticMessages, addOptimistic] = useOptimistic(
  messages,
  (state, newMsg: string) => [...state, { text: newMsg, sending: true }],
);
```

### Actions (form `action` prop)

Functions passed to `<form action={fn}>`. Can be async. Integrate with transitions.

```tsx
<form action={async (formData) => {
  "use server";
  await db.insert(formData);
  revalidatePath("/");
}}>
```

## Breaking Changes from React 18

| React 18 | React 19 | Migration |
|----------|----------|-----------|
| `forwardRef(Component)` | `ref` as regular prop | Remove forwardRef wrapper |
| `<Context.Provider value={}>` | `<Context value={}>` | Remove `.Provider` |
| `useContext(Ctx)` | `use(Ctx)` | Either works, `use` preferred |
| `React.lazy` required for code split | Still works | No change needed |
| `defaultProps` on function components | Default parameters | `function Comp({ x = 5 })` |
| Cleanup in refs via useEffect | Ref cleanup functions | `ref={(el) => { ...; return () => cleanup }}` |
| String refs | Removed | Use callback or object refs |
| `ReactDOM.render` | Removed | Use `createRoot` (since React 18) |
| `propTypes` runtime checking | Removed | Use TypeScript |

## Ref Cleanup Functions (new)

```tsx
<input ref={(el) => {
  if (el) el.focus();
  return () => {
    // cleanup when ref is detached
  };
}} />
```

## Context as Provider

```tsx
// React 18
<ThemeContext.Provider value="dark">
  {children}
</ThemeContext.Provider>

// React 19
<ThemeContext value="dark">
  {children}
</ThemeContext>
```

## Document Metadata

React 19 hoists `<title>`, `<meta>`, `<link>` to `<head>` automatically:

```tsx
function BlogPost({ post }) {
  return (
    <>
      <title>{post.title}</title>
      <meta name="description" content={post.summary} />
      <article>{post.content}</article>
    </>
  );
}
```

## Stylesheet Precedence

```tsx
<link rel="stylesheet" href="/styles/base.css" precedence="default" />
<link rel="stylesheet" href="/styles/theme.css" precedence="high" />
```

React deduplicates and orders by precedence.

## Script Support

```tsx
<script src="/analytics.js" async />
```

React deduplicates across renders and hoists to `<head>`.

## Preloading APIs

```tsx
import { prefetchDNS, preconnect, preload, preinit } from "react-dom";

prefetchDNS("https://api.example.com");
preconnect("https://cdn.example.com");
preload("/font.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
preinit("/critical.js", { as: "script" });
```
