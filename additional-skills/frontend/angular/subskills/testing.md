# Testing Subskill

Activation: user writes or fixes tests for Angular components, services, signals, or integration.

## Core Principles

1. Test behavior, not implementation. Assert what the user sees/gets.
2. Signals simplify testing  -  read signal values directly, no async piping.
3. Use `TestBed` for integration, plain instantiation for unit.
4. Prefer component harnesses over direct DOM queries.
5. Keep tests fast  -  mock HTTP, avoid real timers.

## Decision Table

| What to test | Approach |
|--------------|----------|
| Pure signal logic | Direct instantiation, assert signal values |
| Component template | `TestBed.createComponent()`, query DOM |
| Service with HTTP | `TestBed` + `provideHttpClientTesting()` |
| Component interactions | Component harnesses (CDK) |
| Router integration | `RouterTestingHarness` |
| Async resource() | Flush requests, assert resource status |

## Component Testing

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  let fixture: ComponentFixture<CounterComponent>;
  let component: CounterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent], // standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('increments the count', () => {
    expect(component.count()).toBe(0);

    component.increment();
    fixture.detectChanges();

    expect(component.count()).toBe(1);
    const el = fixture.nativeElement.querySelector('[data-testid="count"]');
    expect(el.textContent).toContain('1');
  });
});
```

## Signal Testing (No TestBed)

```typescript
import { signal, computed } from '@angular/core';
import { CartService } from './cart.service';

describe('CartService', () => {
  it('computes total from items', () => {
    const service = new CartService();
    service.addItem({ id: '1', name: 'Widget', price: 10, qty: 2 });

    expect(service.total()).toBe(20);

    service.addItem({ id: '2', name: 'Gadget', price: 5, qty: 1 });
    expect(service.total()).toBe(25);
  });
});
```

## HTTP Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiService,
      ],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches users', () => {
    const mockUsers = [{ id: 1, name: 'Alice' }];

    service.getUsers().subscribe(users => {
      expect(users).toEqual(mockUsers);
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });
});
```

## Testing resource()

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserDetailComponent } from './user-detail.component';

describe('UserDetailComponent with resource', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDetailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  it('loads user data via resource', fakeAsync(() => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    fixture.componentRef.setInput('userId', '42');
    fixture.detectChanges();
    tick();

    const req = httpMock.expectOne('/api/users/42');
    req.flush({ id: 42, name: 'Bob' });
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Bob');
  }));
});
```

## Router Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  it('navigates to home', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/', HomeComponent);
    expect(component).toBeInstanceOf(HomeComponent);
  });
});
```

## Component Input Testing

```typescript
it('receives input signal values', () => {
  const fixture = TestBed.createComponent(ChildComponent);

  // Set input signal value
  fixture.componentRef.setInput('name', 'Angular');
  fixture.detectChanges();

  expect(fixture.nativeElement.textContent).toContain('Angular');
});
```

## Gotchas

1. **Standalone components go in `imports`, not `declarations`.** TestBed config differs from NgModule era.
2. **Signal values in tests need `fixture.detectChanges()` to reflect in DOM.** Read signal directly for logic tests.
3. **`fixture.componentRef.setInput()` for input signals.** Don't assign `component.myInput` directly.
4. **`fakeAsync` + `tick()` for resource/async.** Flush HTTP then tick to resolve.
5. **No more `ComponentFixtureAutoDetect` needed with signals.** But still call `detectChanges()` for DOM assertions.
6. **Zoneless testing needs explicit `fixture.detectChanges()`.** Auto-detection requires zone.js.
