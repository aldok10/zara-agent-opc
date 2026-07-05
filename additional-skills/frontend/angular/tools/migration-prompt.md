---
type: tool
title: "Angular Migration"
---

# Angular Migration

## Purpose

Guide Angular migrations from NgModules to standalone components and from traditional patterns to signals. Covers incremental adoption, dependency injection changes, and routing updates.

## When to Use

- Migrating from NgModule-based to standalone components
- Adopting signals (Angular 16+) to replace RxJS-heavy patterns
- Upgrading major Angular versions (14->15->16->17->18->19)
- Converting template-driven to reactive forms
- Modernizing routing from module-based to functional guards/resolvers

## Prompt Template

```
CONTEXT:
- Current Angular version: [14 | 15 | 16 | 17 | 18 | 19]
- Target version: [16 | 17 | 18 | 19]
- Module count: [number of NgModules]
- Component count: [approximate]
- RxJS usage: [light | moderate | heavy (custom operators, complex streams)]
- State management: [NgRx | NGXS | Akita | services | signals]
- Build system: [webpack | esbuild | Vite via analog]

MIGRATION PATH:
1. Standalone components (Angular 14+)
   - Convert components: remove NgModule, add imports array
   - Schematic: ng generate @angular/core:standalone
   - bootstrapApplication instead of platformBrowserDynamic
   - provideRouter for route-level lazy loading
   - importProvidersFrom for legacy module bridging

2. Signals adoption (Angular 16+)
   - signal() for synchronous state
   - computed() for derived values
   - effect() for side effects (use sparingly)
   - input() and output() signal-based (Angular 17.1+)
   - model() for two-way binding (Angular 17+)
   - toSignal()/toObservable() for RxJS interop

3. Control flow (Angular 17+)
   - @if / @else replacing *ngIf
   - @for replacing *ngFor (track required)
   - @switch replacing ngSwitch
   - @defer for lazy loading blocks
   - Schematic: ng generate @angular/core:control-flow

4. Routing modernization
   - Functional guards: CanActivateFn
   - Functional resolvers: ResolveFn
   - Route-level providers
   - Lazy loading with loadComponent/loadChildren

5. Dependency injection changes
   - inject() function vs constructor injection
   - providedIn: 'root' vs route-level providing
   - Environment injectors for dynamic service creation

INCREMENTAL STRATEGY:
- Phase 1: Add standalone flag to leaf components
- Phase 2: Convert feature modules bottom-up
- Phase 3: Remove AppModule, use bootstrapApplication
- Phase 4: Adopt signals in new code, migrate existing incrementally
- Phase 5: Convert control flow syntax

RISKS:
- Third-party libraries not supporting standalone
- NgRx compatibility with signals
- Testing setup changes (TestBed configuration)
- SSR/hydration implications
```

## Output Format

```
## Angular Migration: [project] v[current] -> v[target]

### Migration Phases
| Phase | Scope | Effort | Risk |
|-------|-------|--------|------|
| ... | ... | ... | ... |

### Automated Schematics
| Schematic | Coverage | Manual Fixes Needed |
|-----------|----------|---------------------|
| ... | ... | ... |

### Breaking Changes
| Change | Impact | Fix |
|--------|--------|-----|
| ... | ... | ... |

### Module -> Standalone Conversion
[Before/after example for one component]

### Signals Migration Map
| Current Pattern | Signal Equivalent | Priority |
|----------------|-------------------|----------|
| ... | ... | ... |

### Testing Adjustments
- [Changes to TestBed setup]
- [New testing patterns for signals]

### Validation Steps
1. [Build verification]
2. [Unit test pass]
3. [E2E test pass]
4. [Performance baseline comparison]
```
