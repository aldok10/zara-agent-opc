---
type: fact
title: "API Security"
---
# API Security

Technical reference for API authorization, rate limiting, input validation, authentication, CORS, and GraphQL security.

---

## BOLA/IDOR Prevention

Broken Object Level Authorization (BOLA) -- formerly IDOR -- is the #1 API vulnerability. Every endpoint that accesses a resource by ID must verify the caller owns/can access that resource.

### Pattern: Authorization Middleware

```typescript
type AuthzCheck = (userId: string, resourceId: string) => Promise<boolean>;

function requireOwnership(getResource: AuthzCheck) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth.sub;
    const resourceId = req.params.id;

    const allowed = await getResource(userId, resourceId);
    if (!allowed) {
      return res.status(404).json({ error: "Not found" }); // 404, not 403
    }
    next();
  };
}

// Usage
router.get(
  "/documents/:id",
  authenticate,
  requireOwnership(async (userId, docId) => {
    const doc = await db.document.findFirst({
      where: { id: docId, OR: [{ ownerId: userId }, { sharedWith: { has: userId } }] },
    });
    return doc !== null;
  }),
  getDocumentHandler,
);
```

Key: return 404 (not 403) to prevent resource enumeration. Attacker should not know the resource exists.

### Common BOLA Patterns

- Direct ID reference: `/api/users/123/profile`
- Nested resources: `/api/orgs/1/users/2` (check org membership AND user access)
- Batch endpoints: `/api/documents?ids=1,2,3` (check ALL IDs, not just first)
- File downloads: `/api/files/uuid` (verify ownership before serving)

---

## Rate Limiting

### Token Bucket Algorithm

```typescript
interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  keyExtractor: (req: Request) => string;
}

class TokenBucket {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(private config: RateLimitConfig) {}

  consume(key: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.config.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      this.config.maxTokens,
      bucket.tokens + elapsed * this.config.refillRate,
    );
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true };
    }

    const retryAfter = Math.ceil((1 - bucket.tokens) / this.config.refillRate);
    return { allowed: false, retryAfter };
  }
}
```

### Sliding Window (Redis)

```typescript
async function slidingWindowRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipe = redis.pipeline();
  pipe.zremrangebyscore(key, 0, windowStart);
  pipe.zadd(key, now, `${now}-${Math.random()}`);
  pipe.zcard(key);
  pipe.expire(key, windowSeconds);
  const results = await pipe.exec();

  const count = results[2][1] as number;
  return count <= limit;
}
```

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1625097600
Retry-After: 30
```

### Tiered Limits

| Tier | Auth Level | Limit |
|---|---|---|
| Anonymous | No auth | 10 req/min |
| Authenticated | Valid token | 100 req/min |
| Premium | Paid plan | 1000 req/min |
| Internal | Service-to-service | 10000 req/min |

---

## Input Validation for APIs

### Request Validation Middleware

```typescript
import { z } from "zod";

function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    req.validated = result.data;
    next();
  };
}

const CreateOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(50),
  shippingAddress: z.string().min(10).max(500),
});
```

### Payload Size Limits

```typescript
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ limit: "100kb", extended: false }));

// Per-route override for file uploads
router.post("/upload", express.raw({ limit: "10mb", type: "application/octet-stream" }));
```

---

## API Authentication

### Method Comparison

| Method | Use Case | Security Level |
|---|---|---|
| API Key | Server-to-server, low sensitivity | Low (easily leaked) |
| OAuth 2.1 Bearer | User-facing APIs | High |
| mTLS | Service mesh, zero-trust | Highest |
| HMAC Signature | Webhooks, request integrity | High |

### HMAC Request Signing (Webhook Verification)

```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const sig = signature.replace("sha256=", "");

  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
}
```

### mTLS Setup (Service-to-Service)

```typescript
import https from "node:https";
import fs from "node:fs";

const server = https.createServer({
  key: fs.readFileSync("server-key.pem"),
  cert: fs.readFileSync("server-cert.pem"),
  ca: fs.readFileSync("ca-cert.pem"),
  requestCert: true,
  rejectUnauthorized: true,
});
```

---

## CORS Configuration

### Strict Configuration

```typescript
import cors from "cors";

const ALLOWED_ORIGINS = new Set([
  "https://app.example.com",
  "https://admin.example.com",
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
}));
```

### CORS Anti-Patterns

- `origin: "*"` with `credentials: true` -- browsers reject this, but misconfig can leak
- Reflecting the Origin header back -- effectively allows any origin
- Allowing `null` origin -- exploitable via sandboxed iframes

---

## GraphQL Security

### Depth Limiting

Prevents deeply nested queries that cause exponential DB joins:

```typescript
import depthLimit from "graphql-depth-limit";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(7)],
});
```

### Query Cost Analysis

```typescript
interface CostConfig {
  maxCost: number;
  defaultFieldCost: number;
  listMultiplier: number;
}

function calculateQueryCost(query: DocumentNode, config: CostConfig): number {
  let totalCost = 0;

  visit(query, {
    Field(node) {
      const multiplier = hasListType(node) ? config.listMultiplier : 1;
      const fieldCost = getDirectiveCost(node) ?? config.defaultFieldCost;
      totalCost += fieldCost * multiplier;
    },
  });

  return totalCost;
}

// Reject queries exceeding cost budget
const cost = calculateQueryCost(parsedQuery, {
  maxCost: 1000,
  defaultFieldCost: 1,
  listMultiplier: 10,
});
if (cost > 1000) {
  throw new Error("Query too expensive");
}
```

### GraphQL-Specific Threats

| Threat | Mitigation |
|---|---|
| Introspection in production | Disable or restrict to authenticated admins |
| Batch queries | Limit array size in batch requests |
| Alias overloading | Limit number of aliases per query |
| Field suggestion exposure | Disable field suggestions in production |
| Subscription DoS | Limit active subscriptions per client |

```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== "production",
  plugins: [
    ApolloServerPluginLandingPageDisabled(), // No playground in prod
  ],
});
```
