---
type: knowledge
title: "Core Web Vitals Optimization Checklist"
---

# Core Web Vitals Optimization Checklist

## LCP Optimization (<2.5s target)

### Critical Path
- [ ] Identify LCP element (DevTools > Performance > LCP marker)
- [ ] LCP image has `fetchpriority="high"` attribute
- [ ] LCP image is NOT lazy-loaded
- [ ] LCP resource discoverable in initial HTML (not loaded via JS/CSS)
- [ ] Add `<link rel="preload">` if LCP image URL comes from CSS or JS

### Server & Network
- [ ] Server response time (TTFB) <800ms
- [ ] CDN for static assets with edge caching
- [ ] Enable HTTP/2 or HTTP/3
- [ ] Compress with Brotli (priority) or gzip
- [ ] Cache-Control headers set (immutable for hashed assets)

### Render Blocking
- [ ] Critical CSS inlined in `<head>`
- [ ] Non-critical CSS loaded async (`media="print" onload="this.media='all'"`)
- [ ] No render-blocking JS in `<head>` (use `defer` or `async`)
- [ ] Font display: `swap` or `optional`
- [ ] Preload critical font files

### Resources
- [ ] Images served in AVIF/WebP with proper srcset
- [ ] Third-party scripts deferred or loaded on interaction

## INP Optimization (<200ms target)

### Event Handlers
- [ ] No event handler takes >50ms (check with Performance tab)
- [ ] Long handlers broken with `scheduler.yield()`
- [ ] Heavy computation offloaded to Web Worker
- [ ] Input handlers debounced where appropriate

### Rendering
- [ ] React: memoize expensive components (`React.memo`, `useMemo`)
- [ ] Lists with >50 items virtualized
- [ ] No forced synchronous layouts in event handlers
- [ ] CSS containment (`contain: content`) on independent sections

### Third-Party Impact
- [ ] Third-party scripts don't run during interactions
- [ ] Analytics send via `navigator.sendBeacon()` (non-blocking)
- [ ] Chat widgets load on interaction, not page load

## CLS Optimization (<0.1 target)

### Images & Media
- [ ] All `<img>` have explicit `width` and `height`
- [ ] All `<video>` have explicit dimensions
- [ ] All `<iframe>` wrapped in aspect-ratio container
- [ ] No images cause reflow on load

### Dynamic Content
- [ ] Ads have reserved space (`min-height`)
- [ ] Dynamically inserted content doesn't push existing content
- [ ] Skeleton screens match final layout dimensions
- [ ] Notifications/banners use `position: fixed/sticky` (not in flow)

### Fonts
- [ ] Web fonts use `font-display: optional` (no swap shift)
- [ ] OR use `size-adjust` to match fallback metrics
- [ ] Font files preloaded: `<link rel="preload" as="font" crossorigin>`

### Animations
- [ ] Layout-triggering properties not animated (width, height, top, left)
- [ ] Use `transform` and `opacity` for animations (compositor-only)
- [ ] `will-change` used sparingly on known animation targets

## Quick Diagnostic Commands

```bash
# Lighthouse CLI
npx lighthouse https://example.com --output=json --output-path=./report.json

# Core Web Vitals from CrUX
curl "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=API_KEY" \
  -d '{"url": "https://example.com"}'

# Bundle size check
npx vite-bundle-visualizer
npx source-map-explorer dist/assets/*.js
```

## Priority Matrix

| Impact | Effort | Action |
|--------|--------|--------|
| High | Low | Add fetchpriority="high" to LCP image |
| High | Low | Add width/height to images |
| High | Low | Defer third-party scripts |
| High | Medium | Code split by route |
| High | Medium | Serve AVIF/WebP images |
| Medium | Low | Add `loading="lazy"` below fold |
| Medium | Medium | Inline critical CSS |
| Medium | High | Implement streaming SSR |
| Low | Low | Add `decoding="async"` to images |
| Low | Medium | Preconnect to third-party origins |
