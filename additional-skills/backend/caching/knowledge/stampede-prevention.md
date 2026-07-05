# Stampede Prevention

Cache stampede (thundering herd) prevention techniques. Probabilistic early expiry, locking, request coalescing, circuit breaker.

## The Problem

When a hot key expires, N concurrent requests all miss simultaneously, all hit the database:
```
Key expires → 100 concurrent requests → 100 DB queries → DB overload → cascading failure
```

## XFetch (Probabilistic Early Expiry)

```
// Each reader independently decides whether to refresh early
// Based on: remaining TTL, request rate (beta parameter)

func xfetch(key, ttl, beta, fetchFn):
    value, delta, expiry = cache.get_with_metadata(key)
    
    // Probabilistically refresh before actual expiry
    if time.Now() - (delta * beta * ln(rand())) >= expiry:
        value = fetchFn()
        cache.set(key, value, ttl)
    
    return value
```

- No coordination needed between instances
- Higher `beta` = earlier refresh (more aggressive, more DB load)
- Typical `beta`: 1.0 for moderate traffic, 0.5 for very high traffic keys
- Delta = time taken to compute/fetch the value (self-adapting)
- Statistically, only 1 request refreshes per expiry window under normal load

## Mutex Lock (Single Flight)

```
func get_with_lock(key, ttl, fetchFn):
    value = cache.get(key)
    if value != nil:
        return value
    
    lock_key = "lock:" + key
    acquired = cache.set(lock_key, "1", NX, EX=5)  // 5s lock timeout
    
    if acquired:
        value = fetchFn()        // only one request fetches
        cache.set(key, value, ttl)
        cache.del(lock_key)
        return value
    else:
        sleep(50ms)              // wait for winner to populate
        return cache.get(key)    // retry (or return stale if available)
```

- Exactly one request refreshes, others wait
- Risk: lock holder crashes → all waiters timeout → use lock TTL as safety
- Improve: return stale value to waiters while one refreshes (stale-while-revalidate)

## Request Coalescing (Singleflight)

```
// In-process: deduplicate concurrent requests for same key
// Go: golang.org/x/sync/singleflight
// Node: p-memoize or custom Map<key, Promise>

var group singleflight.Group

func get(key):
    value, err, shared = group.Do(key, func():
        return fetchFromCacheOrDB(key)
    )
    // Only first caller executes, others get same result
    return value
```

- Eliminates duplicate work within single process
- Does NOT help across multiple instances (combine with lock or XFetch)
- Zero latency overhead for deduplicated requests
- Must handle errors carefully (don't cache errors via singleflight)

## Stale-While-Revalidate

```
func get_swr(key, ttl, stale_ttl, fetchFn):
    value, expiry = cache.get_with_expiry(key)
    
    if value != nil and time.Now() < expiry:
        return value                    // fresh hit
    
    if value != nil and time.Now() < expiry + stale_ttl:
        async: refresh(key, fetchFn)    // serve stale, refresh background
        return value                    // stale but fast
    
    return fetchFn()                    // truly expired, blocking fetch
```

- Users always get fast response (stale is better than slow)
- Background refresh keeps cache warm
- Combine with singleflight to prevent multiple async refreshes

## Circuit Breaker on Cache Layer

```
// If DB is overloaded due to cache failure:
func get_with_circuit_breaker(key, fetchFn):
    value = cache.get(key)
    if value != nil:
        return value
    
    if circuit_breaker.is_open():
        return fallback_value or error("service degraded")
    
    try:
        value = fetchFn()
        cache.set(key, value, ttl)
        circuit_breaker.record_success()
        return value
    catch timeout/error:
        circuit_breaker.record_failure()
        return fallback_value
```

## Technique Comparison

| Technique | Coordination | Stale Served | Complexity | Best For |
|-----------|-------------|--------------|------------|----------|
| XFetch | None | Briefly (probabilistic) | Low | General purpose, stateless |
| Mutex lock | Redis SET NX | While locked (optional) | Medium | Critical keys, exact control |
| Singleflight | In-process | No | Low | Per-instance dedup |
| Stale-while-revalidate | None | Yes (intentional) | Low | User-facing latency SLA |
| Circuit breaker | Per-instance state | N/A (stops calls) | Medium | Protecting downstream |

## Combined Strategy (Production)

```
1. Singleflight (in-process) -- dedup within instance
2. XFetch (probabilistic early refresh) -- prevent synchronized expiry
3. Stale-while-revalidate -- serve stale during refresh
4. Circuit breaker -- stop cascade if origin is down
```

## Verification

- [ ] Load test with cold cache: spike of concurrent requests for same key
- [ ] Verify only 1 (or few) requests reach DB per cache miss (metrics/logs)
- [ ] Lock TTL is shorter than request timeout (prevents infinite wait)
- [ ] Stale values are served (not errors) during refresh window
- [ ] Circuit breaker tested: kill DB, verify graceful degradation
