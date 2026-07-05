---
type: fact
title: "Loading Strategies"
---

# Loading Strategies

## Code Splitting

### Route-Based
```tsx
import { lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-Level (heavy components only)
```tsx
const Chart = lazy(() => import('./Chart'));
// Only split components >10KB; splitting tiny components adds overhead
```

### Vendor Chunks (Vite)
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: { 'react-vendor': ['react', 'react-dom'] }
    }
  }
}
```

## Lazy Loading

```html
<!-- Native image lazy loading (below-fold only) -->
<img src="photo.webp" loading="lazy" decoding="async" alt="..." />
<!-- NEVER lazy-load LCP image -->
<img src="hero.webp" fetchpriority="high" alt="..." />
```

### Intersection Observer
```ts
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
}, { rootMargin: '200px' });
```

## Prefetch and Preload

```html
<!-- Preload: critical for current page (fonts, LCP image) -->
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin />

<!-- Prefetch: needed for likely next navigation (idle priority) -->
<link rel="prefetch" href="/pages/dashboard.js" />

<!-- Preconnect: establish early connection to API/CDN origin -->
<link rel="preconnect" href="https://api.example.com" crossorigin />
```

Router-based: prefetch on hover/focus for near-instant navigation.

## Streaming SSR (React 18+)

```tsx
import { renderToPipeableStream } from 'react-dom/server';

app.get('*', (req, res) => {
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() {
      res.setHeader('Content-Type', 'text/html');
      pipe(res); // shell streams immediately, Suspense boundaries fill in later
    },
  });
});
```

Benefits: lower TTFB, progressive content display, no blank-page-then-full-page flash.

## Islands Architecture

Server renders full static HTML. Only interactive "islands" hydrate with JS.

```astro
<Header />                          <!-- static, zero JS -->
<SearchBar client:visible />        <!-- hydrates when scrolled into view -->
<Footer />                          <!-- static, zero JS -->
```

| Directive | Hydrates When | Use Case |
|-----------|--------------|----------|
| `client:load` | Page load | Above-fold interactive |
| `client:idle` | Browser idle | Non-critical widgets |
| `client:visible` | Enters viewport | Below-fold components |
| `client:media` | Media query matches | Mobile-only features |

## Decision Matrix

| Strategy | Best For | Avoid When |
|----------|----------|-----------|
| Route splitting | SPAs with many routes | Routes are tiny (<5KB) |
| Component splitting | Heavy optional UI (charts, editors) | Component <10KB |
| Prefetch | Predictable navigation | Don't prefetch everything |
| Streaming SSR | Data-heavy pages with slow APIs | Static content (use SSG) |
| Islands | Content-heavy, mostly-static sites | Highly interactive SPAs |
