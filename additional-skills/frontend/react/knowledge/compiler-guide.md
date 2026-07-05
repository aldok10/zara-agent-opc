---
type: fact
title: "React Compiler: how it works, requirements, and escape hatches"
---

# React Compiler Guide

## What Is It?

The React Compiler (previously React Forget) is a build-time tool that automatically optimizes React code by inserting memoization. It eliminates the need for manual `useMemo`, `useCallback`, and `React.memo`.

## How It Works

1. **Static analysis** at build time: analyzes component render functions and hooks.
2. **Identifies reactive values**: tracks which values change between renders.
3. **Inserts memoization**: caches computations and JSX when inputs haven't changed.
4. **Skips child re-renders**: when props are memoized, children skip re-rendering.

The Compiler essentially does what an expert developer would do with `useMemo`/`useCallback` everywhere — but correctly, exhaustively, and without the maintenance burden.

## Setup

### Status: v1.0 Stable (October 2025)

React Compiler is production-ready. Works with React 17, 18, and 19.

### With Vite (plugin-react v5 with Babel)

```bash
npm install -D babel-plugin-react-compiler
```

```ts
// vite.config.ts
import react from "@vitejs/plugin-react";

export default {
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
};
```

### With Vite (plugin-react v6+ / Rolldown, no Babel by default)

`@vitejs/plugin-react` v6 dropped Babel. Add it back for Compiler:

```bash
npm install -D babel-plugin-react-compiler @rolldown/plugin-babel
```

```ts
// vite.config.ts
import react from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

export default {
  plugins: [
    react(),
    babel({
      plugins: ["babel-plugin-react-compiler"],
    }),
  ],
};
```

### With Next.js

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};
export default nextConfig;
```

### With Webpack

```bash
npm install -D react-compiler-webpack-plugin
```

## Requirements (Rules of React)

The Compiler REQUIRES your code follows the Rules of React. Violations cause incorrect behavior or Compiler bailout.

### Rule 1: Components and hooks must be pure

```tsx
// BAD: side effect during render
function Greeting() {
  document.title = "Hello"; // side effect!
  return <h1>Hello</h1>;
}

// GOOD: effect for side effects
function Greeting() {
  useEffect(() => { document.title = "Hello"; }, []);
  return <h1>Hello</h1>;
}
```

### Rule 2: Never mutate props, state, or values during render

```tsx
// BAD: mutation
function TodoList({ todos }) {
  const sorted = todos.sort((a, b) => a.date - b.date); // mutates input!
  return sorted.map(t => <li key={t.id}>{t.title}</li>);
}

// GOOD: copy first
function TodoList({ todos }) {
  const sorted = [...todos].sort((a, b) => a.date - b.date);
  return sorted.map(t => <li key={t.id}>{t.title}</li>);
}
```

### Rule 3: Don't read refs during render

```tsx
// BAD: ref read during render
function Display({ ref }) {
  return <span>{ref.current?.textContent}</span>; // unpredictable
}

// GOOD: refs in effects or event handlers
function Display({ ref }) {
  const [text, setText] = useState("");
  useEffect(() => { setText(ref.current?.textContent ?? ""); }, []);
  return <span>{text}</span>;
}
```

### Rule 4: Only call hooks at the top level

```tsx
// BAD: conditional hook
function Profile({ user }) {
  if (user) {
    const [name, setName] = useState(user.name); // conditional!
  }
}

// GOOD: always call, guard the usage
function Profile({ user }) {
  const [name, setName] = useState(user?.name ?? "");
  if (!user) return null;
  return <input value={name} onChange={e => setName(e.target.value)} />;
}
```

## What Gets Memoized

| Code Pattern | Compiler Output |
|-------------|----------------|
| JSX element creation | Cached if props unchanged |
| Object/array literals in JSX props | Cached (no more "new reference every render") |
| Expensive computations | Cached based on deps |
| Callback functions | Cached (no `useCallback` needed) |
| Component return value | Skipped if inputs unchanged |

## What Doesn't Get Memoized

- External module state reads (non-reactive)
- `Date.now()`, `Math.random()` (impure, Compiler bails out)
- DOM mutations during render
- Global variable access

## Escape Hatches

### Opt out a single component

```tsx
"use no memo";

function LegacyComponent() {
  // Compiler skips this component entirely
  // Use for: code that intentionally breaks Rules of React
}
```

### Opt out via config (gradual adoption)

```ts
// babel-plugin-react-compiler config
{
  compilationMode: "annotation", // only compile files with "use memo"
}
```

### Opt in a single component (in annotation mode)

```tsx
"use memo";

function OptedInComponent() {
  // Only this component gets compiled
}
```

## Debugging the Compiler

### ESLint Plugin

```bash
npm install -D eslint-plugin-react-compiler
```

```json
{
  "plugins": ["react-compiler"],
  "rules": {
    "react-compiler/react-compiler": "error"
  }
}
```

Reports code that violates Rules of React (Compiler won't optimize it).

### React DevTools

React DevTools shows a "Memo" badge on components the Compiler has optimized. Components without the badge either:
- Were skipped due to rule violations
- Were already optimal (no memoization needed)

## Migration from Manual Memoization

When adopting the Compiler:

1. Enable eslint-plugin-react-compiler, fix all violations.
2. Enable the Compiler.
3. Remove `useMemo`, `useCallback`, `React.memo` calls.
4. Run tests — behavior should be identical.
5. Profile — performance should be equal or better.

**Important:** Removing manual memos is optional. The Compiler handles them gracefully (they become no-ops). Remove for code clarity, not necessity.

## When to Keep Manual Memoization

- Compiler explicitly disabled for the project
- Rare edge cases where Compiler bails out and you've measured a bottleneck
- Library code that must work without Compiler (published npm packages)
