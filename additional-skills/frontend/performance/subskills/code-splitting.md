---
name: code-splitting
trigger: "Bundle size, lazy loading, dynamic import, tree-shaking, route splitting"
---

# Code Splitting

## Activation

User needs to reduce bundle size, implement lazy loading, or optimize tree-shaking.

## Core Principles

- Split by route boundary (each route = separate chunk)
- Lazy load below-fold components
- Never lazy load above-fold / critical path components
- Tree-shake via ESM — avoid barrel files that import everything
- Monitor bundle size in CI (budget enforcement)

## Decision Table

| Scenario | Strategy |
|----------|----------|
| Multi-page app (routes) | Route-based splitting with React.lazy / dynamic import |
| Heavy library (chart, editor) | Dynamic import on user interaction |
| Below-fold section | Intersection Observer + dynamic import |
| Barrel file bloating bundle | Direct imports (`import X from './X'` not `from './index'`) |
| Unused exports shipped | Enable `sideEffects: false` in package.json |
| Large icon set | Import individual icons, not full set |

## Patterns

### Route-based splitting (React)

```tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### Interaction-based loading

```tsx
import { useState, lazy, Suspense } from 'react';

const HeavyEditor = lazy(() => import('./components/HeavyEditor'));

function EditorTrigger() {
  const [showEditor, setShowEditor] = useState(false);

  return showEditor ? (
    <Suspense fallback={<EditorSkeleton />}>
      <HeavyEditor />
    </Suspense>
  ) : (
    <button onClick={() => setShowEditor(true)}>Open Editor</button>
  );
}
```

### Intersection Observer lazy loading

```tsx
import { useRef, useEffect, useState, lazy, Suspense } from 'react';

const BelowFold = lazy(() => import('./components/BelowFold'));

function LazySection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin: '200px' } // preload slightly before visible
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible && (
        <Suspense fallback={<SectionSkeleton />}>
          <BelowFold />
        </Suspense>
      )}
    </div>
  );
}
```

### Tree-shaking checklist

```json
// package.json
{
  "sideEffects": false,
  // or specify files with side effects:
  "sideEffects": ["*.css", "./src/polyfills.ts"]
}
```

```ts
// Bad: barrel import pulls everything
import { Button, Icon, Modal } from './components';

// Good: direct imports, tree-shakeable
import { Button } from './components/Button';
import { Icon } from './components/Icon';
```

### Bundle analysis

```bash
# Vite
npx vite-bundle-visualizer

# Next.js
ANALYZE=true next build  # with @next/bundle-analyzer

# Webpack
npx webpack-bundle-analyzer stats.json
```

### Budget enforcement (CI)

```ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Warn if chunk exceeds 200KB
        experimentalMinChunkSize: 200_000,
      },
    },
  },
});
```
