# Query Complexity Analysis

Cost analysis for GraphQL queries. Static analysis, field-level costs, depth limiting, dynamic multipliers, implementation approaches.

## Why Complexity Analysis

GraphQL lets clients craft arbitrarily expensive queries:
```graphql
{
  users(first: 100) {          # 100 users
    posts(first: 50) {         # 5000 posts
      comments(first: 50) {    # 250,000 comments
        author {               # 250,000 author lookups
          posts(first: 50) {   # 12,500,000 posts
            title
          }
        }
      }
    }
  }
}
```

Without limits, a single query can exhaust server resources.

## Depth Limiting

Simplest protection -- reject queries exceeding max nesting depth.

```
depth = 0: { users }
depth = 1: { users { name } }
depth = 2: { users { posts { title } } }
depth = 3: { users { posts { comments { body } } } }
```

Recommended max: 7-10 for most APIs. Set based on deepest legitimate client query + 2.

Algorithm:
```
function calculateDepth(selectionSet, currentDepth = 0):
  for each field in selectionSet:
    if field has selectionSet:
      maxDepth = max(maxDepth, calculateDepth(field.selectionSet, currentDepth + 1))
  return maxDepth
```

Limitation: depth alone doesn't prevent wide queries (`users(first: 10000) { name }` is depth 1).

## Static Complexity Analysis

Assign cost to each field BEFORE execution. Reject if total exceeds budget.

### Cost Model

```
fieldCost = baseCost * multiplier

where:
  baseCost = defined per field (default: 1 for scalars, 5 for connections)
  multiplier = pagination argument value (first/last) or default list size
```

### Schema Annotations

```graphql
type Query {
  user(id: ID!): User                              # cost: 1
  users(first: Int = 20): UserConnection!          # cost: 5 * first
  search(query: String!, first: Int = 10): SearchConnection!  # cost: 10 * first
}

type User {
  id: ID!                    # cost: 0 (free, already loaded)
  name: String!              # cost: 0
  posts(first: Int = 10): PostConnection!  # cost: 5 * first
  followers(first: Int = 20): UserConnection!  # cost: 5 * first (recursive!)
}
```

### Calculation Example

```graphql
{
  users(first: 10) {            # 5 * 10 = 50
    name                        # 0
    posts(first: 5) {           # (5 * 5) * 10 = 250
      title                     # 0
      comments(first: 3) {      # (5 * 3) * 50 = 750
        body                    # 0
      }
    }
  }
}
# Total: 50 + 250 + 750 = 1050
# If limit is 1000: REJECTED
```

## Dynamic Complexity (Runtime)

Some fields have variable cost depending on arguments or data:

```typescript
const complexityEstimators = {
  Query: {
    search: ({ args }) => {
      // Full-text search is more expensive than ID lookup
      return args.query.length > 50 ? 20 : 10;
    },
  },
  User: {
    recommendations: ({ args, childComplexity }) => {
      // ML-based field, expensive
      return 50 + (args.first ?? 10) * childComplexity;
    },
  },
};
```

## Implementation Approaches

### graphql-query-complexity (Node.js)

```typescript
import { createComplexityRule, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';

const rule = createComplexityRule({
  maximumComplexity: 1000,
  estimators: [
    fieldExtensionsEstimator(),
    simpleEstimator({ defaultComplexity: 1 }),
  ],
  createError: (max, actual) => (
    new GraphQLError(`Query too complex: ${actual}/${max} points`)
  ),
});
```

### Field Extensions (schema-defined costs)

```typescript
const typeDefs = `
  type Query {
    users(first: Int = 20): UserConnection!
  }
`;

const resolvers = {
  Query: {
    users: {
      extensions: {
        complexity: ({ args, childComplexity }) => args.first * childComplexity,
      },
      resolve: (_, args, ctx) => { /* ... */ },
    },
  },
};
```

## Cost Budget Strategy

| Client Type | Budget | Rationale |
|-------------|--------|-----------|
| Public API | 500-1000 | Untrusted, could be malicious |
| Authenticated user | 1000-2000 | Known identity, rate limited |
| Internal service | 5000-10000 | Trusted, monitored |
| Admin / tooling | Unlimited | Full access, audit logged |

Return remaining budget in response extensions:
```json
{
  "extensions": {
    "complexity": {
      "score": 450,
      "limit": 1000,
      "remaining": 550
    }
  }
}
```

## Combined Defense Layers

1. **Depth limit** (first line, cheap): reject depth > 10
2. **Complexity limit** (second line, static): reject cost > budget
3. **Timeout** (runtime safety net): kill execution after 10s
4. **Rate limiting** (per-client): cost-based budget per time window
5. **Persisted queries** (strongest): only allow known-safe operations
