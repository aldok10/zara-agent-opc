# SSR Subskill

Activation: user works with Angular SSR, hydration, prerendering, or server-side rendering setup.

## Core Principles

1. Angular uses `@angular/ssr` (replaces Angular Universal).
2. Incremental hydration enables partial client-side activation.
3. Prerendering (SSG) generates static HTML at build time.
4. Server routes configure per-path rendering mode.
5. Avoid DOM/browser APIs on the server  -  use `afterNextRender()` or `isPlatformBrowser()`.

## Decision Table

| Scenario | Approach |
|----------|----------|
| SEO-critical pages | SSR or prerender |
| Static content (blog, docs) | Prerender at build (SSG) |
| Dynamic personalized content | SSR with hydration |
| Heavy client-only widget | `@defer` + `afterNextRender()` |
| Avoid full-page hydration cost | Incremental hydration |
| Browser API access | Guard with `afterNextRender()` |

## Setup

```typescript
// app.config.server.ts
import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRoutesConfig } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRoutesConfig(serverRoutes),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

```typescript
// app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'dashboard', renderMode: RenderMode.Server },
  { path: 'admin/**', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Prerender },
];
```

## Hydration

```typescript
// app.config.ts
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withIncrementalHydration()),
  ],
};
```

### Incremental Hydration with @defer

```html
<!-- Only hydrates when user scrolls to it -->
@defer (on viewport; hydrate on viewport) {
  <app-comments [postId]="postId()" />
} @placeholder {
  <div class="comments-skeleton"></div>
}
```

Hydrate triggers: `hydrate on idle`, `hydrate on viewport`, `hydrate on interaction`, `hydrate on timer(ms)`, `hydrate when condition`, `hydrate never`.

## Browser API Safety

```typescript
import { Component, afterNextRender, afterRender, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({ ... })
export class ChartComponent {
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    // Runs only in browser, after DOM is ready
    afterNextRender(() => {
      this.initChart();
    });
  }

  private initChart() {
    // Safe to use document, window, etc.
  }
}
```

## Transfer State

Angular SSR automatically transfers HTTP responses from server to client via `TransferState`. When using `provideHttpClient()` with SSR, responses are serialized into the HTML and reused on the client  -  no duplicate requests.

```typescript
// Automatic with provideHttpClient() + SSR  -  no manual setup needed
import { provideHttpClient, withFetch } from '@angular/common/http';
```

## Prerendering with Dynamic Routes

```typescript
// app.routes.server.ts
export const serverRoutes: ServerRoute[] = [
  {
    path: 'blog/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const posts = await fetch('https://api.example.com/posts').then(r => r.json());
      return posts.map((p: any) => ({ slug: p.slug }));
    },
  },
];
```

## Gotchas

1. **No `window`/`document` on server.** Use `afterNextRender()` or platform check.
2. **localStorage/sessionStorage unavailable on server.** Abstract behind a service with platform guard.
3. **Hydration mismatch = flickering.** Ensure server and client render identical DOM.
4. **`@defer` blocks skip SSR by default.** Content renders only on client unless `hydrate` trigger specified.
5. **HTTP interceptors run on server too.** Don't add browser-only headers unconditionally.
6. **Event listeners in `afterNextRender()` need cleanup.** Use `DestroyRef` or `afterRender` with cleanup callback.
