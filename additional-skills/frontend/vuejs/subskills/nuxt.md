---
type: subskill
title: "Subskill: Nuxt 3"
---

# Subskill: Nuxt 3

Activate when: building with Nuxt 3, server routes, SSR/ISR/SPA hybrid rendering, middleware, auto-imports, SEO.

## Core Principles

1. **Auto-imports are law.** Never import Vue/Nuxt composables manually. `ref`, `computed`, `useFetch`, `useRoute`, `useState`  -  all available globally.
2. **File-based routing.** `pages/` directory = routes. Dynamic: `[id].vue`. Catch-all: `[...slug].vue`.
3. **Server routes = BFF.** `server/api/` and `server/routes/` for backend logic. No Express needed.
4. **Hybrid rendering.** Per-route rendering strategy via `routeRules` in `nuxt.config.ts`.
5. **Data fetching.** `useFetch` (SSR-friendly, cached) > `useAsyncData` (custom logic) > raw `$fetch` (client-only/server routes).

## Decision Table: Data Fetching

| Situation | Use | Why |
|-----------|-----|-----|
| Fetch API data in page/component | `useFetch('/api/items')` | SSR-safe, deduped, cached |
| Custom async logic (multiple calls) | `useAsyncData('key', () => ...)` | Full control, still SSR-safe |
| Inside server route | `$fetch` or direct DB call | Server-side only, no hydration needed |
| Client-only fetch (after interaction) | `$fetch` with `onMounted` or event | Skip SSR payload |
| Refresh/poll | `useFetch` with `{ refresh, poll }` | Built-in |

## Rendering Strategies (routeRules)

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },            // Static at build time
    '/dashboard/**': { ssr: false },     // SPA (client-only)
    '/blog/**': { isr: 3600 },           // ISR: regenerate every hour
    '/api/**': { cors: true },           // API routes with CORS
    '/old-page': { redirect: '/new' },   // Redirect
  },
})
```

## Server Routes

```typescript
// server/api/users/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const user = await db.user.findUnique({ where: { id } })
  if (!user) throw createError({ statusCode: 404, message: 'User not found' })

  return user // auto-serialized to JSON
})
```

Method suffix convention: `.get.ts`, `.post.ts`, `.put.ts`, `.delete.ts`.

## Middleware

```typescript
// middleware/auth.ts (named middleware)
export default defineNuxtRouteMiddleware((to, from) => {
  const user = useAuth() // your auth composable
  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})

// Usage in page:
definePageMeta({ middleware: 'auth' })

// middleware/auth.global.ts  -  runs on every route (file suffix)
```

## State Management in Nuxt

```typescript
// composables/useCounter.ts (auto-imported)
export function useCounter() {
  const count = useState('counter', () => 0) // SSR-safe shared state
  const increment = () => count.value++
  return { count, increment }
}
```

`useState` is SSR-hydration-safe. For complex state, use Pinia (auto-integrated via `@pinia/nuxt`).

## SEO

```vue
<script setup lang="ts">
useSeoMeta({
  title: 'Page Title',
  description: 'Page description for search engines',
  ogTitle: 'Open Graph Title',
  ogImage: '/og-image.png',
})

useHead({
  htmlAttrs: { lang: 'en' },
  link: [{ rel: 'canonical', href: 'https://example.com/page' }],
})
</script>
```

## Project Structure

```
app/
├── pages/          # File-based routing
├── components/     # Auto-imported components
├── composables/    # Auto-imported composables (use*)
├── layouts/        # Layout components
├── middleware/     # Route middleware
├── plugins/        # Nuxt plugins
├── server/
│   ├── api/        # API routes (/api/*)
│   ├── routes/     # Server routes (custom paths)
│   ├── middleware/  # Server middleware (h3)
│   └── utils/      # Server-only utilities
├── assets/         # Processed by bundler
├── public/         # Served as-is
├── nuxt.config.ts
└── app.vue         # Root component
```

## Anti-Patterns

```typescript
// WRONG: manual imports in Nuxt
import { ref, computed } from 'vue'
import { useFetch } from '#app'
// These are auto-imported. Remove the imports.

// WRONG: using useFetch in event handlers (only works in setup)
async function onClick() {
  const { data } = await useFetch('/api/thing') // ERROR
}
// RIGHT: use $fetch in event handlers
async function onClick() {
  const result = await $fetch('/api/thing')
}

// WRONG: calling useFetch conditionally
if (someCondition) {
  const { data } = useFetch('/api/data') // breaks SSR hydration
}
// RIGHT: use enabled option or lazy
const { data } = useFetch('/api/data', { immediate: someCondition })
```
