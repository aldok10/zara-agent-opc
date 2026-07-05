---
type: knowledge
title: "Frontend Performance Common Mistakes"
---

# 12 Frontend Performance Mistakes

## 1. Lazy-Loading the LCP Image

**Wrong:** `<img src="hero.jpg" loading="lazy" />` on the largest visible element.
**Fix:** Remove `loading="lazy"`, add `fetchpriority="high"`. LCP content must load eagerly.

## 2. Missing Image Dimensions

**Wrong:** `<img src="photo.jpg" />` without width/height  -  causes layout shift on load.
**Fix:** Always specify `width` and `height` attributes. Use CSS `aspect-ratio` as backup.

## 3. Shipping Unused JavaScript

**Wrong:** Single bundle with all routes + libraries. Users download 500KB for one page.
**Fix:** Route-based code splitting. Dynamic imports for heavy features. Bundle analyzer in CI.

## 4. Render-Blocking Third-Party Scripts

**Wrong:** `<script src="analytics.js"></script>` in `<head>` without defer/async.
**Fix:** Use `defer` for all non-critical scripts. Load chat/analytics after interaction.

```html
<!-- Bad -->
<script src="https://cdn.chat.io/widget.js"></script>

<!-- Good -->
<script>
  document.addEventListener('click', () => {
    import('https://cdn.chat.io/widget.js');
  }, { once: true });
</script>
```

## 5. srcset Without sizes

**Wrong:** `<img srcset="sm.jpg 400w, lg.jpg 1200w" />`  -  browser assumes 100vw, downloads largest.
**Fix:** Always pair `srcset` with `sizes` attribute matching your layout.

## 6. Not Preloading Critical Fonts

**Wrong:** Browser discovers font in CSS, starts download late, text invisible or shifts.
**Fix:** `<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>`

## 7. Long Tasks in Event Handlers

**Wrong:** Processing 1000 items synchronously in a click handler  -  UI freezes for 500ms.
**Fix:** Break into chunks with `scheduler.yield()` or `requestIdleCallback`.

## 8. Inline All CSS

**Wrong:** Inlining 200KB of CSS in HTML  -  slows TTFB, not cacheable.
**Fix:** Inline ONLY critical (above-fold) CSS (~14KB). Load rest async.

## 9. Over-Memoizing in React

**Wrong:** Wrapping every component in `React.memo` and every value in `useMemo`.
**Fix:** Profile first. Memoize only components that re-render expensively with same props.

## 10. Serving JPEG/PNG Without Modern Formats

**Wrong:** Only serving JPEG  -  30-50% larger than AVIF/WebP.
**Fix:** Use `<picture>` with AVIF > WebP > JPEG fallback. Or use image CDN with auto-format.

## 11. Not Using Content Visibility

**Wrong:** Rendering 100 off-screen sections eagerly  -  browser lays out everything.
**Fix:** `content-visibility: auto` on below-fold sections. Browser skips layout/paint until needed.

```css
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* estimated height */
}
```

## 12. Optimizing Without Measuring

**Wrong:** "Let's add lazy loading everywhere" without knowing what's actually slow.
**Fix:** Measure with Lighthouse + CrUX field data first. Identify the actual bottleneck. Fix the #1 issue, re-measure.

### Measurement Workflow
1. Lighthouse audit (lab baseline)
2. Check CrUX/PageSpeed Insights (field data)
3. Identify worst metric
4. Profile with DevTools Performance tab
5. Fix the specific bottleneck
6. Re-measure to confirm improvement
