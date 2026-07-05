---
name: images
trigger: "Image optimization, responsive images, srcset, WebP, AVIF, next/image, lazy loading"
---

# Image Optimization

## Activation

User needs image format selection, responsive image markup, lazy loading strategy, or CDN integration.

## Core Principles

- Modern formats: AVIF (smallest) > WebP (wide support) > JPEG/PNG (fallback)
- Always provide width + height (prevent CLS)
- `loading="lazy"` for below-fold only  -  never on LCP image
- `fetchpriority="high"` on LCP image
- srcset + sizes for responsive  -  let browser pick optimal size
- Serve from CDN with auto-format negotiation when possible

## Decision Table

| Scenario | Approach |
|----------|----------|
| LCP hero image | `<img fetchpriority="high">`, no lazy, preload |
| Below-fold content images | `loading="lazy" decoding="async"` |
| Art direction (different crop per viewport) | `<picture>` with `<source media="...">` |
| Resolution switching (same image, different sizes) | `srcset` + `sizes` |
| Next.js project | `<Image>` component (auto-optimizes) |
| Background images (CSS) | Preload critical ones, lazy non-critical |
| Icons/logos | SVG inline or sprite |

## Patterns

### Responsive with AVIF/WebP fallback

```html
<picture>
  <source
    type="image/avif"
    srcset="/img/hero-400.avif 400w, /img/hero-800.avif 800w, /img/hero-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
  />
  <source
    type="image/webp"
    srcset="/img/hero-400.webp 400w, /img/hero-800.webp 800w, /img/hero-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
  />
  <img
    src="/img/hero-800.jpg"
    alt="Product hero"
    width="1200"
    height="600"
    fetchpriority="high"
    decoding="async"
  />
</picture>
```

### Below-fold lazy image

```html
<img
  src="/img/feature.webp"
  alt="Feature description"
  width="800"
  height="450"
  loading="lazy"
  decoding="async"
/>
```

### Next.js Image component

```tsx
import Image from 'next/image';

// LCP image  -  priority
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
  sizes="100vw"
/>

// Below-fold  -  default lazy
<Image
  src="/feature.jpg"
  alt="Feature"
  width={800}
  height={450}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Preload LCP image

```html
<head>
  <!-- Preload with format negotiation -->
  <link
    rel="preload"
    as="image"
    href="/img/hero.avif"
    type="image/avif"
    imagesrcset="/img/hero-400.avif 400w, /img/hero-800.avif 800w, /img/hero-1200.avif 1200w"
    imagesizes="100vw"
  />
</head>
```

### CSS aspect-ratio for placeholders

```css
.image-container {
  aspect-ratio: 16 / 9;
  background-color: #f0f0f0;
  overflow: hidden;
}
.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

## sizes Attribute Cheat Sheet

| Layout | sizes Value |
|--------|-------------|
| Full-width | `100vw` |
| Half on desktop, full on mobile | `(max-width: 768px) 100vw, 50vw` |
| Fixed width container | `600px` |
| Three-column grid | `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw` |

## Image Build Pipeline

```bash
# Sharp CLI for batch conversion
npx sharp-cli --input "src/images/*.{jpg,png}" --output "public/img/" --format avif --quality 65
npx sharp-cli --input "src/images/*.{jpg,png}" --output "public/img/" --format webp --quality 75

# Generate multiple sizes
for size in 400 800 1200 1600; do
  npx sharp-cli --input src/hero.jpg --output "public/img/hero-${size}.avif" --resize $size --format avif
done
```
