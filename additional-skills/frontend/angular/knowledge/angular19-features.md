---
type: fact
title: Angular 19-22 Features Reference
---

# Angular 19-22 Features Reference

## Version Timeline

- Angular 17 (Nov 2023): Built-in control flow (`@if`/`@for`/`@switch`), `@defer`, signals developer preview.
- Angular 18 (May 2024): Zoneless (experimental), route redirects as functions.
- Angular 19 (Nov 2024): `resource()` stable, `httpResource()` experimental (19.2), `linkedSignal` developer preview, incremental hydration, standalone default in schematics.
- Angular 20 (May 2025): `signal()`, `effect()`, `linkedSignal()`, signal-based queries/inputs ALL stable. Zoneless matures significantly.
- Angular 21 (2025): `provideZonelessChangeDetection()` default in new projects. Zoneless stable.
- Angular 22 (2025): `httpResource()` stable.

## Standalone Components (Default since v19)

All components, directives, pipes are standalone by default. `standalone: true` is implicit in v19+ schematics.

```typescript
@Component({
  selector: 'app-hero',
  imports: [NgOptimizedImage, DatePipe, RouterLink], // declare deps here
  template: `...`,
})
export class HeroComponent {}
```

## Signals API

| API | Purpose | Since |
|-----|---------|-------|
| `signal(value)` | Writable reactive value | v16 |
| `computed(() => expr)` | Derived (lazy, memoized) | v16 |
| `effect(() => { ... })` | Side effect on change | v16 |
| `linkedSignal({ source, computation })` | Derived + resettable | v19 (dev preview), v20 (stable) |
| `resource({ request, loader })` | Async resource loading | v19 (stable) |
| `httpResource(url)` | HTTP-specific resource | v19.2 (experimental), v22 (stable) |
| `input()` / `input.required()` | Signal-based input | v17.1 |
| `output()` | Function-based output | v17.3 |
| `model()` | Two-way binding signal | v17.2 |
| `viewChild()` / `viewChildren()` | Query signals | v17.2 |
| `contentChild()` / `contentChildren()` | Content query signals | v17.2 |

## Control Flow

```html
@if (user(); as u) {
  <span>{{ u.name }}</span>
} @else {
  <span>Guest</span>
}

@for (item of items(); track item.id) {
  <app-item [data]="item" />
} @empty {
  <p>No items.</p>
}

@switch (status()) {
  @case ('loading') { <app-spinner /> }
  @case ('error') { <p>Error occurred.</p> }
  @default { <app-content /> }
}

@defer (on viewport) {
  <app-lazy />
} @placeholder (minimum 100ms) {
  <div class="skeleton"></div>
} @loading (after 200ms; minimum 150ms) {
  <app-spinner />
} @error {
  <p>Load failed.</p>
}
```

## Zoneless Change Detection

```typescript
import { provideZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection()],
};
```

With zoneless:
- Change detection runs only when signals update or events fire.
- No zone.js overhead (~60KB removed from bundle).
- `setTimeout`/`setInterval` no longer trigger CD — use signals.
- Manual `ChangeDetectorRef.detectChanges()` still works but shouldn't be needed.

## resource() / httpResource()

```typescript
// Generic resource
const userData = resource({
  request: () => ({ id: userId() }),
  loader: async ({ request, abortSignal }) => {
    const res = await fetch(`/api/users/${request.id}`, { signal: abortSignal });
    if (!res.ok) throw new Error('Failed');
    return res.json() as Promise<User>;
  },
});

// HTTP resource (Angular HttpClient integration)
const users = httpResource<User[]>('/api/users');
const user = httpResource<User>(() => `/api/users/${userId()}`);
```

Resource signals: `.value()`, `.status()`, `.error()`, `.isLoading()`, `.reload()`.

Status values: `idle`, `loading`, `resolved`, `error`, `reloading`, `local` (optimistic).

## Dependency Injection

```typescript
// inject() — preferred
private readonly http = inject(HttpClient);
private readonly router = inject(Router);

// Injection tokens
const CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

// runInInjectionContext for dynamic injection
import { Injector, runInInjectionContext } from '@angular/core';
const injector = inject(Injector);
runInInjectionContext(injector, () => {
  const svc = inject(MyService);
});
```

## Router Features (v19)

```typescript
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';

// Route params bound as inputs automatically
provideRouter(routes, withComponentInputBinding(), withViewTransitions())

// Functional guards
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/login']);
};

// Functional resolvers
export const userResolver: ResolveFn<User> = (route) => {
  return inject(UserService).getById(route.paramMap.get('id')!);
};
```

## Typed Forms

```typescript
import { FormControl, FormGroup, Validators } from '@angular/forms';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
  remember: FormControl<boolean>;
}

const form = new FormGroup<LoginForm>({
  email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  remember: new FormControl(false, { nonNullable: true }),
});

// form.value is fully typed
// form.getRawValue() returns { email: string; password: string; remember: boolean }
```

## HttpClient Modern Usage

```typescript
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { HttpInterceptorFn } from '@angular/common/http';

// Functional interceptor
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

// Provider setup
provideHttpClient(withFetch(), withInterceptors([authInterceptor]))
```

## Output / Event Handling

```typescript
import { output, OutputEmitterRef } from '@angular/core';

@Component({ ... })
export class SearchComponent {
  // output() replaces @Output() EventEmitter
  searched = output<string>();

  onSearch(query: string) {
    this.searched.emit(query);
  }
}
```

## afterRender / afterNextRender

```typescript
import { afterNextRender, afterRender } from '@angular/core';

@Component({ ... })
export class ChartComponent {
  constructor() {
    // Run once after first render
    afterNextRender(() => {
      this.initChart();
    });

    // Run after every render (careful — performance)
    afterRender(() => {
      this.syncScroll();
    });
  }
}
```

## DestroyRef for Cleanup

```typescript
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({ ... })
export class MyComponent {
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // RxJS with automatic cleanup
    someObservable$.pipe(takeUntilDestroyed()).subscribe(/* ... */);

    // Manual cleanup
    this.destroyRef.onDestroy(() => {
      this.subscription.unsubscribe();
    });
  }
}
```
