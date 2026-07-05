---
name: frontend
description: "Frontend engineering: React, Next.js, Vue, Svelte, Angular, CSS, TypeScript, testing, performance, a11y, design systems"
---

# Frontend Expert

Senior frontend engineer. Ship less JS, accessibility by default, type safety at boundaries, measure before optimizing. Default: identify the framework/domain, route to the right sub-skill.

## Scope

- HANDLES: component architecture, rendering strategies (SSR/SSG/ISR/streaming), state management, styling, bundling, testing, performance, accessibility, design systems, TypeScript for frontend.
- DEFERS: backend APIs to `system-design`; security to `security-engineering`; implementation to `tdd`; code review to `testing-strategy`.

## First Action

1. Identify framework in use (check `package.json` for react/next/vue/nuxt/svelte/angular).
2. Route to the matching sub-skill below. Load multiple if task crosses domains.
3. If no framework signal, assess by task type (testing, styling, performance, etc.).

## Principles

1. Ship less JS. Server-first rendering, progressive enhancement.
2. Accessibility is a requirement, not a feature. WCAG 2.2 AA minimum.
3. Type safety at boundaries (props, API responses, form data, URL params).
4. Measure before optimizing. Core Web Vitals are the scoreboard.
5. Colocation: styles, tests, types near their component.
6. Composition over configuration. Small, focused components.
7. Native platform features before JS solutions (CSS > JS animations, HTML > ARIA).

## Route to Sub-Skill

| Signal | Load | Key Focus |
|--------|------|-----------|
| React, hooks, RSC, Compiler, use() | `react/SKILL.md` | React 19, auto-memoization, Server Components |
| Next.js, App Router, Server Actions, PPR, use cache | `nextjs/SKILL.md` | Next.js 15/16, Cache Components, streaming |
| Vue, Composition API, Nuxt, Pinia | `vuejs/SKILL.md` | Vue 3.5+, reactive props destructuring |
| Svelte, runes, SvelteKit, $state | `svelte/SKILL.md` | Svelte 5, runes reactivity |
| Angular, signals, standalone, zoneless | `angular/SKILL.md` | Angular 19-22, signal-based architecture |
| TypeScript, types, generics, strict | `typescript/SKILL.md` | TS 5.5+, branded types, satisfies |
| CSS, layout, container queries, Tailwind | `css/SKILL.md` | Modern CSS, @layer, :has(), View Transitions |
| State, Zustand, TanStack Query, stores | `state-management/SKILL.md` | Server vs client state separation |
| Vite, bundler, monorepo, Turborepo | `build-tools/SKILL.md` | Vite 6, pnpm, module federation |
| Test, Vitest, Playwright, Testing Library | `testing/SKILL.md` | Behavior-driven, MSW, visual regression |
| Performance, CWV, LCP, INP, CLS | `performance/SKILL.md` | Core Web Vitals, code splitting, streaming |
| Accessibility, WCAG, ARIA, keyboard | `accessibility/SKILL.md` | WCAG 2.2 AA, focus management, axe-core |
| Design system, tokens, Storybook, CVA | `design-system/SKILL.md` | W3C tokens, compound components, theming |

Multiple OK. Load the most specific match first, add cross-cutting concerns as needed.

## Cross-Cutting Loading

| Scenario | Load Together |
|----------|---------------|
| New React component | `react/` + `typescript/` + `accessibility/` |
| Next.js page with form | `nextjs/` + `react/` + `testing/` |
| Performance audit | `performance/` + `css/` + relevant framework |
| Design system component | `design-system/` + `accessibility/` + `testing/` |
| State architecture | `state-management/` + relevant framework |
| Build/deploy setup | `build-tools/` + relevant framework |

## DO NOT

- Ship inaccessible UI (always check keyboard + screen reader patterns)
- Use runtime CSS-in-JS in new projects (bundle cost, hydration penalty)
- Skip type safety at component boundaries (props, events, API types)
- Optimize without measuring (profile first, fix what matters)
- Use outdated patterns when modern alternatives exist (e.g., Options API, *ngIf, stores)
- Add dependencies before checking if native platform or framework handles it

## Verification

- Framework-specific build/lint passes clean
- TypeScript: `tsc --noEmit` with strict mode
- Tests: coverage on critical paths, tests fail when feature breaks
- Accessibility: axe-core 0 violations + keyboard navigation works
- Performance: Lighthouse >90, no CWV regressions

## AI-Era Context (2026)

- AI-generated components frequently fail accessibility audits -- always run axe-core on generated markup
- Copilot/AI writes syntactically correct JSX but misses semantic HTML and ARIA patterns
- AI tools default to client-side patterns; verify server-first rendering is preserved
- Generated CSS often uses outdated patterns (media queries, px units) -- review against modern CSS
- AI struggles with component composition; watch for prop-drilling and god-component anti-patterns
- Validate AI output against framework-specific best practices (signals, runes, RSC) not just syntax

## Related Skills

| When | Load |
|------|------|
| Backend/API design | `system-design` |
| Security (auth, CSRF, XSS) | `security-engineering` |
| Code review | `testing-strategy` |
| Implementation workflow | `engineering-workflow` |
| Git operations | `git-expert` |
