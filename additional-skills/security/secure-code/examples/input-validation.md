---
type: example
title: "Input Validation Patterns with Zod"
---

# Input Validation Patterns (TypeScript + Zod)

## Context
When validating untrusted input at API boundaries—request bodies, query params, webhook payloads. Validation must happen before any business logic touches the data. Zod provides runtime type safety with zero-cost TypeScript inference.

## Code/Template

```typescript
// src/validation/schemas.ts
import { z } from 'zod';

// Reusable primitives with security constraints
const SafeString = z.string().trim().min(1).max(1000);
const Email = z.string().email().max(254).toLowerCase();
const UUID = z.string().uuid();

// Prevent NoSQL injection / prototype pollution
const SafeObject = z.record(z.string().max(100), z.unknown()).refine(
  (obj) => !Object.keys(obj).some((k) => k.startsWith('$') || k.startsWith('__')),
  { message: 'Invalid key prefix detected' }
);

// Money: always use integer cents to avoid floating point
const Money = z.object({
  amount: z.number().int().min(0).max(999_999_99), // max $9,999.99
  currency: z.enum(['USD', 'EUR', 'GBP']),
});

// Pagination with sensible defaults and hard limits
export const PaginationParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// User registration with security rules
export const CreateUserSchema = z.object({
  email: Email,
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .refine(
      (pw) => !['password123', 'admin12345'].includes(pw.toLowerCase()),
      { message: 'This password is too common' }
    ),
  name: SafeString.max(100),
  role: z.enum(['user', 'editor']).default('user'), // Never allow 'admin' via API
});

// Webhook payload with signature verification context
export const StripeWebhookSchema = z.object({
  id: z.string().startsWith('evt_'),
  type: z.enum([
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ]),
  data: z.object({
    object: z.object({
      id: z.string(),
      amount: z.number().int().min(0),
      currency: z.string().length(3),
      customer: z.string().startsWith('cus_').optional(),
      metadata: z.record(z.string().max(500)).optional(),
    }),
  }),
  created: z.number().int().refine(
    (ts) => {
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
      return ts > fiveMinutesAgo;
    },
    { message: 'Event timestamp too old (possible replay attack)' }
  ),
});

// File upload metadata validation
export const FileUploadSchema = z.object({
  filename: z
    .string()
    .max(255)
    .refine(
      (name) => !/[<>:"/\\|?*\x00-\x1f]/.test(name),
      { message: 'Filename contains invalid characters' }
    )
    .refine(
      (name) => !name.includes('..'),
      { message: 'Path traversal detected' }
    ),
  mimeType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]),
  sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB max
});

// URL validation (prevent SSRF)
export const SafeUrl = z.string().url().refine(
  (url) => {
    const parsed = new URL(url);
    const blocked = ['localhost', '127.0.0.1', '169.254.169.254', '0.0.0.0'];
    return (
      parsed.protocol === 'https:' &&
      !blocked.includes(parsed.hostname) &&
      !parsed.hostname.endsWith('.internal') &&
      !parsed.hostname.startsWith('10.') &&
      !parsed.hostname.startsWith('192.168.')
    );
  },
  { message: 'URL must be HTTPS and not point to internal resources' }
);

// Type inference for downstream use
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type PaginationInput = z.infer<typeof PaginationParams>;
```

```typescript
// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        // Never expose raw Zod internals to client
      });
    }

    // Replace raw input with validated + transformed data
    req[source] = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    formatted[path] = issue.message;
  }
  return formatted;
}

// Usage in routes
// app.post('/api/users', validate(CreateUserSchema), createUserHandler);
// app.get('/api/users', validate(PaginationParams, 'query'), listUsersHandler);
```

## Key Points
- Validate at the boundary, use typed data downstream—`z.infer<typeof Schema>` gives you compile-time safety after runtime validation
- Block SSRF in URL inputs by denying internal IPs, metadata endpoints, and non-HTTPS protocols
- Never allow role escalation via API input; hard-code admin assignment to internal tooling only
