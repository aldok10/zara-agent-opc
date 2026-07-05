<!-- 
  SvelteKit Form Action Example
  Progressive enhancement: works without JavaScript, enhances with JS.
  File: src/routes/contacts/+page.svelte
  Pair with: +page.server.ts containing the actions
-->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let submitting = $state(false);
</script>

<h1>Add Contact</h1>

<!-- use:enhance enables progressive enhancement -->
<form
  method="POST"
  action="?/create"
  use:enhance={() => {
    submitting = true;
    return async ({ update }) => {
      await update();
      submitting = false;
    };
  }}
>
  <label>
    Name
    <input
      name="name"
      type="text"
      value={form?.name ?? ''}
      required
      aria-invalid={form?.errors?.name ? 'true' : undefined}
      aria-describedby={form?.errors?.name ? 'name-error' : undefined}
    />
    {#if form?.errors?.name}
      <span id="name-error" class="error">{form.errors.name}</span>
    {/if}
  </label>

  <label>
    Email
    <input
      name="email"
      type="email"
      value={form?.email ?? ''}
      required
      aria-invalid={form?.errors?.email ? 'true' : undefined}
    />
    {#if form?.errors?.email}
      <span class="error">{form.errors.email}</span>
    {/if}
  </label>

  <button type="submit" disabled={submitting}>
    {submitting ? 'Saving...' : 'Save Contact'}
  </button>

  {#if form?.success}
    <p class="success" role="status">Contact saved!</p>
  {/if}
</form>

<!-- Delete action (separate form for different action) -->
{#each data.contacts as contact}
  <div class="contact">
    <span>{contact.name} ({contact.email})</span>
    <form method="POST" action="?/delete" use:enhance>
      <input type="hidden" name="id" value={contact.id} />
      <button type="submit" aria-label="Delete {contact.name}">Delete</button>
    </form>
  </div>
{/each}

<!--
  Corresponding +page.server.ts:

  import { fail } from '@sveltejs/kit';
  import type { Actions, PageServerLoad } from './$types';

  export const load: PageServerLoad = async ({ locals }) => {
    return { contacts: await locals.db.getContacts() };
  };

  export const actions: Actions = {
    create: async ({ request, locals }) => {
      const data = await request.formData();
      const name = data.get('name')?.toString().trim();
      const email = data.get('email')?.toString().trim();

      const errors: Record<string, string> = {};
      if (!name) errors.name = 'Name is required';
      if (!email || !email.includes('@')) errors.email = 'Valid email required';

      if (Object.keys(errors).length) {
        return fail(400, { name, email, errors });
      }

      await locals.db.createContact({ name, email });
      return { success: true };
    },

    delete: async ({ request, locals }) => {
      const data = await request.formData();
      const id = data.get('id')?.toString();
      if (!id) return fail(400, { error: 'Missing ID' });
      await locals.db.deleteContact(id);
    },
  };
-->
