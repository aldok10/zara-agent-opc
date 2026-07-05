---
type: tool
title: "React Code Review"
---

# React Code Review

## Purpose

Review React code for correctness, performance, and adherence to modern patterns. Focus on hooks usage, component composition, server components, and state management.

## When to Use

- Reviewing React components, hooks, or context providers
- Evaluating component architecture and composition
- Checking hook dependency arrays and effect cleanup
- Reviewing server/client component boundaries

## Prompt Template

Given the following React code:

```
[paste component/hook/context code]
```

Review for:

1. **Hooks**: Are dependency arrays correct and complete? Are effects cleaned up? Is `useCallback`/`useMemo` used only where measured benefit exists? Are custom hooks extracting reusable logic?
2. **Composition**: Is the component doing one thing? Are render props or children patterns used for flexibility? Is prop drilling avoided via composition (not just context)?
3. **Server Components**: Is the server/client boundary at the right level? Are `'use client'` directives minimal? Is serializable data passed across the boundary?
4. **State**: Is state colocated to where it's used? Is derived state computed (not synced)? Are controlled/uncontrolled patterns consistent?
5. **Rendering**: Are unnecessary re-renders avoided? Is list rendering keyed correctly (stable, unique keys)? Are expensive computations memoized?
6. **Error Handling**: Are error boundaries present? Are async errors caught? Are loading/error/empty states handled?
7. **Accessibility**: Are interactive elements focusable? Are aria attributes correct? Is keyboard navigation supported?

Context:
- React version: [18/19]
- Framework: [Next.js/Remix/Vite/CRA]
- State library: [none/Zustand/Jotai/Redux/other]
- Rendering: [RSC/CSR/SSR]

## Output Format

```
## React Review

### Issues
- [severity] [file:line]  -  [issue]  -  [fix]

### Hook Concerns
- [hook]  -  [problem with deps/cleanup/timing]

### Composition
- [components that should be split/merged/restructured]

### Performance
- [re-render risks]  -  [mitigation]

### Verdict
[approve / request changes / needs refactoring]
```
