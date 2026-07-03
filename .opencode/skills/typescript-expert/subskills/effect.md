# Subskill: Effect-TS

Reach for Effect when error flows, dependency injection, and concurrency get complex enough that `Result` + try/catch becomes spaghetti. NOT for every app. A CRUD API with 3 error types doesn't need Effect; a payment pipeline with retries, timeouts, typed errors, and resource cleanup does.

## What Effect buys you

- **Typed errors in the signature**: `Effect<Success, Error, Requirements>`. The error channel is part of the type. No swallowed exceptions.
- **Dependency injection via `Context`**: services are typed requirements; the compiler tracks what an effect needs. Testable by swapping layers.
- **Structured concurrency**: `Effect.all`, `Effect.race`, fibers with automatic interruption + resource safety.
- **Retries/timeouts/scheduling** as composable combinators, not hand-rolled loops.

## Minimal shape

```typescript
import { Effect } from "effect";

class NotFound { readonly _tag = "NotFound"; }
class DbError { readonly _tag = "DbError"; constructor(readonly cause: unknown) {} }

const getUser = (id: string): Effect.Effect<User, NotFound | DbError> =>
  Effect.tryPromise({ try: () => db.user(id), catch: (e) => new DbError(e) })
    .pipe(Effect.flatMap((u) => u ? Effect.succeed(u) : Effect.fail(new NotFound())));

// Errors are in the type. Caller MUST handle NotFound | DbError. Compiler enforces it.
```

## When NOT to use it

- Small apps / scripts: overhead > benefit. `Result` type is enough.
- Team unfamiliar with FP: steep learning curve; readability for the team matters more.
- Deadline pressure on a simple feature: don't introduce a paradigm mid-sprint.

## Decision rule

If you're writing the same retry/timeout/cleanup/error-mapping boilerplate across many operations, or you need compile-time-guaranteed error handling, Effect earns its weight. Otherwise, discriminated-union `Result` + async/await is simpler and just as correct.
