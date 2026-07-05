import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

const CreateTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

const TodoParamsSchema = z.object({
  id: z.string().uuid(),
});

const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
}

interface TodoStore {
  getAll(page: number, limit: number): { items: Todo[]; total: number };
  getById(id: string): Todo | undefined;
  create(title: string, description?: string): Todo;
}

function buildApp(store: TodoStore): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/todos", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = PaginationSchema.parse(request.query);
    const result = store.getAll(query.page, query.limit);
    return reply.send({
      items: result.items,
      total: result.total,
      page: query.page,
      limit: query.limit,
    });
  });

  app.get("/todos/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const params = TodoParamsSchema.parse(request.params);
    const todo = store.getById(params.id);
    if (!todo) {
      return reply.status(404).send({ error: "Todo not found" });
    }
    return reply.send(todo);
  });

  app.post("/todos", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = CreateTodoSchema.parse(request.body);
    const todo = store.create(body.title, body.description);
    return reply.status(201).send(todo);
  });

  app.setErrorHandler(async (error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: "Validation failed",
        details: error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  });

  return app;
}

async function start(): Promise<void> {
  const store = createInMemoryStore();
  const app = buildApp(store);
  await app.listen({ port: 3000, host: "0.0.0.0" });
}

function createInMemoryStore(): TodoStore {
  const todos = new Map<string, Todo>();

  return {
    getAll(page, limit) {
      const all = [...todos.values()];
      const start = (page - 1) * limit;
      return { items: all.slice(start, start + limit), total: all.length };
    },
    getById(id) {
      return todos.get(id);
    },
    create(title, description) {
      const todo: Todo = {
        id: crypto.randomUUID(),
        title,
        description: description ?? null,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      todos.set(todo.id, todo);
      return todo;
    },
  };
}

export { buildApp, start };
export type { Todo, TodoStore };
