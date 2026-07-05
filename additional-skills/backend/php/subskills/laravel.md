# Laravel 12

## When to Load

Laravel-specific: Eloquent, queues, events, broadcasting, Octane, Pulse, Reverb, Pennant, Folio, Volt.

## Key Patterns

### Application Structure (Laravel 12)

```
app/
  Actions/        -- Single-purpose action classes (invokable)
  Models/         -- Eloquent models (thin, no business logic)
  Enums/          -- Backed enums for statuses, types
  DTOs/           -- Readonly classes for data transfer
  Events/         -- Domain events (ShouldBroadcast if needed)
  Listeners/      -- Event handlers (ShouldQueue by default)
  Jobs/           -- Queued work units
  Http/
    Controllers/  -- Thin: validate, dispatch, respond
    Requests/     -- FormRequest for validation + authorization
    Resources/    -- API resource transformers
```

### Action Class Pattern

- Single responsibility, invokable `__invoke()` method.
- Inject dependencies via constructor.
- Return typed result (DTO or domain object, never Eloquent model from action).
- Test in isolation without HTTP layer.

### Eloquent Best Practices

- Always define `$casts` with native enums and typed arrays.
- Use `withoutTimestamps()` in bulk operations.
- Prevent N+1: `Model::preventLazyLoading()` in AppServiceProvider (non-production).
- Scope queries in named scopes, not inline where chains.
- `$fillable` explicit, never `$guarded = []`.

### Queue System

- All listeners `ShouldQueue` unless real-time required.
- Use `WithoutOverlapping` middleware for idempotency.
- Set `$tries`, `$backoff`, `$maxExceptions` explicitly.
- Dead letter: `failed()` method logs context for debugging.
- Batching for bulk operations with `Bus::batch()`.

### Octane (Long-Running)

- No static state between requests — reset in `RequestHandled` listener.
- Use `Octane::concurrently()` for parallel I/O.
- Container bindings: use `scoped()` not `singleton()` for request-bound services.
- Test with `--watch` in development.

### Pulse (Monitoring)

- Custom recorders for domain-specific metrics.
- Card components for dashboard visibility.
- Ingest sampling for high-traffic: `PULSE_INGEST_SAMPLE_RATE`.

### Reverb (WebSockets)

- Channel authorization in `channels.php`.
- Private channels for user-specific, presence for collaboration.
- Scale horizontally with Redis pub/sub backend.

### Pennant (Feature Flags)

- Feature classes in `app/Features/`.
- Scope to teams/users with typed scope resolution.
- Database driver for persistent state, array driver for tests.

## Constraints

1. Controllers: max 5 public methods (CRUD + index). Beyond = new controller.
2. No business logic in controllers — delegate to Actions/Services.
3. FormRequest for all validation — never `$request->validate()` inline.
4. API Resources for all JSON responses — never `->toArray()` directly.
5. Events for side effects — never chain side effects in the main flow.
6. Config via `config()` helper, never `env()` outside config files.
7. Route model binding for all resource routes.
8. Migrations: separate schema and data migrations, never drop columns without deploy strategy.

## Testing

- `RefreshDatabase` trait for integration tests.
- Factories with states for all models.
- `Queue::fake()`, `Event::fake()`, `Notification::fake()` for isolation.
- `assertDatabaseHas`/`assertDatabaseMissing` for persistence verification.
- HTTP tests via `$this->postJson()` — test full request cycle.

## Verify

- `php artisan test` — all green.
- `php artisan route:list` — no duplicate/conflicting routes.
- `php artisan model:show` — verify relationships and casts.
