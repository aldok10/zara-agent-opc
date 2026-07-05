---
type: tool
title: "Web Performance Audit"
---

# Web Performance Audit

## Purpose

Audit web application performance focusing on Core Web Vitals, loading strategy, rendering performance, and runtime efficiency. Identify bottlenecks and provide actionable fixes.

## When to Use

- Diagnosing slow page loads or poor CWV scores
- Reviewing code changes for performance impact
- Planning performance optimization work
- Pre-launch performance validation

## Prompt Template

Given the following context:

```
[paste component code / page code / performance metrics / lighthouse report]
```

Page/route: `[URL or route path]`

Audit for:

1. **LCP (Largest Contentful Paint)**: Is the LCP element loading optimally? Are render-blocking resources minimized? Is the critical rendering path short? Are fonts/images preloaded?
2. **INP (Interaction to Next Paint)**: Are event handlers fast (<50ms)? Is main thread blocking minimized? Are long tasks broken up? Is input handling debounced appropriately?
3. **CLS (Cumulative Layout Shift)**: Are dimensions set on images/videos? Are dynamic elements reserved space? Are web fonts causing FOIT/FOUT shifts? Is content injection above the fold?
4. **Loading Strategy**: Is code-split at route level? Are non-critical scripts deferred? Is prefetching/preloading used for likely navigations? Is the bundle size reasonable?
5. **Rendering**: Are expensive re-renders avoided? Is virtualization used for long lists? Are CSS animations on compositor-friendly properties? Is `requestAnimationFrame` used correctly?
6. **Network**: Are resources compressed (gzip/brotli)? Is HTTP/2+ used? Are CDN cache headers correct? Are API calls batched or parallelized?
7. **Images & Media**: Are formats modern (WebP/AVIF)? Are images sized correctly? Is lazy loading applied below the fold? Are responsive `srcset` values provided?

Context:
- Framework: [React/Vue/Angular/Svelte/vanilla]
- Rendering: [SSR/SSG/CSR/streaming]
- Current metrics: [LCP/INP/CLS values if known]
- Target: [specific metric goals]

## Output Format

```
## Performance Audit

### Critical (high impact)
- [metric affected] [issue]  -  [cause]  -  [fix]  -  [expected improvement]

### Moderate (medium impact)
- [metric affected] [issue]  -  [cause]  -  [fix]

### Opportunities
- [optimization not yet applied]

### Resource Budget
- JS: [current] → [target]
- CSS: [current] → [target]
- Images: [observations]

### Priority Order
1. [highest ROI fix first]
2. [next]
3. [next]

### Verdict
[good performance / needs optimization / critical issues]
```
