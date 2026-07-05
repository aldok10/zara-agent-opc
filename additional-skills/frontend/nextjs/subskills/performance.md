---
type: subskill
title: "Performance"
---

# Performance

Activate when: performance, PPR, streaming, bundle size, Core Web Vitals, LCP, CLS, INP, loading, Suspense.

## Core Principles

1. **Partial Prerendering (PPR)**  -  static shell rendered at build time, dynamic content streamed via Suspense boundaries. Best of both worlds.
2. **Server Components reduce bundle**  -  no JS shipped for RSC. Only `'use client'` components add to bundle.
3. **Streaming with Suspense**  -  show UI incrementally. Never block entire page on slow data.
4. **`loading.tsx`**  -  automatic Suspense boundary per route segment.
5. **Core Web Vitals**: LCP (largest paint < 2.5s), INP (interaction < 200ms), CLS (layout shift < 0.1).

## PPR (Partial Prerendering)

```tsx
// next.config.ts
const config: NextConfig = {
  experimental: {
    ppr: 'incremental', // Enable per-route
  },
}

// app/page.tsx
export const experimental_ppr = true

export default function Page() {
  return (
    <div>
      {/* Static shell  -  rendered at build time */}
      <header><h1>Product Page</h1></header>
      <StaticContent />

      {/* Dynamic hole  -  streamed at request time */}
      <Suspense fallback={<CartSkeleton />}>
        <Cart /> {/* Uses cookies/headers, makes it dynamic */}
      </Suspense>
    </div>
  )
}
```

## Streaming Pattern

```tsx
// Parallel data fetching with independent Suspense boundaries
export default function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Suspense fallback={<MetricsSkeleton />}>
        <Metrics /> {/* Slow API  -  streams when ready */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <Chart /> {/* Independent  -  doesn't block Metrics */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders /> {/* Also independent */}
      </Suspense>
    </div>
  )
}
```

## Bundle Optimization

```tsx
// Dynamic import for heavy client components
import dynamic from 'next/dynamic'

const HeavyEditor = dynamic(() => import('@/components/editor'), {
  loading: () => <EditorSkeleton />,
  ssr: false, // Only if component truly can't SSR
})

// next/image  -  automatic optimization
import Image from 'next/image'
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // Above-the-fold: preload
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// next/font  -  zero layout shift fonts
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })
```

## Decision Table

| Problem | Solution |
|---------|----------|
| Large page JS bundle | Move logic to Server Components |
| Heavy component not always visible | `dynamic()` with lazy loading |
| Slow data blocks page render | Suspense boundary around slow component |
| Layout shift from images | `next/image` with width/height |
| Layout shift from fonts | `next/font` with `display: 'swap'` |
| Static content + user-specific data | PPR (static shell + dynamic Suspense) |
| Third-party scripts blocking | `next/script` with `strategy="lazyOnload"` |
| Large list rendering | Virtualization (`react-window`) |

## Analyzing Bundle

```bash
# Build with bundle analysis
ANALYZE=true next build

# Or use @next/bundle-analyzer
# next.config.ts:
import withBundleAnalyzer from '@next/bundle-analyzer'
const config = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })({
  // ... config
})
```

## Image Optimization

```tsx
// Remote images  -  configure domains
// next.config.ts
const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
    ],
  },
}

// Responsive images
<Image
  src={product.image}
  alt={product.name}
  fill                    // Fill parent container
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
  priority={isAboveFold}  // Only for LCP images
/>
```

## Script Loading

```tsx
import Script from 'next/script'

// Analytics  -  load after page is interactive
<Script
  src="https://analytics.example.com/script.js"
  strategy="afterInteractive"
/>

// Non-critical  -  load when idle
<Script
  src="https://widget.example.com/embed.js"
  strategy="lazyOnload"
/>
```

## Core Web Vitals Checklist

**LCP (< 2.5s)**:
- Use `priority` on hero image
- Preload critical fonts with `next/font`
- Stream slow content below fold via Suspense
- Avoid client-side fetching for above-fold content

**INP (< 200ms)**:
- Keep event handlers fast; offload work to Server Actions
- Use `startTransition` for non-urgent state updates
- Avoid synchronous layout computations in handlers
- Debounce search inputs

**CLS (< 0.1)**:
- Set explicit `width`/`height` on images
- Use `next/font` to prevent FOIT/FOUT
- Reserve space for dynamic content (skeletons)
- Never inject content above existing content

## Common Mistakes

1. Using `'use client'` too high  -  ships unnecessary JS.
2. Not using Suspense boundaries  -  one slow fetch blocks everything.
3. Missing `priority` on LCP image  -  browser doesn't prioritize it.
4. Fetching data client-side when RSC would work  -  worse performance + more JS.
5. Not setting `sizes` on responsive images  -  browser downloads wrong size.
6. Using `ssr: false` by default on dynamic imports  -  hurts SEO/FCP.
