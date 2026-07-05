---
name: angular
description: "Angular 19-22: Signals, standalone, zoneless, resource(), httpResource(), control flow"
---

# Angular 19-22 Expert

Senior Angular engineer, Angular 19/20/21/22 era. Signals are the primary state primitive (stable since Angular 20). Standalone components only. Zoneless by default (stable Angular 21+). Make the template declarative and the component minimal.

## Scope

- HANDLES: Angular components, signals, DI, routing, forms, SSR/hydration, control flow, resource loading, RxJS interop, testing.
- DEFERS: styling to `frontend-css`; state management architecture to `frontend-state`; build/bundler to `frontend-build`; type design to `typescript-expert`; bugs to `systematic-debugging`; accessibility to `frontend-a11y`.

## First Action

1. Check Angular version in `package.json` (must be 19+).
2. Check `app.config.ts` for `provideZonelessChangeDetection()` or zone.js presence.
3. Check if project uses standalone bootstrap (`bootstrapApplication`) or legacy NgModule.
4. Check test setup (Karma/Jest/Vitest, TestBed patterns).
5. Check for `angular.json` or `project.json` (Nx) build config.

## Constraints

1. **Standalone components only.** No NgModules in new code. Import dependencies directly in `imports` array.
2. **Signals for state.** `signal()`, `computed()`, `effect()` are primary. Replace `BehaviorSubject` for synchronous state.
3. **`linkedSignal()` for derived writable state.** Stable since Angular 20. Use when computed state needs local override/reset.
4. **`resource()`/`httpResource()` for async data.** `resource()` stable since Angular 19. `httpResource()` experimental in 19.2, stable in Angular 22. Replaces manual subscribe patterns.
5. **Built-in control flow.** `@if`, `@for` (with `track`), `@switch`, `@defer`. No `*ngIf`/`*ngFor` directives.
6. **`inject()` for DI.** Field injection over constructor injection. Cleaner, less boilerplate.
7. **Zoneless change detection.** `provideZonelessChangeDetection()` stable since Angular 21. Signals drive rendering.
8. **OnPush on every component.** `changeDetection: ChangeDetectionStrategy.OnPush` always.
9. **Typed reactive forms.** `FormControl<string>`, `FormGroup<{...}>`. No untyped `new FormGroup()`.
10. **`toSignal()`/`toObservable()` for RxJS bridge.** Convert at boundaries, don't mix paradigms within a component.
11. **`@defer` for lazy loading.** Replace lazy routes for component-level code splitting when appropriate.
12. **Input signals.** `input()`, `input.required()` over `@Input()` decorator.
13. **Output as function.** `output()` over `@Output() EventEmitter`.
14. **Model inputs.** `model()` for two-way binding signals.

## DO NOT

- Create NgModules for new features.
- Use `*ngIf`/`*ngFor`/`*ngSwitch` structural directives (use `@if`/`@for`/`@switch`).
- Subscribe manually when `resource()`, `httpResource()`, or `toSignal()` suffices.
- Use zone.js-dependent patterns (`setTimeout` triggers, manual `ChangeDetectorRef.detectChanges()`).
- Skip `track` in `@for` loops.
- Mix Zone.js and signals reactivity in zoneless mode.
- Use `@Input()` decorator in new code (use `input()`/`input.required()`).
- Use `@Output() EventEmitter` in new code (use `output()`).
- Use `BehaviorSubject` for simple sync state (use `signal()`).
- Use `subscribe()` in components without guaranteed cleanup.

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| Signals, computed, effect, linkedSignal, resource | `subskills/signals.md` |
| Standalone components, DI, routing, lazy loading | `subskills/standalone.md` |
| SSR, hydration, prerendering, Angular Universal | `subskills/ssr.md` |
| Testing components, services, signals | `subskills/testing.md` |
| NgRx signals store, global state, effects | `subskills/ngrx.md` |

## Verification

- `ng build` exit 0 (or `nx build`).
- `tsc --noEmit` exit 0.
- Tests pass (`ng test --watch=false` or `vitest run`).
- No lint errors (`ng lint` or `eslint . --max-warnings 0`).
- No template errors in language service.

## Knowledge (load on demand)

- `knowledge/angular19-features.md`  -  Angular 19/20 API reference and migration notes.
- `knowledge/signals-reference.md`  -  complete signals API with patterns and gotchas.
- `knowledge/common-mistakes.md`  -  ranked Angular anti-patterns with fixes.

## Examples (reference implementations)

- `examples/signals/counter.component.ts`  -  signal-based component with computed and effects.
- `examples/resource/data-loading.component.ts`  -  resource()/httpResource() data fetching.
- `examples/standalone/bootstrap.ts`  -  standalone app bootstrap with providers.

## AI-Era Context (2026)

- Signal-based reactivity is stable (Angular 20+); AI must use `signal()` not `BehaviorSubject` for sync state
- Standalone components are the only pattern -- AI generating NgModules is always wrong
- `input()` / `output()` functions replace `@Input()` / `@Output()` decorators in new code
- Zoneless change detection (stable Angular 21+) means zone.js patterns break silently
- AI code gen must use `@if`/`@for` control flow, not `*ngIf`/`*ngFor` structural directives
- `httpResource()` (stable Angular 22) replaces manual subscribe patterns for data fetching

## Related Skills

| When | Load |
|------|------|
| CSS/styling | `frontend-css` |
| State management architecture | `frontend-state` |
| Build/bundler issues | `frontend-build` |
| Type design | `typescript-expert` |
| Debugging | `systematic-debugging` |
| Accessibility | `frontend-a11y` |
| Testing strategy | `testing-strategy` |
