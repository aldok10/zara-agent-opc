---
type: fact
title: "Error Handling"
---

# Error Handling

Structured error patterns for Node.js: custom error classes, error codes, async boundaries, and production-grade error management.

## Custom Error Classes

```typescript
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly isOperational = true;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 422;
  constructor(message: string, readonly details: Record<string, string[]>) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
  }
}

export class ConflictError extends AppError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;
}

export class UnauthorizedError extends AppError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;
  constructor() { super('Authentication required'); }
}

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;
  constructor() { super('Insufficient permissions'); }
}
```

## Error Codes Pattern

```typescript
// Define error catalog
export const ErrorCodes = {
  VALIDATION_ERROR: { status: 422, message: 'Validation failed' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  DUPLICATE_ENTRY: { status: 409, message: 'Resource already exists' },
  RATE_LIMITED: { status: 429, message: 'Too many requests' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
} as const;

type ErrorCode = keyof typeof ErrorCodes;
```

## Async Error Boundaries

```typescript
// Service layer: catch and wrap external errors
export async function getUser(id: string): Promise<User> {
  try {
    const row = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!row) throw new NotFoundError('User', id);
    return mapRowToUser(row);
  } catch (err) {
    if (err instanceof AppError) throw err; // re-throw operational errors
    // Wrap unexpected errors
    throw new AppError('Failed to fetch user') {
      // actually use the pattern below
    };
  }
}

// Better: explicit wrapping
function wrapError(err: unknown, message: string): Error {
  if (err instanceof AppError) return err;
  const wrapped = new Error(message, { cause: err });
  return wrapped;
}
```

## Fastify Error Handler

```typescript
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  // Operational errors -- expected, safe to expose
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(error.toJSON());
  }

  // Fastify validation errors
  if (error.validation) {
    return reply.status(422).send({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.validation,
    });
  }

  // Unexpected errors -- log full detail, return generic message
  request.log.error({ err: error, requestId: request.id }, 'Unhandled error');
  return reply.status(500).send({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
});
```

## Unhandled Rejection / Uncaught Exception

```typescript
// Global handlers -- last resort, log and exit
process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ err: reason }, 'Unhandled rejection -- shutting down');
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught exception -- shutting down');
  process.exit(1);
});

// NOTE: in production, graceful shutdown should handle draining before exit
```

## Error Cause Chain

```typescript
// Use Error.cause for wrapping (ES2022)
try {
  await externalApi.call();
} catch (err) {
  throw new AppError('External API failed', { cause: err });
}

// Access the chain
function getRootCause(error: Error): Error {
  let current: Error = error;
  while (current.cause instanceof Error) {
    current = current.cause;
  }
  return current;
}
```

## Result Pattern (Alternative to exceptions)

```typescript
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> { return { ok: true, value }; }
function err<E>(error: E): Result<never, E> { return { ok: false, error }; }

// Usage
async function parseConfig(raw: string): Result<Config, ValidationError> {
  const parsed = configSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return err(new ValidationError('Invalid config', parsed.error.flatten()));
  return ok(parsed.data);
}

const result = await parseConfig(input);
if (!result.ok) { /* handle error */ }
const config = result.value; // narrowed to Config
```

## Best Practices

1. Every thrown error must have a `.code` -- enables programmatic handling
2. Use `Error.cause` to preserve original error context
3. Distinguish operational (expected) vs programmer (bug) errors
4. Operational: respond to client. Programmer: log, alert, maybe crash.
5. Never swallow errors silently -- at minimum log them
6. Validate early (at boundaries), fail fast
7. Use Zod `.safeParse()` -- returns Result-like, never throws
