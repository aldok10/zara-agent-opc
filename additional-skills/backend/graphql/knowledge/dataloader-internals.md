# DataLoader Internals

Batching mechanics, request-level lifecycle, promise coalescing, cache invalidation, error handling, implementation details.

## Core Mechanism

DataLoader collects individual `.load(key)` calls within a single tick of the event loop, then executes a single batch function with all collected keys.

```
Tick 1 (resolver execution):
  resolver A calls loader.load("user:1")  → Promise A
  resolver B calls loader.load("user:2")  → Promise B
  resolver C calls loader.load("user:1")  → Promise A (same key, same promise!)

Tick 2 (microtask / nextTick):
  DataLoader calls batchFn(["user:1", "user:2"])  → [User1, User2]
  Promise A resolves with User1
  Promise B resolves with User2
```

Key insight: DataLoader uses `process.nextTick` (Node.js) or `Promise.resolve().then()` to schedule the batch dispatch at the end of the current execution frame.

## Promise Coalescing

When `.load(key)` is called with a key that's already in-flight:
- Same tick: returns existing promise from internal cache (deduplication)
- Already resolved: returns cached result immediately (no batch needed)
- Never re-requests a key within the same DataLoader lifetime

```typescript
// Internal simplified model
class DataLoader<K, V> {
  private cache = new Map<K, Promise<V>>();
  private queue: K[] = [];

  load(key: K): Promise<V> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!; // Coalesced!
    }
    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });
      if (this.queue.length === 1) {
        // Schedule batch on next tick
        process.nextTick(() => this.dispatch());
      }
    });
    this.cache.set(key, promise);
    return promise;
  }
}
```

## Batch Function Contract

```typescript
type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<(V | Error)[]>;
```

Rules:
1. Return array MUST have same length as input keys array
2. Return array MUST be in same order as input keys
3. For missing keys, return `null` or `new Error('Not found')` at that index
4. Returning `Error` at an index rejects only that key's promise (others still resolve)
5. Batch function throwing rejects ALL pending promises in that batch

## Error Handling

```typescript
const userLoader = new DataLoader(async (ids) => {
  const users = await db.users.findMany({ where: { id: { in: ids } } });
  const map = new Map(users.map(u => [u.id, u]));

  return ids.map(id => {
    const user = map.get(id);
    if (!user) return new Error(`User ${id} not found`); // Per-key error
    return user;
  });
});

// Consumer
try {
  const user = await userLoader.load('nonexistent');
} catch (err) {
  // Only this .load() rejects, others in same batch still resolve
}
```

## Cache Behavior

| Method | Effect |
|--------|--------|
| `.load(key)` | Returns cached promise if exists, else queues for next batch |
| `.loadMany(keys)` | Calls `.load()` for each key, returns array of results/errors |
| `.clear(key)` | Removes key from cache, next `.load()` will re-fetch |
| `.clearAll()` | Empties entire cache (rarely needed) |
| `.prime(key, value)` | Manually seeds cache (useful after create/list operations) |

## Request-Level Lifecycle

```
HTTP Request arrives
  ↓
Context factory creates fresh DataLoaders
  ↓
Resolvers execute, call loader.load() throughout
  ↓
DataLoader batches within each tick, fires batch functions
  ↓
Response sent
  ↓
DataLoader instances garbage collected (cache dies with request)
```

Why per-request:
- No stale data across requests
- No memory leak from accumulating cache entries
- No cross-user data leakage
- Cache is only valid within single request's consistency boundary

## Nested DataLoader Batching

When resolvers trigger other resolvers that also use DataLoaders:

```
Tick 1: Root resolvers fire → collect keys for batch 1
Tick 2: Batch 1 executes → results trigger child resolvers → collect keys for batch 2
Tick 3: Batch 2 executes → results trigger grandchild resolvers → collect keys for batch 3
...
```

Each level of resolver nesting adds one batch round-trip. Deep nesting = more sequential batches. Solution: flatten where possible, or use `@provides` in Federation.

## maxBatchSize

```typescript
const loader = new DataLoader(batchFn, { maxBatchSize: 1000 });
```

When more than `maxBatchSize` keys are collected:
- DataLoader splits into multiple batch function calls
- Each call receives at most `maxBatchSize` keys
- Set to match your database's IN clause limit or API batch endpoint limit

## Caching Disabled Mode

For cases where caching within a request causes issues:

```typescript
const loader = new DataLoader(batchFn, { cache: false });
// Every .load() call goes through batching but bypasses cache
// Same key called twice in same tick = still batched (deduplicated in batch keys)
// But results are not stored for future .load() calls
```
