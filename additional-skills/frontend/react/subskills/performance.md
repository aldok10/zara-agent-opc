# Subskill: Performance

> Activate when: optimizing render performance, configuring React Compiler, code splitting, or diagnosing unnecessary re-renders.

## Core Principles

1. **React Compiler is the first line of defense.** It auto-memoizes components and hooks. Manual optimization is rarely needed.
2. **Measure before optimizing.** React DevTools Profiler, Chrome Performance tab, or `why-did-you-render` to identify actual bottlenecks.
3. **Architecture > micro-optimization.** Correct component boundaries and state placement matter more than memo tricks.
4. **Less JS = faster.** Server Components, code splitting, and lazy loading reduce bundle size at the architecture level.

## React Compiler: What It Does

The Compiler statically analyzes your code and automatically:
- Memoizes component return values (like `React.memo`)
- Memoizes expensive computations (like `useMemo`)
- Memoizes callbacks (like `useCallback`)
- Skips re-rendering children when props haven't changed

### What the Compiler requires from your code

| Rule | Violation Example | Fix |
|------|------------------|-----|
| Components must be pure | Reading `Date.now()` during render | Move to `useEffect` or pass as prop |
| No mutation during render | `array.push(item)` then render | `[...array, item]` |
| Props/state are immutable | `obj.field = newValue` | `{ ...obj, field: newValue }` |
| Hooks follow rules | Conditional `useState` | Move outside condition |
| No ref reads during render | `ref.current` in JSX | Read in effect or event handler |

### Opting out (escape hatches)

```tsx
// Entire component
"use no memo";
function LegacyComponent() { ... }

// Or via eslint-disable for specific lines (when Compiler miscompiles)
// eslint-disable-next-line react-compiler/react-compiler
```

## Decision Table: Performance Strategy

| Symptom | Diagnosis | Solution |
|---------|-----------|----------|
| Large JS bundle | Too many Client Components | Move static parts to Server Components |
| Slow initial load | Everything loaded upfront | `React.lazy()` + Suspense for routes/heavy components |
| Jank on interaction | Expensive computation in render | Verify Compiler is active; if not, `useMemo` |
| List re-renders entirely | Missing/unstable keys | Stable unique IDs as keys |
| Parent re-render cascades | State too high in tree | Move state down / colocation |
| Typing lag in input | Re-rendering entire form | Isolate input in own component |
| Expensive transition | Blocks user input | `useTransition` for non-urgent updates |
| Slow context consumers | Broad context, frequent updates | Split context or use selector pattern |

## Code Splitting

```tsx
import { lazy, Suspense } from "react";

// Split heavy components into separate chunks
const HeavyEditor = lazy(() => import("./heavy-editor"));

function App() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <HeavyEditor />
    </Suspense>
  );
}
```

## Transitions for Non-Urgent Updates

```tsx
"use client";

import { useState, useTransition } from "react";

function SearchResults() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value); // urgent: update input immediately
    startTransition(() => {
      setResults(filterItems(value)); // non-urgent: can be interrupted
    });
  }

  return (
    <>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}
```

## Context Performance

```tsx
// BAD: one giant context that changes often
const AppContext = createContext({ user, theme, locale, notifications });

// GOOD: split by update frequency
const UserContext = createContext(user);      // rarely changes
const ThemeContext = createContext(theme);    // rarely changes
const NotificationContext = createContext(notifications); // changes often, fewer consumers
```

## Virtualization for Long Lists

When rendering 100+ items, use virtualization (`@tanstack/react-virtual`, `react-window`):

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: "400px", overflow: "auto" }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: `${virtualItem.start}px`,
              height: `${virtualItem.size}px`,
              width: "100%",
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Anti-Patterns

| Wrong | Right | Why |
|-------|-------|-----|
| `React.memo` everywhere with Compiler active | Remove manual memos | Compiler does it better, manual ones add noise |
| Premature `useMemo` on cheap ops | Let Compiler handle or just compute | Overhead of memo > cost of recompute |
| `key={Math.random()}` | Stable unique ID | Forces remount every render |
| Huge `useEffect` deps array | Split into focused effects | Over-firing, hard to debug |
| Inline object/array literals as props | Compiler handles, or hoist to module | Without Compiler: new reference every render |

## Delegates To

- Bundle analysis → `frontend-build`
- Server Component architecture → `subskills/server-components.md`
- React Compiler internals → `knowledge/compiler-guide.md`
- Core Web Vitals / loading perf → `frontend-performance`
