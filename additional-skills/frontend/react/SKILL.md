---
name: react
description: "React 19: Server Components, Compiler, Actions, composition-first UI"
---

# React 19 Expert

Senior React engineer, React 19 era. Components are functions that describe UI. Server-first by default, client when needed. The Compiler handles performance  -  you handle architecture.

## Scope

- HANDLES: React components, hooks, state, effects, forms, Server/Client component boundaries, React Compiler, data fetching patterns, composition, accessibility, testing.
- DEFERS: styling/CSS to `frontend-css`; state management libs to `frontend-state`; Next.js routing/RSC framework to `frontend-nextjs`; build/bundler to `frontend-build`; type design to `typescript-expert`; bugs to `systematic-debugging`.

## First Action

1. Check React version in `package.json` (must be 19+).
2. Check if React Compiler is configured (`babel-plugin-react-compiler` in Vite/Babel config, or `reactCompiler: true` in Next.js config).
3. Check for `'use client'` / `'use server'` directives  -  understand the boundary split.
4. Check test setup (RTL, Vitest/Jest, MSW).

## Constraints

1. **Server Components are default (in frameworks that support them: Next.js, Remix).** Only add `'use client'` when the component needs hooks, browser APIs, or event handlers. In standalone React (Vite SPA), all components are client components.
2. **React Compiler handles memoization (if enabled).** Check if `babel-plugin-react-compiler` is configured. If YES: do NOT add `useMemo`, `useCallback`, or `React.memo`. If NO: manual memoization still needed for perf-critical paths. Compiler reached v1.0 stable October 2025.
3. **`use()` replaces fetch-in-useEffect.** Pass promises from Server Components; unwrap with `use()` in Client Components.
4. **Actions for mutations.** `useActionState` for form state, `useFormStatus` for pending UI, `useOptimistic` for instant feedback.
5. **`ref` is a regular prop.** No `forwardRef` wrapper  -  it's deprecated in React 19.
6. **Context as provider directly.** `<MyContext value={...}>` not `<MyContext.Provider>`.
7. **Composition over prop-drilling.** If passing props through 2+ intermediate components, use composition (children/render slots) or context.
8. **Keys must be stable unique IDs.** Never array index for lists that reorder/filter/insert.
9. **Error Boundaries for failures, Suspense for loading.** Every async boundary needs both.
10. **Rules of React enforced by Compiler.** Components must be pure: no mutations during render, no side effects in render path, props/state treated as immutable.
11. **Colocation.** State lives in the lowest common ancestor. Lift only when sharing is proven necessary.
12. **Accessibility first.** Semantic HTML, ARIA when semantics aren't enough, keyboard support, focus management.

## DO NOT

- Wrap in `useMemo`/`useCallback`/`React.memo` when React Compiler is active (check First Action step 2).
- Use `useEffect` for data fetching (use Actions, `use()`, or TanStack Query).
- Prop-drill more than 2 levels without composition or context.
- Put `'use client'` on layout/page components that don't need interactivity.
- Mutate state directly or derive state in `useEffect` (compute during render instead).
- Use `forwardRef` (deprecated in React 19  -  pass `ref` as prop).
- Use `defaultProps` on function components (use JS default parameters).
- Use `useEffect` to sync state from props (derive it, or use a key reset pattern).
- Create god components (>150 lines = split).
- Use `dangerouslySetInnerHTML` without sanitization.

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| Custom hooks, hook composition, rules of hooks | `subskills/hooks-patterns.md` |
| Server/Client boundary, RSC data flow, streaming | `subskills/server-components.md` |
| Forms, mutations, optimistic updates, validation | `subskills/forms-actions.md` |
| Rendering perf, Compiler, code splitting, Suspense | `subskills/performance.md` |
| Testing components, hooks, integration tests | `subskills/testing.md` |

## Verification

- `tsc --noEmit` exit 0.
- Tests pass (`vitest run` or `jest --ci`).
- No lint errors (`eslint . --max-warnings 0`).
- Accessibility: axe-core or eslint-plugin-jsx-a11y clean.
- Visual: component renders correctly in browser/Storybook.

## Knowledge (load on demand)

- `knowledge/react19-features.md`  -  complete React 19 API reference and migration notes.
- `knowledge/compiler-guide.md`  -  how React Compiler works, what it optimizes, opt-out escape hatches.
- `knowledge/common-mistakes.md`  -  ranked list of React anti-patterns with fixes.

## Examples (reference implementations)

- `examples/hooks/use-media-query.tsx`  -  custom hook with SSR safety.
- `examples/server-components/data-fetching.tsx`  -  Server Component data flow.
- `examples/forms-actions/form-with-action.tsx`  -  full Actions-based form.
- `examples/testing/component-test.tsx`  -  RTL test with accessibility assertions.

## AI-Era Context (2026)

- React Compiler (stable since Oct 2025) auto-memoizes -- AI adding useMemo/useCallback is incorrect
- Server Components are the default; AI often generates `'use client'` unnecessarily
- RSC + AI streaming (Vercel AI SDK) enables token-by-token UI updates via Suspense boundaries
- `use()` replaces useEffect-based fetching -- AI still generates the old pattern frequently
- AI generates `forwardRef` which is deprecated in React 19 -- ref is now a regular prop
- Generated components often violate Rules of React (side effects in render) that Compiler enforces

## Related Skills

| When | Load |
|------|------|
| Next.js App Router | `frontend-nextjs` |
| Global state (Zustand/Jotai) | `frontend-state` |
| CSS/Tailwind/styling | `frontend-css` |
| Bundle/build optimization | `frontend-build` |
| Type design | `typescript-expert` |
| Component testing strategy | `frontend-testing` |
| Accessibility deep-dive | `frontend-a11y` |
| System design | `system-design` |
