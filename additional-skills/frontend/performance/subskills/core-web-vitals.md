---
name: core-web-vitals
trigger: "LCP optimization, INP fix, CLS issue, Core Web Vitals, Lighthouse, CrUX"
---

# Core Web Vitals

## Activation

User needs to measure, debug, or fix LCP, INP, or CLS issues.

## Metrics Quick Reference

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | <2.5s | 2.5–4.0s | >4.0s |
| INP | <200ms | 200–500ms | >500ms |
| CLS | <0.1 | 0.1–0.25 | >0.25 |

## LCP (Largest Contentful Paint)

**What it measures:** Time until the largest visible element renders (image, heading, video poster).

### Common LCP Elements
- Hero image
- `<h1>` text with web font
- Background image (CSS)
- Video poster frame

### Optimization Strategies

| Issue | Fix |
|-------|-----|
| LCP image lazy-loaded | Remove `loading="lazy"`, add `fetchpriority="high"` |
| LCP image from CSS | Move to `<img>` or add `<link rel="preload">` |
| Render-blocking CSS | Inline critical CSS, async non-critical |
| Slow server response | Caching, CDN, streaming SSR |
| Large JavaScript blocking render | Code split, defer non-critical JS |
| Web font blocking text | `font-display: swap` + preload font file |

### LCP Pattern

```html
<!-- Hero image — always fetchpriority="high", never lazy -->
<img
  src="/hero.webp"
  alt="Product showcase"
  fetchpriority="high"
  width="1200"
  height="600"
  decoding="async"
/>

<!-- Preload if image URL not in initial HTML -->
<link rel="preload" as="image" href="/hero.avif" type="image/avif" />
```

## INP (Interaction to Next Paint)

**What it measures:** Responsiveness — time from user interaction to next visual update.

### Optimization Strategies

| Issue | Fix |
|-------|-----|
| Long event handler (>50ms) | Break into chunks with `scheduler.yield()` |
| Heavy computation on click | Move to Web Worker |
| Re-render entire tree | Memoize components, virtualize lists |
| Third-party script blocking | Load after interaction, use `requestIdleCallback` |

### INP Pattern

```ts
async function handleClick(items: Item[]) {
  // Process in chunks to avoid long task
  for (const item of items) {
    processItem(item);
    // Yield to main thread between items
    await scheduler.yield();
  }
  updateUI();
}

// Fallback for browsers without scheduler.yield()
function yieldToMain() {
  if ('scheduler' in globalThis && 'yield' in scheduler) {
    return scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}
```

## CLS (Cumulative Layout Shift)

**What it measures:** Visual stability — unexpected layout movement during page life.

### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Images without dimensions | Add `width` + `height` attributes |
| Ads/embeds without reserved space | Use `aspect-ratio` or `min-height` |
| Dynamically injected content | Reserve space with placeholder |
| Web fonts causing reflow | `font-display: optional` or `size-adjust` |
| Late-loaded CSS | Inline critical, preload rest |

### CLS Pattern

```html
<!-- Always set dimensions to prevent layout shift -->
<img src="/photo.webp" alt="..." width="800" height="600" />

<!-- Reserve space for dynamic embed -->
<div style="aspect-ratio: 16/9; background: #f0f0f0;">
  <iframe src="..." loading="lazy"></iframe>
</div>
```

```css
/* Prevent font swap CLS */
@font-face {
  font-family: 'Brand';
  src: url('/fonts/brand.woff2') format('woff2');
  font-display: optional;
  size-adjust: 100.5%;
}
```

## Measurement Tools

| Tool | Type | Use For |
|------|------|---------|
| Chrome DevTools Performance | Lab | Debugging specific interactions |
| Lighthouse | Lab | Overall score + recommendations |
| WebPageTest | Lab | Waterfall, filmstrip, multi-location |
| CrUX / PageSpeed Insights | Field | Real-user data at origin level |
| `web-vitals` library | Field | Custom RUM implementation |

### Measure in Code

```ts
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(console.log);  // { name: 'LCP', value: 2100, entries: [...] }
onINP(console.log);  // { name: 'INP', value: 150, entries: [...] }
onCLS(console.log);  // { name: 'CLS', value: 0.05, entries: [...] }
```
