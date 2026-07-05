---
type: tool
title: "Svelte/SvelteKit Code Review"
---

# Svelte/SvelteKit Code Review

## Purpose

Review Svelte and SvelteKit code for correctness, modern patterns, and best practices. Focus on runes, reactivity, stores, SSR behavior, and SvelteKit routing.

## When to Use

- Reviewing Svelte components or SvelteKit routes
- Migrating from Svelte 4 stores to Svelte 5 runes
- Evaluating SSR/CSR boundaries and data loading
- Checking reactivity correctness

## Prompt Template

Given the following Svelte/SvelteKit code:

```
[paste component/route/server code]
```

File path: `[e.g., src/routes/dashboard/+page.svelte]`

Review for:

1. **Runes (Svelte 5)**: Are `$state`, `$derived`, and `$effect` used correctly? Is `$effect` scoped and minimal? Are `$props()` destructured properly? Is `$bindable()` used only when two-way binding is needed?
2. **Reactivity**: Are reactive declarations correct? Are there reactivity pitfalls (mutating objects without reassignment)? Is fine-grained reactivity leveraged?
3. **Stores (Svelte 4)**: Are stores typed? Is `$` syntax used in templates? Are custom stores well-encapsulated? Are subscriptions cleaned up in non-component contexts?
4. **SvelteKit Routing**: Are `+page.ts`/`+page.server.ts` load functions correct? Is data returned serializable? Are form actions used for mutations? Are route guards in `hooks.server.ts`?
5. **SSR**: Is client-only code guarded with `browser` check or `onMount`? Are side effects avoided in load functions? Is streaming used for slow data?
6. **Component Design**: Are components small and focused? Is slot/snippet composition used? Are events dispatched cleanly?
7. **Error Handling**: Are `+error.svelte` boundaries present? Are expected errors (`error()`) vs unexpected errors handled? Is form validation server-side?

Context:
- Svelte version: [4/5]
- SvelteKit: [yes/no]
- Adapter: [auto/node/static/vercel]
- State: [runes/stores/both]

## Output Format

```
## Svelte Review

### Issues
- [severity] [file:line]  -  [issue]  -  [fix]

### Reactivity
- [correctness observations]
- [potential pitfalls]

### SvelteKit Patterns
- [data loading assessment]
- [routing/layout observations]

### Migration Notes (if applicable)
- [Svelte 4 → 5 opportunities]

### Verdict
[approve / request changes / needs restructuring]
```
