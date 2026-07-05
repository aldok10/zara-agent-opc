import { Context, Effect, Layer, pipe } from "effect";

class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly cause: unknown) {}
}

class NotFoundError {
  readonly _tag = "NotFoundError";
  constructor(readonly entity: string, readonly id: string) {}
}

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface TodoRepository {
  readonly getById: (id: string) => Effect.Effect<Todo, NotFoundError | DatabaseError>;
  readonly getAll: () => Effect.Effect<readonly Todo[], DatabaseError>;
  readonly create: (title: string) => Effect.Effect<Todo, DatabaseError>;
  readonly complete: (id: string) => Effect.Effect<Todo, NotFoundError | DatabaseError>;
}

const TodoRepository = Context.GenericTag<TodoRepository>("TodoRepository");

const makeLiveTodoRepository = (): TodoRepository => {
  const store = new Map<string, Todo>();

  return {
    getById: (id) =>
      Effect.try({
        try: () => {
          const todo = store.get(id);
          if (!todo) throw new NotFoundError("Todo", id);
          return todo;
        },
        catch: (e) => (e instanceof NotFoundError ? e : new DatabaseError(e)),
      }),

    getAll: () =>
      Effect.try({
        try: () => [...store.values()],
        catch: (e) => new DatabaseError(e),
      }),

    create: (title) =>
      Effect.try({
        try: () => {
          const todo: Todo = { id: crypto.randomUUID(), title, completed: false };
          store.set(todo.id, todo);
          return todo;
        },
        catch: (e) => new DatabaseError(e),
      }),

    complete: (id) =>
      pipe(
        Effect.try({
          try: () => {
            const todo = store.get(id);
            if (!todo) throw new NotFoundError("Todo", id);
            const completed = { ...todo, completed: true };
            store.set(id, completed);
            return completed;
          },
          catch: (e) => (e instanceof NotFoundError ? e : new DatabaseError(e)),
        })
      ),
  };
};

const TodoRepositoryLive = Layer.succeed(TodoRepository, makeLiveTodoRepository());

const program = pipe(
  Effect.gen(function* () {
    const repo = yield* TodoRepository;
    const todo = yield* repo.create("Write Effect-TS service");
    const completed = yield* repo.complete(todo.id);
    return completed;
  }),
  Effect.catchTag("NotFoundError", (e) =>
    Effect.succeed({ error: `${e.entity} ${e.id} not found` })
  ),
  Effect.catchTag("DatabaseError", (e) =>
    Effect.succeed({ error: `Database failure: ${e.cause}` })
  )
);

const runnable = Effect.provide(program, TodoRepositoryLive);

export { TodoRepository, TodoRepositoryLive, runnable };
export type { Todo, DatabaseError, NotFoundError };
