# Performance & DataLoader

DataLoader batching, per-request lifecycle, cache priming, nested resolver optimization, N+1 prevention, response caching.

## Rules

1. One DataLoader instance per entity type per request -- never share across requests (stale cache)
2. DataLoader batch function receives array of keys, MUST return results in same order as keys
3. If key not found, return `null` at that index (not skip) -- positional correspondence is mandatory
4. Create DataLoaders in context factory -- fresh per request, garbage collected after
5. Prime DataLoader cache when you already have the data (e.g., after a list query)
6. Nested resolvers that access related entities MUST use DataLoader (this is where N+1 hides)
7. DataLoader deduplicates keys within a single tick -- same user ID referenced 10 times = 1 DB query
8. Batch size limit: match database IN clause limit (typically 1000) -- DataLoader splits automatically
9. Never `.clear()` cache mid-request unless you know the data changed within that request
10. Monitor batch sizes -- consistently batch size 1 means DataLoader is misconfigured or loaded too late

## N+1 Problem

```
Query:                    Without DataLoader:     With DataLoader:
{                         SELECT * FROM posts;    SELECT * FROM posts;
  posts {                 SELECT * FROM users     SELECT * FROM users
    author {                WHERE id = 1;           WHERE id IN (1, 2, 3);
      name                SELECT * FROM users     -- 2 queries total
    }                       WHERE id = 2;
  }                       SELECT * FROM users
}                           WHERE id = 3;
                          -- N+1 queries
```

## DataLoader Setup (TypeScript)

```typescript
import DataLoader from 'dataloader';

// Context factory -- new loaders per request
function createLoaders(db: Database) {
  return {
    userLoader: new DataLoader<string, User | null>(async (ids) => {
      const users = await db.users.findMany({
        where: { id: { in: ids as string[] } }
      });
      const userMap = new Map(users.map(u => [u.id, u]));
      // MUST return in same order as input ids
      return ids.map(id => userMap.get(id) ?? null);
    }),

    ordersByUserLoader: new DataLoader<string, Order[]>(async (userIds) => {
      const orders = await db.orders.findMany({
        where: { userId: { in: userIds as string[] } }
      });
      const grouped = new Map<string, Order[]>();
      for (const order of orders) {
        const list = grouped.get(order.userId) ?? [];
        list.push(order);
        grouped.set(order.userId, list);
      }
      return userIds.map(id => grouped.get(id) ?? []);
    }),
  };
}
```

## Cache Priming

```typescript
// After fetching a list, prime individual loaders
const users = await db.users.findMany({ where: { teamId } });
for (const user of users) {
  ctx.loaders.userLoader.prime(user.id, user);
}
// Subsequent .load(userId) calls hit cache, no DB round-trip
```

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| DataLoader created at module level | Cross-request cache pollution | Create in context factory |
| Batch function returns wrong order | Wrong data served to resolvers | Map by key, return in input order |
| Not handling missing keys | Crash or undefined | Return `null` for missing positions |
| DataLoader in parent but not child | N+1 in nested resolvers | Use loader in EVERY resolver that fetches |
| Using `.loadMany` when you need error per key | One failure fails all | Use `Promise.all(ids.map(id => loader.load(id)))` |
| Clearing cache unnecessarily | Re-fetches within same request | Only clear if data mutated mid-request |

## Response Caching

```graphql
type Query {
  products(first: Int): ProductConnection! @cacheControl(maxAge: 300)
}

type Product @cacheControl(maxAge: 3600) {
  id: ID!
  name: String!
  price: Int! @cacheControl(maxAge: 60)  # Price changes more often
}
```

Cache scope: `PUBLIC` (CDN-safe) vs `PRIVATE` (per-user). Any field with auth = PRIVATE.

## Field-Level Optimization

- Avoid expensive computation in fields that may not be queried (use lazy resolution)
- Use `info` parameter to check requested fields and skip unnecessary JOINs
- `@defer` for slow fields -- return fast data immediately, stream expensive fields

## Verification

- [ ] Enable query logging: all resolvers batch (batch size > 1 for related entities)
- [ ] No DataLoader instances shared across requests (inspect context lifecycle)
- [ ] Batch function tested: returns correct order, handles missing keys
- [ ] Load test: N posts with M authors = 2 queries (not N+1)
- [ ] `dataloader` package version supports `maxBatchSize` option (set to DB limit)
- [ ] Cache priming used after list queries to prevent redundant individual loads
