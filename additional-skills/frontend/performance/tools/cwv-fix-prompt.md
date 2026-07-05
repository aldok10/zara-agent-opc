---
type: tool
title: "Core Web Vitals Fix Plan"
---

# Core Web Vitals Fix Plan

## Purpose

Diagnose and fix Core Web Vitals issues (LCP, CLS, INP) with specific, measurable actions. Moves from symptom identification through root cause analysis to verified improvement.

## When to Use

- PageSpeed Insights or CrUX showing poor/needs-improvement scores
- LCP exceeding 2.5s threshold
- CLS exceeding 0.1 threshold
- INP exceeding 200ms threshold
- Preparing for search ranking impact of CWV

## Prompt Template

```
CONTEXT:
- Current scores: [LCP: Xs | CLS: X.XX | INP: Xms]
- Measurement source: [CrUX | PageSpeed | web-vitals library | RUM]
- Page type: [landing page | product listing | article | SPA]
- Framework: [Next.js | Nuxt | Remix | SvelteKit | vanilla | WordPress]
- Hosting: [CDN details, edge presence]
- Key resources: [fonts, images, third-party scripts]
- Mobile vs desktop: [which is worse]

DIAGNOSIS:
1. LCP (Largest Contentful Paint) - target < 2.5s
   - Identify LCP element (image, text block, video poster)
   - Resource discovery: is it in initial HTML or requires JS?
   - Loading chain: DNS -> connection -> TTFB -> download -> render
   - Bottlenecks: render-blocking CSS/JS, slow server, large images
   - Priorities: fetchpriority="high", preload, server push

2. CLS (Cumulative Layout Shift) - target < 0.1
   - Identify shifting elements (Layout Shift regions in DevTools)
   - Root causes: images/ads without dimensions, late-loading fonts,
     dynamically injected content, client-rendered above-fold
   - Fixes: explicit width/height or aspect-ratio, font-display,
     placeholder/skeleton, transform animations vs layout properties

3. INP (Interaction to Next Paint) - target < 200ms
   - Identify slow interactions (click, keypress, tap)
   - Break down: input delay + processing time + presentation delay
   - Input delay: long tasks blocking main thread
   - Processing: expensive event handlers, synchronous work
   - Presentation: forced reflows, large DOM updates
   - Fixes: yield to main thread, web workers, virtualization,
     requestAnimationFrame, CSS containment

FIX STRATEGIES:
1. Quick wins (< 1 day effort)
   - Add image dimensions / aspect-ratio
   - Preload LCP image
   - Set fetchpriority on critical resources
   - font-display: swap or optional
   - Defer non-critical third-party scripts

2. Medium effort (1-3 days)
   - Implement responsive images (srcset, sizes, modern formats)
   - Code split route-level bundles
   - Move computation to web workers
   - Implement loading skeletons for dynamic content
   - Optimize server response time (caching, edge)

3. Architecture changes (> 3 days)
   - SSR/SSG for critical rendering path
   - Streaming HTML for progressive rendering
   - Virtualize long lists
   - Redesign third-party script loading strategy
   - CDN edge rendering for personalization

MEASUREMENT:
- Lab: Lighthouse, WebPageTest (controlled)
- Field: CrUX (28-day rolling), RUM (real-time)
- A/B: compare before/after in field data
- Regression: CI performance budget enforcement
```

## Output Format

```
## CWV Fix Plan: [page/site]

### Current vs Target
| Metric | Current (P75) | Target | Gap |
|--------|---------------|--------|-----|
| LCP | ... | < 2.5s | ... |
| CLS | ... | < 0.1 | ... |
| INP | ... | < 200ms | ... |

### Root Causes
| Metric | Cause | Evidence | Impact |
|--------|-------|----------|--------|
| ... | ... | [tool output/trace] | ... |

### Fix Plan (Priority Order)
| # | Fix | Metric | Expected Gain | Effort |
|---|-----|--------|---------------|--------|
| 1 | ... | LCP | -500ms | 2h |
| 2 | ... | CLS | -0.05 | 1h |

### Implementation Details
[Key code/config changes for top priority fixes]

### Verification
1. [Lighthouse before/after comparison]
2. [RUM monitoring for 1 week post-deploy]
3. [CrUX improvement in 28 days]

### Monitoring Setup
- [Performance budget in CI]
- [RUM alerting thresholds]
```
