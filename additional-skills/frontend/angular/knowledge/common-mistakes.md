---
type: pitfall
title: Angular 19+ Common Mistakes
---

# Angular 19+ Common Mistakes (Ranked)

## 1. Using *ngIf/*ngFor instead of @if/@for

Wrong:
```html
<div *ngIf="user">{{ user.name }}</div>
<div *ngFor="let item of items">{{ item.name }}</div>
```

Right:
```html
@if (user(); as u) {
  <div>{{ u.name }}</div>
}
@for (item of items(); track item.id) {
  <div>{{ item.name }}</div>
}
```

Why: Built-in control flow is faster (no directive overhead), supports `@empty`/`@defer`, and is the only option going forward. Structural directives are deprecated.

## 2. Missing track in @for

Wrong:
```html
@for (item of items(); track $index) {
  <app-item [data]="item" />
}
```

Right:
```html
@for (item of items(); track item.id) {
  <app-item [data]="item" />
}
```

Why: `track $index` causes full re-render on reorder/insert. Track by stable unique ID for performance. Only use `$index` for truly static lists that never change order.

## 3. Manual subscribe without cleanup

Wrong:
```typescript
ngOnInit() {
  this.http.get('/api/data').subscribe(data => this.data = data);
}
```

Right:
```typescript
readonly data = httpResource<Data>('/api/data');
// or
readonly data = toSignal(this.http.get<Data>('/api/data'));
// or with takeUntilDestroyed
constructor() {
  this.http.get<Data>('/api/data')
    .pipe(takeUntilDestroyed())
    .subscribe(data => this.dataSignal.set(data));
}
```

Why: Uncleaned subscriptions cause memory leaks. `resource()`/`toSignal()` handle cleanup automatically.

## 4. Using BehaviorSubject for simple state

Wrong:
```typescript
private count$ = new BehaviorSubject(0);
count = this.count$.asObservable();
increment() { this.count$.next(this.count$.value + 1); }
```

Right:
```typescript
readonly count = signal(0);
increment() { this.count.update(v => v + 1); }
```

Why: Signals are simpler, synchronous, glitch-free, auto-tracked in templates, and don't need subscription management.

## 5. Using constructor injection instead of inject()

Wrong:
```typescript
constructor(
  private readonly http: HttpClient,
  private readonly router: Router,
  @Inject(API_URL) private readonly apiUrl: string,
) {}
```

Right:
```typescript
private readonly http = inject(HttpClient);
private readonly router = inject(Router);
private readonly apiUrl = inject(API_URL);
```

Why: Less boilerplate, works with inheritance, enables functional patterns (guards, interceptors, resolvers).

## 6. Creating NgModules for new features

Wrong:
```typescript
@NgModule({
  declarations: [FeatureComponent, ChildComponent],
  imports: [CommonModule, SharedModule],
  exports: [FeatureComponent],
})
export class FeatureModule {}
```

Right:
```typescript
// No module needed. Components declare their own imports.
@Component({
  selector: 'app-feature',
  imports: [ChildComponent, DatePipe],
  template: `...`,
})
export class FeatureComponent {}
```

Why: Standalone components are self-describing, tree-shakeable, and don't need module coordination.

## 7. Zone.js patterns in zoneless apps

Wrong:
```typescript
// Expecting CD trigger from setTimeout
setTimeout(() => {
  this.loading = false; // won't trigger re-render in zoneless
}, 1000);
```

Right:
```typescript
const loading = signal(true);

setTimeout(() => {
  loading.set(false); // signal change triggers CD
}, 1000);
```

Why: Without zone.js, Angular doesn't patch async APIs. Only signal changes and events trigger CD.

## 8. Not using OnPush change detection

Wrong:
```typescript
@Component({
  selector: 'app-list',
  template: `...`,
  // default CD  -  checks entire tree every cycle
})
```

Right:
```typescript
@Component({
  selector: 'app-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
```

Why: Default CD checks the entire subtree on every browser event. OnPush only checks when inputs/signals change.

## 9. Untyped reactive forms

Wrong:
```typescript
const form = new FormGroup({
  email: new FormControl(''),
  age: new FormControl(0),
});
// form.value is Partial<{ email: string | null; age: number | null }>
```

Right:
```typescript
interface ProfileForm {
  email: FormControl<string>;
  age: FormControl<number>;
}
const form = new FormGroup<ProfileForm>({
  email: new FormControl('', { nonNullable: true }),
  age: new FormControl(0, { nonNullable: true }),
});
// form.getRawValue() is { email: string; age: number }
```

Why: Typed forms catch type errors at compile time. `nonNullable` removes null from the type.

## 10. Using @Input() decorator instead of input()

Wrong:
```typescript
@Input() name = '';
@Input({ required: true }) id!: string;
```

Right:
```typescript
name = input('');
id = input.required<string>();
```

Why: Signal inputs auto-track in templates, compose with `computed()`/`effect()`, and have cleaner DX.

## 11. Side effects in computed()

Wrong:
```typescript
const data = computed(() => {
  console.log('Computing...'); // side effect!
  this.analyticsService.track('compute'); // side effect!
  return items().filter(i => i.active);
});
```

Right:
```typescript
const data = computed(() => items().filter(i => i.active));

effect(() => {
  console.log('Data changed:', data());
  this.analyticsService.track('data-updated');
});
```

Why: computed() must be pure. Side effects belong in effect().

## 12. DOM access without afterNextRender

Wrong:
```typescript
ngOnInit() {
  // Crashes on server, might not have DOM ready
  document.getElementById('chart')?.getBoundingClientRect();
}
```

Right:
```typescript
constructor() {
  afterNextRender(() => {
    document.getElementById('chart')?.getBoundingClientRect();
  });
}
```

Why: SSR has no DOM. `afterNextRender()` ensures browser context and DOM availability.

## 13. Overusing effect() for state derivation

Wrong:
```typescript
const total = signal(0);
effect(() => {
  total.set(price() * quantity()); // anti-pattern: effect writing signal
});
```

Right:
```typescript
const total = computed(() => price() * quantity());
```

Why: This is derived state  -  use computed(). Effects are for side effects (logging, API calls, DOM manipulation).

## 14. Not using resource() for data loading

Wrong:
```typescript
data = signal<User | null>(null);
loading = signal(false);
error = signal<string | null>(null);

loadUser(id: string) {
  this.loading.set(true);
  this.http.get<User>(`/api/users/${id}`).subscribe({
    next: (user) => { this.data.set(user); this.loading.set(false); },
    error: (err) => { this.error.set(err.message); this.loading.set(false); },
  });
}
```

Right:
```typescript
userId = signal('');
userData = httpResource<User>(() => `/api/users/${this.userId()}`);
// userData.value(), userData.isLoading(), userData.error()  -  all handled
```

Why: resource() handles loading/error states, cancellation, and reactivity automatically.

## 15. Importing CommonModule in standalone components

Wrong:
```typescript
@Component({
  imports: [CommonModule], // imports everything
})
```

Right:
```typescript
@Component({
  imports: [NgClass, DatePipe], // import only what you need
})
// Or better  -  use signals and template expressions instead of NgClass/NgStyle
```

Why: CommonModule imports all directives/pipes. Import granularly for tree-shaking. Better yet, replace Angular pipes/directives with native template expressions where possible.
