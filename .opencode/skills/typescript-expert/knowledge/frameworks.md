---
type: fact
title: "TypeScript Frameworks"
---
# TypeScript Frameworks

## Fastify

Plugin system:
```typescript
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.register(async (instance) => {
  instance.get("/", async (request, reply) => {
    return { hello: "world" };
  });
}, { prefix: "/api" });
```

Hooks lifecycle: onRequest -> preParsing -> preValidation -> preHandler -> handler -> preSerialization -> onSend -> onResponse

Schema validation (JSON Schema, compiled with Ajv):
```typescript
app.post("/users", {
  schema: {
    body: {
      type: "object",
      required: ["name", "email"],
      properties: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
      },
    },
    response: { 201: UserSchema },
  },
  handler: async (request, reply) => {
    reply.code(201).send(user);
  },
});
```

Fast serialization: response schemas enable `fast-json-stringify` (2-5x faster than JSON.stringify).

Type providers: `@fastify/type-provider-typebox` or `@fastify/type-provider-zod` for inferred types.

## Hono

Multi-runtime framework (Node, Bun, Cloudflare Workers, Deno, AWS Lambda):
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";

const app = new Hono();
app.use("*", cors());

app.get("/users/:id", zValidator("param", z.object({ id: z.string() })), (c) => {
  const { id } = c.req.valid("param");
  return c.json({ id });
});

export default app;
```

- RPC mode for end-to-end type safety (like tRPC but lighter)
- Built-in middleware: cors, jwt, bearer, logger, compress
- `hono/html` for JSX server rendering without React
- Adapter exports for each runtime target

## tRPC

End-to-end type safety without code generation:
```typescript
import { initTRPC } from "@trpc/server";

const t = initTRPC.context<Context>().create();

const appRouter = t.router({
  user: t.router({
    get: t.procedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        return ctx.db.user.findUnique({ where: { id: input.id } });
      }),
    create: t.procedure
      .input(CreateUserSchema)
      .mutation(async ({ input, ctx }) => {
        return ctx.db.user.create({ data: input });
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

Client usage (React Query integration):
```typescript
const user = trpc.user.get.useQuery({ id: "1" });
const mutation = trpc.user.create.useMutation();
```

- Subscriptions via WebSocket or SSE
- Adapters: Express, Fastify, Next.js, standalone
- Middleware for auth, logging, rate limiting

## Prisma

Schema-first ORM:
```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  posts Post[]
}
```

Query patterns:
```typescript
const user = await prisma.user.findUnique({
  where: { email },
  include: { posts: { where: { published: true } } },
});

await prisma.$transaction([
  prisma.user.update({ where: { id }, data: { credits: { decrement: 1 } } }),
  prisma.order.create({ data: orderData }),
]);
```

- Migrations: `prisma migrate dev`, `prisma migrate deploy`
- Edge deployment: Prisma Accelerate or driver adapters (PlanetScale, Neon)
- Type-safe raw SQL with `Prisma.sql` tagged template

## Drizzle ORM

SQL-like, type-inferred, no code generation:
```typescript
import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";

const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
});

const db = drizzle(pool);
const result = await db.select().from(users).where(eq(users.name, "Alice"));
```

- Relational queries with `db.query.users.findMany({ with: { posts: true } })`
- Push-based migrations: `drizzle-kit push`
- Prepared statements for performance
- Works with PostgreSQL, MySQL, SQLite, D1
- Smaller bundle size than Prisma (good for serverless)
