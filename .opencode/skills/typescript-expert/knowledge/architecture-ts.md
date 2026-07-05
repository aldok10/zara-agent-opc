# TypeScript Architecture Patterns

## Functional Programming

Pipe pattern:
```typescript
const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduce((acc, fn) => fn(acc), value);

const process = pipe(
  normalize,
  validate,
  transform,
);
```

Pattern matching (ts-pattern):
```typescript
import { match, P } from "ts-pattern";

const result = match(response)
  .with({ status: 200, data: P.select() }, (data) => handleSuccess(data))
  .with({ status: 404 }, () => handleNotFound())
  .with({ status: P.number.between(500, 599) }, () => handleServerError())
  .exhaustive();
```

Option/Result types (neverthrow):
```typescript
import { ok, err, Result } from "neverthrow";

function divide(a: number, b: number): Result<number, DivisionError> {
  if (b === 0) return err(new DivisionError("Cannot divide by zero"));
  return ok(a / b);
}

const result = divide(10, 2)
  .map((n) => n * 2)
  .mapErr((e) => new WrappedError(e));
```

## Effect-TS

Dependency injection, error handling, and concurrency in one system:
```typescript
import { Effect, Layer, Context } from "effect";

class Database extends Context.Tag("Database")<Database, {
  query: (sql: string) => Effect.Effect<Row[], DbError>;
}>() {}

const program = Effect.gen(function* () {
  const db = yield* Database;
  const rows = yield* db.query("SELECT * FROM users");
  return rows;
});

const DatabaseLive = Layer.succeed(Database, {
  query: (sql) => Effect.tryPromise(() => pool.query(sql)),
});

Effect.runPromise(program.pipe(Effect.provide(DatabaseLive)));
```

Key concepts:
- `Effect<Success, Error, Requirements>` -- typed effects with dependency tracking
- `Layer` for composable dependency injection
- Structured concurrency (fibers, scoped resources)
- Built-in retry, timeout, scheduling
- Schema for validation (replaces Zod in Effect ecosystem)

## Branded Types

```typescript
type UserId = string & { readonly __brand: unique symbol };
type OrderId = string & { readonly __brand: unique symbol };

function createUserId(id: string): UserId {
  if (!id.startsWith("usr_")) throw new Error("Invalid user ID");
  return id as UserId;
}

function getUser(id: UserId): Promise<User> { /* ... */ }
getUser(orderId); // Type error -- OrderId is not assignable to UserId
```

Use cases:
- Prevent mixing IDs of different entity types
- Enforce validation at boundaries (validated vs raw strings)
- Units (Meters vs Kilometers, USD vs EUR)

## Zod / Valibot

Zod (runtime validation with type inference):
```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
  metadata: z.record(z.unknown()).optional(),
});

type User = z.infer<typeof UserSchema>;

const result = UserSchema.safeParse(input);
if (result.success) {
  result.data; // typed as User
}
```

Valibot (tree-shakeable alternative, smaller bundle):
```typescript
import * as v from "valibot";

const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  email: v.pipe(v.string(), v.email()),
  role: v.picklist(["admin", "user"]),
});

type User = v.InferOutput<typeof UserSchema>;
```

When to use which:
- Zod: richer API, better ecosystem integration (tRPC, React Hook Form)
- Valibot: smaller bundle (matters for client-side/edge)

## Dependency Injection

tsyringe (decorator-based):
```typescript
import { injectable, inject, container } from "tsyringe";

@injectable()
class UserService {
  constructor(@inject("Database") private db: Database) {}
}

container.register("Database", { useClass: PostgresDatabase });
const service = container.resolve(UserService);
```

Manual DI (no decorators, works everywhere):
```typescript
interface Dependencies {
  db: Database;
  logger: Logger;
  cache: Cache;
}

function createUserService(deps: Dependencies): UserService {
  return {
    async getUser(id: string) {
      const cached = await deps.cache.get(id);
      if (cached) return cached;
      return deps.db.query("SELECT ...");
    },
  };
}
```

Manual DI is preferred when:
- You want to avoid experimental decorators
- Bundle size matters (no reflection metadata)
- Simple dependency graph (fewer than 20 services)

## Event-Driven Patterns

Typed event emitter:
```typescript
type Events = {
  "user:created": [user: User];
  "order:placed": [order: Order, notify: boolean];
};

class TypedEmitter<T extends Record<string, unknown[]>> {
  private listeners = new Map<keyof T, Set<Function>>();

  on<K extends keyof T>(event: K, handler: (...args: T[K]) => void): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler);
    this.listeners.set(event, set);
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }
}
```

Event sourcing pattern:
```typescript
type DomainEvent =
  | { type: "AccountCreated"; data: { id: string; owner: string } }
  | { type: "FundsDeposited"; data: { amount: number } }
  | { type: "FundsWithdrawn"; data: { amount: number } };

function apply(state: Account, event: DomainEvent): Account {
  return match(event)
    .with({ type: "AccountCreated" }, (e) => ({ ...state, id: e.data.id }))
    .with({ type: "FundsDeposited" }, (e) => ({ ...state, balance: state.balance + e.data.amount }))
    .with({ type: "FundsWithdrawn" }, (e) => ({ ...state, balance: state.balance - e.data.amount }))
    .exhaustive();
}
```
