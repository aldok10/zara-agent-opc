---
name: performance
description: "Frontend performance: Core Web Vitals, code splitting, images, runtime optimization"
---

# Frontend Performance

## Scope

Measuring and optimizing frontend performance. Covers Core Web Vitals (LCP, INP, CLS), code splitting, image optimization, runtime performance, third-party script management, and SSR/hydration strategies.

## First Action

Measure first. Run Lighthouse or check CrUX data before proposing optimizations. Read existing bundler config and rendering strategy.

## Constraints

1. Targets: LCP <2.5s, INP <200ms, CLS <0.1. Measure with real user data.
2. LCP: fetchpriority="high" on LCP image, preload critical resources.
3. INP: break long tasks with scheduler.yield(), keep event handlers fast.
4. CLS: set explicit dimensions on images/videos/embeds.
5. Code split by route. Lazy load below-fold components.
6. Streaming SSR + progressive hydration where supported.
7. Images: AVIF/WebP + srcset + sizes + loading="lazy" below fold.
8. Third-party scripts: defer or load after interaction.
9. Never lazy-load LCP content.
10. Measure before optimizing (Lighthouse, WebPageTest, CrUX).

## DO NOT

- Lazy-load above-the-fold or LCP content
- Add loading="lazy" to the first visible image
- Use srcset without sizes attribute (causes full-width download)
- Optimize without measuring first (premature optimization)
- Block main thread with synchronous third-party scripts
- Use large JavaScript bundles without code splitting
- Ignore CLS from dynamically injected content (ads, fonts, images)
- Trust synthetic-only metrics  -  validate with field data (CrUX)

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| LCP, INP, CLS measurement/fixes | `subskills/core-web-vitals.md` |
| Bundle size, lazy loading, tree-shaking | `subskills/code-splitting.md` |
| Image formats, responsive images, CDN | `subskills/images.md` |
| Long tasks, scheduling, workers, profiling | `subskills/runtime.md` |

## Verification

- Lighthouse performance score >90
- LCP <2.5s, INP <200ms, CLS <0.1 (lab AND field)
- Bundle size within budget (check with `npx vite-bundle-visualizer` or `next build`)
- No layout shifts visible on slow 3G throttled load
- Third-party scripts load after DOMContentLoaded

## Knowledge

- `knowledge/cwv-optimization.md`  -  Core Web Vitals optimization checklist
- `knowledge/common-mistakes.md`  -  12 performance mistakes with fixes

## AI-Era Context (2026)

- INP (Interaction to Next Paint) replaced FID as a Core Web Vital in March 2024 -- AI still references FID
- AI-generated code often ignores code splitting and creates single large bundles
- Streaming SSR with Suspense boundaries is the standard pattern; AI generates blocking renders
- `scheduler.yield()` is the standard way to break long tasks; AI generates setTimeout hacks
- AI often adds loading="lazy" to LCP images which hurts performance

## Related Skills

- `typescript-expert`  -  tree-shaking and module boundaries
- `frontend/testing`  -  performance regression testing
