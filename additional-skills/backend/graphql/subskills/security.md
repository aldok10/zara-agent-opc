# Security

GraphQL security hardening. Depth limiting, complexity analysis, persisted queries, authorization directives, rate limiting, introspection control.

## Rules

1. Depth limit (7-10 max) -- prevents recursive query attacks (`{ user { friends { friends { ... } } } }`)
2. Query complexity limit -- assign cost to fields, reject queries exceeding budget (e.g., 1000 points)
3. Persisted queries in production -- only allow pre-registered operations, reject arbitrary query strings
4. Disable introspection in production -- expose schema via docs/registry, not `__schema` query
5. Auth at directive level (`@auth(requires: ADMIN)`) -- declarative, visible in schema
6. Rate limit by operation name AND client identity -- not just HTTP endpoint
7. Input validation in EVERY resolver -- length limits, format checks, range bounds
8. Never expose internal IDs that reveal business data (use opaque base64 or UUIDs)
9. Alias limiting (max 30) -- aliases multiply field resolution, bypass per-field rate limits
10. Batch query limiting -- max 5 operations per HTTP request to prevent batched brute-force

## Depth Limiting

```typescript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  schema,
  validationRules: [depthLimit(10)],
});
```

Depth 10 covers most legitimate UIs. Reject with clear error message.

## Query Complexity Analysis

Static analysis (pre-execution):
```typescript
import { createComplexityRule, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';

const complexityRule = createComplexityRule({
  maximumComplexity: 1000,
  estimators: [
    fieldExtensionsEstimator(),  // Use field-level costs from schema
    simpleEstimator({ defaultComplexity: 1 }),
  ],
  onComplete: (complexity) => {
    console.log('Query complexity:', complexity);
  },
});
```

Field-level cost in schema:
```graphql
type Query {
  users(first: Int = 10): UserConnection! @complexity(value: 5, multipliers: ["first"])
  # Cost = 5 * first argument value. first=50 → cost=250
}
```

## Persisted Queries

Two modes:
1. **Automatic Persisted Queries (APQ)** -- client sends hash, server looks up or registers
2. **Persisted Query Allowlist** -- only pre-registered operations execute (stricter)

Allowlist workflow:
```
1. Extract operations from client code at build time (e.g., graphql-codegen)
2. Register operations in manifest (operation ID → query document)
3. Deploy manifest to server
4. Server rejects any operation not in manifest
5. Client sends operation ID instead of full query string
```

```typescript
// Server-side allowlist check
const server = new ApolloServer({
  schema,
  persistedQueries: {
    cache: new KeyValueCache(), // Redis-backed
  },
  // In strict mode: reject unregistered queries
  allowBatchedHttpRequests: false,
});
```

## Authorization Patterns

Directive-based (schema-visible):
```graphql
directive @auth(requires: Role = USER) on FIELD_DEFINITION | OBJECT

enum Role { USER ADMIN MODERATOR }

type Mutation {
  deleteUser(id: ID!): Boolean! @auth(requires: ADMIN)
  updateProfile(input: UpdateProfileInput!): User! @auth(requires: USER)
}
```

Implementation:
```typescript
function authDirective(schema, directiveName) {
  return mapSchema(schema, {
    [MapperKind.FIELD]: (fieldConfig) => {
      const required = getDirective(schema, fieldConfig, directiveName)?.[0]?.requires;
      if (required) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = (source, args, context, info) => {
          if (!context.user || !context.user.roles.includes(required)) {
            throw new ForbiddenError('Insufficient permissions');
          }
          return resolve(source, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
}
```

## Rate Limiting

Per-operation rate limiting (not just HTTP-level):
```typescript
// Track by: client ID + operation name
const rateLimitKey = `${context.clientId}:${info.operation.name?.value}`;
const limit = operationLimits[info.operation.name?.value] ?? 100; // per minute
```

Cost-based rate limiting:
- Assign cost to each operation (complexity score)
- Budget per client per window (e.g., 10,000 points/minute)
- Expensive queries consume budget faster

## Introspection Control

```typescript
import { NoSchemaIntrospectionCustomRule } from 'graphql';

const server = new ApolloServer({
  schema,
  validationRules: process.env.NODE_ENV === 'production'
    ? [NoSchemaIntrospectionCustomRule]
    : [],
});
```

Alternative: allow introspection only with specific header (for internal tooling).

## Verification

- [ ] Depth limit rejects query at depth 11+ (test with nested fragment)
- [ ] Complexity limit rejects wide query (100 items with nested relations)
- [ ] Arbitrary query string returns 400 in production (persisted queries active)
- [ ] `__schema` query returns error in production
- [ ] Unauthorized field access returns proper 403/FORBIDDEN error
- [ ] Rate limit triggers after threshold (test with burst requests)
- [ ] Input validation rejects oversized strings, negative numbers, invalid formats
- [ ] Alias limit prevents `a1: user a2: user a3: user ...` amplification
