---
type: tool
title: "GraphQL Resolver Optimization"
---

# GraphQL Resolver Optimization

## Purpose

Design and optimize GraphQL resolvers to prevent N+1 queries, manage data loading efficiently, and maintain performance at scale. Covers DataLoader patterns, batching, and query complexity management.

## When to Use

- Resolvers causing N+1 database queries
- API response times growing with query depth
- Implementing DataLoader for batch loading
- Setting up query complexity limits
- Designing resolver architecture for a new schema

## Prompt Template

```
CONTEXT:
- GraphQL server: [Apollo | Yoga | Mercurius | Absinthe | gqlgen | Strawberry]
- Language: [TypeScript | Go | Python | Elixir | Rust]
- Data sources: [PostgreSQL | MongoDB | REST APIs | microservices]
- Schema complexity: [flat | nested 2-3 levels | deeply nested]
- Problematic query: [paste query showing the performance issue]
- Current resolver approach: [naive per-field | batched | cached]

OPTIMIZATION STRATEGIES:
1. DataLoader pattern
   - Batch: collect IDs across resolvers, single query per type
   - Cache: per-request memoization (not cross-request)
   - Scope: new DataLoader instance per request
   - Priming: populate cache from parent resolver data

2. Query planning
   - Look-ahead: inspect selection set to optimize DB query
   - Join Monster / Hasura approach: compile to single SQL
   - Partial loading: only fetch requested fields

3. N+1 prevention
   - Identify: resolver called once per parent item
   - Batch: group by parent, single query with IN clause
   - Eager load: resolve at parent level when always needed
   - Lazy load: defer until field actually requested

4. Complexity management
   - Query depth limiting
   - Field cost estimation (static + multiplier)
   - Timeout per resolver
   - Pagination enforcement (no unbounded lists)

5. Caching
   - Response caching (CDN, persisted queries)
   - Resolver-level caching (TTL per field)
   - Cache invalidation on mutation

ANTI-PATTERNS:
- DataLoader with side effects
- Shared DataLoader across requests (stale data)
- Resolving full objects when only ID needed
- Missing pagination on list fields
- Overly permissive query depth
```

## Output Format

```
## Resolver Optimization: [schema area]

### Problem Analysis
[N+1 pattern identified, query count per request]

### DataLoader Design
| Type | Batch Function | Cache Key | Scope |
|------|---------------|-----------|-------|
| ... | ... | ... | per-request |

### Before/After
- Before: [N queries per request]
- After: [M queries per request]

### Implementation
[Key code snippets for DataLoader setup and resolver wiring]

### Complexity Rules
| Field | Cost | Multiplier | Max Depth |
|-------|------|-----------|-----------|
| ... | ... | ... | ... |

### Monitoring
- [Metrics to track: resolver duration, batch sizes, cache hit rate]
```
