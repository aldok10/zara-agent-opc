# Subskill: SvelteKit

## Activation

Triggered when task involves: routing, pages, layouts, form actions, load functions, SSR, SSG, adapters, hooks, middleware, API routes, progressive enhancement.

## Core Principles

1. **File-based routing** — `src/routes/` directory structure defines URL paths.
2. **Server-first** — Load functions run on server first, rerun on client navigation.
3. **Progressive enhancement** — Form actions work without JavaScript.
4. **Separation** — `+page.server.ts` for server-only logic, `+page.ts` for universal.
5. **Type safety** — Generated types from `$types` for load/action data.

## Decision Table

| Need | File | Pattern |
|------|------|---------|
| Page component | `+page.svelte` | Renders route |
| Server data fetching | `+page.server.ts` (load) | DB queries, secrets |
| Universal data fetching | `+page.ts` (load) | Public APIs, shared logic |
| Form mutations | `+page.server.ts` (actions) | Create/update/delete |
| API endpoint | `+server.ts` | REST, webhooks |
| Shared layout | `+layout.svelte` | Nav, sidebar |
| Layout data | `+layout.server.ts` | Auth, user session |
| Error page | `+error.svelte` | Custom error UI |
| Server hooks | `hooks.server.ts` | Auth middleware, logging |
| Client hooks | `hooks.client.ts` | Error reporting |
| Param validation | `params/[name].ts` | Type-safe route params |

## Patterns

### Load Function (Server)

```typescript
// src/routes/posts/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, depends }) => {
  depends('app:posts'); // invalidation key

  const posts = await locals.db.query('SELECT * FROM posts WHERE published = true');

  if (!posts) throw error(404, 'No posts found');

  return { posts };
};
```

### Load Function (Universal)

```typescript
// src/routes/posts/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
  // Uses SvelteKit's fetch (handles cookies, relative URLs)
  const res = await fetch(`/api/posts/${params.id}`);
  const post = await res.json();
  return { post };
};
```

### Page Component with Load Data

```svelte
<!-- src/routes/posts/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<h1>Posts</h1>
{#each data.posts as post}
  <article>
    <h2>{post.title}</h2>
    <p>{post.excerpt}</p>
  </article>
{/each}
```

### Form Actions

```typescript
// src/routes/login/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(303, '/dashboard');
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email')?.toString();
    const password = data.get('password')?.toString();

    if (!email || !password) {
      return fail(400, { email, missing: true });
    }

    const user = await authenticate(email, password);
    if (!user) {
      return fail(401, { email, incorrect: true });
    }

    cookies.set('session', user.token, { path: '/', httpOnly: true });
    throw redirect(303, '/dashboard');
  }
};
```

### Form Component (Progressive Enhancement)

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<form method="POST" use:enhance>
  <label>
    Email
    <input name="email" type="email" value={form?.email ?? ''} required />
  </label>

  <label>
    Password
    <input name="password" type="password" required />
  </label>

  {#if form?.missing}
    <p class="error">All fields required.</p>
  {/if}
  {#if form?.incorrect}
    <p class="error">Invalid credentials.</p>
  {/if}

  <button type="submit">Log in</button>
</form>
```

### API Route

```typescript
// src/routes/api/posts/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const limit = Number(url.searchParams.get('limit') ?? '10');
  const posts = await locals.db.query('SELECT * FROM posts LIMIT $1', [limit]);
  return json(posts);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');

  const body = await request.json();
  const post = await locals.db.insert('posts', body);
  return json(post, { status: 201 });
};
```

### Hooks (Auth Middleware)

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const session = event.cookies.get('session');

  if (session) {
    event.locals.user = await validateSession(session);
  }

  // Protected routes
  if (event.url.pathname.startsWith('/dashboard') && !event.locals.user) {
    return new Response(null, { status: 303, headers: { location: '/login' } });
  }

  return resolve(event);
};
```

### Invalidation & Reloading

```svelte
<script lang="ts">
  import { invalidate, invalidateAll } from '$app/navigation';

  async function refresh() {
    await invalidate('app:posts'); // re-run load functions with this dependency
  }

  async function refreshAll() {
    await invalidateAll(); // re-run all load functions
  }
</script>
```

## Rendering Modes

```typescript
// +page.ts or +page.server.ts
export const prerender = true;  // Static at build time
export const ssr = false;       // Client-only (SPA mode)
export const csr = false;       // Server-only (no JS sent)
```

## Rules

- Always use `$types` imports for type safety — never manually type load/action data.
- Form actions over API routes for mutations from pages.
- `use:enhance` on every form unless you have a specific reason not to.
- Server load for secrets/DB; universal load for public fetch.
- Use `error()` and `redirect()` by throwing, not returning.
- Validate all form data server-side; client validation is UX only.
