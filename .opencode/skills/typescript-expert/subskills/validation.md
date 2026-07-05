---
type: subskill
title: "Subskill: Boundary Validation (parse, don't validate)"
---

# Subskill: Boundary Validation (parse, don't validate)

Types vanish at runtime. Any data you didn't construct is `unknown` until proven. This subskill is about the single most important discipline in production TS: **validate at the boundary, trust inside.**

## The principle: parse, don't validate

"Validate" = check and hope. "Parse" = transform `unknown` into a typed value or fail loudly. Parsing gives you a value whose type the compiler now trusts.

```typescript
import { z } from "zod";

const User = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
  createdAt: z.coerce.date(),
});
type User = z.infer<typeof User>; // ONE source of truth: schema drives the type

// At the boundary:
const user = User.parse(await res.json()); // throws on bad data; `user` is now typed User
// Inside: `user` is trusted, no casts needed
```

`z.infer` means the type and the runtime check can never drift. Change the schema, the type updates.

## Where boundaries are (validate ALL of these)

- HTTP responses (`fetch().json()` returns `any` / `Promise<unknown>`, never trust it)
- HTTP request bodies (Express/Hono/etc `req.body`)
- Environment variables (`process.env.X` is `string | undefined`, always)
- Config files (JSON/YAML/TOML you read from disk)
- Message queue / webhook payloads
- `localStorage` / `sessionStorage` (strings you parse)
- Database rows if the driver is untyped
- CLI args, user input, anything from another process

## Env validation at startup (do this in every app)

```typescript
const Env = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
});
export const env = Env.parse(process.env); // crash at boot if misconfigured, not at 2am
```
Fail fast at startup beats a `undefined` propagating into a query three hours later.

## safeParse for expected-failure paths

```typescript
const result = User.safeParse(input);
if (!result.success) {
  return { ok: false, error: result.error.flatten() }; // no throw; handle as value
}
use(result.data);
```
Use `parse` (throws) at trust boundaries where bad data is a bug; `safeParse` where invalid input is expected (user forms).

## Zod vs valibot vs typebox

- **Zod**: ergonomic, huge ecosystem, `z.infer`. Default choice. v4 is much lighter than v3.
- **valibot**: tree-shakeable, tiny bundle (matters for frontend/edge). Same parse-don't-validate model, modular API.
- **typebox**: JSON-Schema-first (good if you also need OpenAPI/JSON Schema). Compiles to fast validators.
- Pick one per project. All embody the same discipline; the API differs.

## Anti-patterns

```typescript
// WRONG: cast is a lie, no runtime check
const user = (await res.json()) as User;

// WRONG: trusting env
const port = parseInt(process.env.PORT); // NaN if undefined

// WRONG: hand-rolled guard that drifts from the type
function isUser(x: any): x is User { return "id" in x; } // misses email, role...

// RIGHT: schema is the single source of truth
const user = User.parse(await res.json());
```

## Deriving other artifacts from the schema

One schema can generate: the TS type (`z.infer`), OpenAPI docs (`zod-to-openapi`), form validation (frontend reuse), and API contract tests. Schema-first means these never drift. This is the senior move: define the shape once, derive everything.
