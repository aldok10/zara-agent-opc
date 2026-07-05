---
type: tool
title: "PHP Async Migration Prompt"
---

# PHP Async Migration Prompt

You are helping migrate a traditional PHP application (Apache/mod_php, PHP-FPM) to an async runtime (Swoole, FrankenPHP, or RoadRunner).

## Input

**Current stack:** {{webserver}}/{{php_sapi}} (e.g., Apache/mod_php, Nginx/PHP-FPM)
**Target runtime:** {{swoole | frankenphp | roadrunner | openswoole}}
**Framework:** {{laravel | symfony | slim | custom | none}}
**PHP version:** {{version}}
**Codebase size:** {{small | medium | large}}

## Assessment Checklist

Before migration, evaluate each category:

### 1. Global State Contamination
- [ ] Superglobals used directly (`$_GET`, `$_POST`, `$_SESSION`, `$_SERVER`)
- [ ] Static class properties that hold request-specific state
- [ ] Singleton instances that cache per-request data
- [ ] Global variables or `global` keyword usage
- [ ] File-level state (`include`/`require` side effects)

### 2. Extension Compatibility
- [ ] PDO/MySQLi -- connection pooling behavior changes
- [ ] Redis/Memcached -- persistent connections become shared
- [ ] File operations -- blocking I/O in async context
- [ ] cURL -- replace with coroutine-aware HTTP client
- [ ] Session extension -- incompatible with long-lived process

### 3. Memory & Lifecycle
- [ ] Memory leaks (objects never garbage collected in long-running process)
- [ ] Circular references without `WeakReference`
- [ ] Large arrays accumulated across requests
- [ ] Event listeners registered but never removed
- [ ] Resources (file handles, DB connections) not explicitly closed

### 4. Framework Compatibility Matrix

| Feature | Swoole | FrankenPHP | RoadRunner |
|---------|--------|------------|------------|
| Laravel Octane | Native | Native | Native |
| Symfony Runtime | swoole-runtime | frankenphp-runtime | roadrunner-bundle |
| PSR-7 | Adapter needed | Built-in | Built-in |
| Fibers | Coroutine-based | PHP Fibers | PHP Fibers |
| Worker mode | Yes | Yes | Yes |
| Static file serving | Built-in | Caddy | Separate |

## Migration Steps

### Phase 1: Audit & Prepare (no runtime change yet)

1. Run static analysis for global state:
   ```bash
   grep -rn '\$_GET\|\$_POST\|\$_SESSION\|\$_SERVER\|\$_COOKIE' src/
   grep -rn 'static \$\|global \$' src/
   ```
2. Identify request-scoped singletons in DI container
3. Add `WeakMap`/`WeakReference` where objects cross request boundaries
4. Ensure all DB connections use explicit `close()` or pool return
5. Add memory usage assertions in test suite

### Phase 2: Isolate Request State

1. Replace superglobal access with PSR-7 Request injection
2. Convert static state to request-scoped containers
3. Wrap session handling in an interface (swap implementation later)
4. Ensure middleware resets state between requests

### Phase 3: Install Target Runtime

For Swoole:
```bash
pecl install swoole
# or: composer require swoole/ide-helper --dev
```

For FrankenPHP:
```bash
# Binary install or Docker
docker pull dunglas/frankenphp
```

For RoadRunner:
```bash
composer require spiral/roadrunner-http
vendor/bin/rr get-binary
```

### Phase 4: Configure Worker Mode

1. Create worker bootstrap (handles request loop)
2. Configure connection pools (DB, Redis, HTTP clients)
3. Set worker count based on CPU cores and memory
4. Configure max-requests-per-worker to mitigate memory leaks
5. Set up health checks and graceful restart

### Phase 5: Validate

- [ ] Run full test suite under new runtime
- [ ] Load test: compare RPS, p99 latency, memory usage
- [ ] Verify no state leakage between requests (randomized test order)
- [ ] Monitor memory growth over 10,000+ requests
- [ ] Test graceful shutdown and restart behavior

## Output Format

```
## Assessment Summary
- Global state issues: [count] (critical: [n], fixable: [n])
- Incompatible extensions: [list]
- Estimated effort: [days/weeks]
- Recommended runtime: [choice] -- reason: [why]

## Migration Plan
1. [step] -- effort: [hours] -- risk: [low/med/high]
2. ...

## Blockers
- [blocker]: [mitigation or alternative]

## Performance Expectations
- Current: ~[n] req/s
- Expected: ~[n] req/s (based on [runtime] benchmarks for similar workloads)
```

## Rules

- Never assume extension compatibility -- verify against runtime docs.
- Memory leaks in long-lived processes are silent killers. Always set max-requests.
- Test with realistic concurrency, not just sequential requests.
- If the codebase is heavily coupled to superglobals, budget 2-3x the naive estimate.
