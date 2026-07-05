# Standalone Components Subskill

Activation: user works with component architecture, DI, routing, lazy loading, or standalone migration.

## Core Principles

1. Every component is standalone  -  `standalone: true` is default in Angular 19+.
2. Components declare their own dependencies via `imports`.
3. DI uses `inject()` function, not constructor parameters.
4. Routes are arrays of `Route` objects, no RouterModule.
5. Providers configured at app level or route level, not in modules.

## Decision Table

| Scenario | Pattern |
|----------|---------|
| New component | Standalone (default), declare imports directly |
| Shared utility component | Standalone, export from barrel index |
| Feature routing | Lazy `loadComponent` or `loadChildren` |
| Service scope: app-wide | `providedIn: 'root'` |
| Service scope: feature | Provide in route's `providers` |
| Service scope: component | Provide in component's `providers` |
| Migration from NgModule | Use `importProvidersFrom()` for legacy modules |

## Bootstrap Pattern

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
```

```typescript
// app.config.ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ],
};
```

## Component Structure

```typescript
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MyService } from './my.service';
import { ChildComponent } from './child.component';

@Component({
  selector: 'app-feature',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ChildComponent],
  template: `
    @if (items().length) {
      @for (item of items(); track item.id) {
        <app-child [data]="item" />
      }
    } @else {
      <p>No items found.</p>
    }
  `,
})
export class FeatureComponent {
  private readonly svc = inject(MyService);
  readonly items = this.svc.items;
}
```

## Routing

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes),
    canActivate: [authGuard],
  },
  { path: '**', loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent) },
];
```

```typescript
// admin/admin.routes.ts
import { Routes } from '@angular/router';
import { AdminService } from './admin.service';

export const adminRoutes: Routes = [
  {
    path: '',
    providers: [AdminService], // scoped to this route tree
    children: [
      { path: '', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'users', loadComponent: () => import('./users/users.component').then(m => m.UsersComponent) },
    ],
  },
];
```

## DI with inject()

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getUsers() {
    return this.http.get<User[]>('/api/users');
  }
}
```

### Injection tokens

```typescript
import { InjectionToken, inject } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');

// In config
providers: [{ provide: API_URL, useValue: 'https://api.example.com' }]

// In service
const apiUrl = inject(API_URL);
```

## @defer for Lazy Loading

```html
@defer (on viewport) {
  <app-heavy-chart [data]="chartData()" />
} @placeholder {
  <div class="skeleton" aria-hidden="true"></div>
} @loading (minimum 200ms) {
  <app-spinner />
} @error {
  <p>Failed to load chart.</p>
}
```

Trigger options: `on viewport`, `on idle`, `on interaction`, `on hover`, `on timer(ms)`, `when condition`.

## Migration from NgModules

```typescript
// Temporary bridge for legacy modules
import { importProvidersFrom } from '@angular/core';
import { LegacyModule } from './legacy/legacy.module';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(LegacyModule), // bridge until migrated
  ],
};
```

## Gotchas

1. **`imports` in component metadata replaces module imports.** List every dependency the template uses.
2. **`inject()` only works in injection context.** Constructor, field initializer, or factory  -  not in arbitrary methods.
3. **Lazy routes must export the component/routes directly.** No module wrapper needed.
4. **Route-scoped providers create child injector.** Services are isolated to that route subtree.
5. **`providedIn: 'root'` is tree-shakeable.** Prefer it for app-wide services.
