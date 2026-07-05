---
type: fact
title: "PHP Common Mistakes - Production Lessons"
---

# PHP Common Mistakes: Production Lessons

Learning from others' mistakes so you don't repeat them. These are real production incidents and gotchas from senior PHP teams.

## 1. Swoole/Long-Running Runtime Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Static/global state between requests | User A sees User B's data; auth context bleeds | Reset all static state per request; use coroutine context (`Coroutine::getContext()`) |
| Not clearing service container singletons | Stale DB connections, wrong tenant context | Use `defer()` or request-scoped containers; Hyperf's `RequestContext` |
| PDO connections held across coroutines | "MySQL server has gone away", deadlocks | Use connection pools (`ConnectionPool`); never share a connection between coroutines |
| Coroutine-unsafe libraries (file_get_contents, sleep) | Blocks the entire event loop, throughput drops to zero | Replace with coroutine-aware equivalents: `Coroutine::sleep()`, Swoole HTTP client |
| Memory leaks in long-running workers | OOM after hours/days; silent restarts | Set `max_requests`, profile with `memory_get_usage()`, avoid appending to class properties |
| Channel deadlocks | Worker hangs forever waiting on full/empty channel | Always use timeouts: `$channel->pop(5.0)`; monitor channel length |
| Exception in coroutine kills silently | Unhandled exception vanishes; no log, no trace | Wrap every `go()` body in try/catch; set `Coroutine::set(['hook_flags' => ...])` |
| Timer callbacks referencing `$this` | Object never GC'd; memory grows indefinitely | Use `WeakReference` or clear timers explicitly in `onWorkerStop` |

## 2. Laravel/Framework Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| N+1 queries in Blade templates | 100 posts = 101 queries; page takes 3s+ | Use `$with` on model or `::with()` at query time; install `laravel-query-detector` |
| Eager loading everything "just in case" | Single query loads 50MB of relations; OOM | Load only what the endpoint needs; use `select()` to limit columns |
| Serializing Eloquent models in jobs | Job payload bloats; model state stale when processed | Pass IDs, re-fetch in `handle()`; use `SerializesModels` only when needed |
| Queue jobs without retry limits | Poison message loops forever, clogs the queue | Set `$tries`, `$maxExceptions`, `$backoff`; implement `failed()` method |
| `config()` calls in loops | Works in FPM, breaks in Octane (returns stale config) | Cache config in a variable; for Octane, use `app()->make()` pattern |
| Trusting `Request::all()` for mass assignment | Attackers add `is_admin=1` to POST body | Always use `$request->validated()` from FormRequest; never `fill($request->all())` |
| Broadcasting model events from queue workers | Infinite loops: event fires job, job fires event | Use `$dispatchesEvents` carefully; guard with `WithoutBroadcasting` |
| `DB::transaction()` with external API calls | HTTP timeout inside transaction holds locks for 30s+ | Move API calls outside transaction; use saga/outbox pattern |
| Forgetting `chunk()` for large datasets | `Model::all()` loads 1M rows into memory | Use `cursor()` (lazy), `chunk()`, or `lazy()` for iteration |

## 3. PHP Type System Traps

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| `0 == "foo"` evaluates true (PHP < 8.0) | Logic bypass in auth/permission checks | Use `===` always; enable `strict_types=1`; upgrade to PHP 8.0+ |
| `strict_types` only applies to the declaring file | Called function in another file without strict still coerces | Add `declare(strict_types=1)` to EVERY file; enforce via PHPStan rule |
| Float comparison: `0.1 + 0.2 !== 0.3` | Financial calculations off by fractions | Use `bcmath` or integer cents; never compare floats with `===` |
| `array_key_exists` vs `isset` on null | `isset($a['key'])` returns false if value is null | Use `array_key_exists()` when null is a valid value |
| `in_array('0', ['foo'])` is true without strict | Security bypass: loose comparison matches unintended values | Always pass `true` as third param: `in_array($v, $arr, true)` |
| `json_decode` returns null on error AND for literal null | Can't distinguish "null" from parse failure | Check `json_last_error()` or use `JSON_THROW_ON_ERROR` flag |
| `empty("0")` is true | String "0" treated as empty; valid input rejected | Avoid `empty()` for string validation; use explicit checks |
| Union types with `null` and `false` | `string|false` vs `?string` confusion in return handling | Be explicit: check `=== false` separately from `=== null` |
| Enum `->value` on non-backed enum | Fatal error at runtime, no static analysis warning | Only access `->value` on BackedEnum; use `->name` for UnitEnum |

## 4. Performance Anti-Patterns

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| String concatenation in loops | Each `.=` allocates new string; O(n^2) with large strings | Use `implode()` on array, or `fwrite()` to stream |
| `array_merge()` inside loops | Reallocates and copies on every iteration; O(n^2) | Collect then merge once, or use spread: `array_merge(...$arrays)` |
| Not preallocating arrays | Minor, but repeated `[]` push triggers resize copies | Use `SplFixedArray` for known sizes; or `array_fill()` |
| `preg_match` without compiled pattern cache | Regex recompiles if pattern changes per iteration | Keep pattern constant; use `S` modifier for studied patterns |
| Autoloading in hot loops | Each new class triggers file stat + include | Preload hot classes; use `opcache.preload`; avoid dynamic class instantiation in loops |
| `count()` in loop condition | Recalculates every iteration (though usually O(1) for arrays) | Store in variable for clarity; critical for `Countable` objects with expensive counts |
| `file_get_contents` for large files | Loads entire file into memory | Use `SplFileObject` or `fopen`/`fgets` for line-by-line |
| Serializing large objects for cache | `serialize()`/`unserialize()` is slow for deep graphs | Use `igbinary` or `msgpack`; cache only needed fields as arrays |
| Not using generators for large datasets | Array of 1M items sits in memory | Use `yield`; return generators from repository methods |

## 5. Security Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| `unserialize()` on user input | Remote Code Execution via crafted payload (gadget chains) | Never unserialize untrusted data; use `json_decode`; set `allowed_classes: []` |
| Mass assignment without guarding | Attacker sets `role`, `is_admin`, `balance` fields | Use `$fillable` whitelist (not `$guarded` blacklist); validate first |
| Raw SQL with string interpolation | SQL injection: `"WHERE id = $id"` | Use parameterized queries: `->where('id', $id)` or PDO placeholders |
| File upload without content validation | User uploads `.php` file disguised as image; gets executed | Validate MIME via `finfo`, store outside webroot, randomize filename |
| `extract()` on request data | Creates/overwrites arbitrary variables in scope | Never use `extract()` on external input; use explicit assignment |
| `eval()`/`assert()` with user input | Arbitrary code execution | Remove all `eval()`; use proper parsing/templating |
| Weak CSRF in API routes | State-changing GET endpoints exploitable via img tags | Use POST+token for mutations; verify `SameSite` cookie attribute |
| Timing attacks on string comparison | Token/hash comparison leaks character-by-character | Use `hash_equals()` for all secret comparisons |
| `header("Location: $url")` without validation | Open redirect; phishing via trusted domain | Whitelist redirect destinations; validate against allowed hosts |
| Session fixation after login | Attacker sets session ID before victim authenticates | Call `session_regenerate_id(true)` after successful login |

## 6. Testing Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Mocking everything except the unit | Test passes but real integration is broken | Mock only external boundaries (HTTP, DB, filesystem); use fakes |
| Testing implementation (method calls) not behavior | Refactor breaks all tests even though behavior unchanged | Assert on outputs/side-effects, not internal method sequences |
| Shared database state between tests | Test B depends on data from Test A; random failures in CI | Use `RefreshDatabase` or transactions; each test sets up own data |
| Using `time()` directly in code | Tests are flaky around midnight/DST; can't verify time logic | Inject a `Clock` interface; freeze time in tests (`Carbon::setTestNow`) |
| Giant factory states | Factory creates 20 related models; test suite takes 10min | Create minimal state per test; use `make()` over `create()` when DB not needed |
| Not testing error paths | Happy path works; first production error crashes differently | Write explicit tests for exceptions, validation failures, empty states |
| Over-relying on HTTP tests | Controller test passes but service logic untested in isolation | Layer tests: unit (services), integration (repos), feature (HTTP) |
| Asserting exact JSON without flexibility | Adding any field to response breaks 50 tests | Use `assertJsonStructure()` or assert specific keys, not full body |
| Missing queue/event assertions | Job dispatched but never verified; breaks silently | Use `Queue::fake()`, `Event::fake()`; assert dispatched with correct payload |

## 7. Deployment/Infrastructure

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| OPcache not cleared on deploy | Old bytecode served after deploy; random mix of old/new code | Use `opcache_reset()` in deploy script; or use `opcache.validate_timestamps=0` with symlink swap |
| OPcache `max_accelerated_files` too low | Files evicted from cache; random slow requests | Set to next prime above file count: `find . -name "*.php" | wc -l`, then round up |
| FPM `pm.max_children` too high | Each child uses 30-80MB; server OOMs and kills processes | Calculate: `(available_ram - system) / avg_child_memory`; monitor with `pm.status_path` |
| FPM `pm = dynamic` in containers | Spawning/killing children adds latency jitter | Use `pm = static` in containers where memory is fixed |
| `memory_limit = -1` in production | Single bad request consumes all server RAM | Set realistic limit (128M-256M); fix code that needs more |
| Not setting `realpath_cache_size` | Thousands of `stat()` calls on every request with symlinks | Set to 4096k+; increase `realpath_cache_ttl` for deploy-via-symlink |
| `max_execution_time` doesn't cover system calls | `sleep()`, `file_get_contents()` to slow host bypasses limit | Set socket timeouts separately; use `set_time_limit()` for CPU-bound only |
| PHP-FPM `request_terminate_timeout` unset | Stuck request holds worker forever; pool exhaustion | Set to slightly above `max_execution_time` (e.g., 35s if max_exec is 30s) |
| Log files unbounded in container | Disk fills; OOM from log buffer; container killed | Log to stdout/stderr; let orchestrator handle rotation |

## 8. Modern PHP Traps (8.1-8.4+)

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| `readonly` property with mutable object | Object itself can't be reassigned but its internals mutate freely | Use deep-clone in constructor; or accept this is by-design and document |
| `readonly` class with inheritance | Child class must also be readonly; can't add non-readonly properties | Design readonly classes as final leaf nodes |
| Enum in database without backed value | `MyEnum::Case->name` works but has no stable string for DB storage | Always use BackedEnum (`string` or `int`) for persisted values |
| Serializing enum across service boundaries | Other service receives `"MyEnum::Active"` string, can't decode | Send `->value` over wire; reconstruct with `::from()` on receiving end |
| First-class callable in serialized closure | `strlen(...)` can't be serialized for queue jobs | Don't pass first-class callables to serialized contexts; use class-based invokables |
| Fiber + exception = silent death | Uncaught exception in suspended Fiber; no stack trace in logs | Wrap Fiber body in try/catch; log and re-throw |
| `#[Override]` missing on framework methods | Parent removes method in upgrade; your override silently becomes dead code | Add `#[Override]` to all intentional overrides; CI catches removals |
| Named arguments in public API | Renaming a parameter is now a breaking change | Treat param names as public API in libraries; use `@no-named-arguments` tag |
| Property hooks (`get`/`set`) with heavy logic | Property access triggers DB call or network; caller has no idea | Keep hooks lightweight (validation, formatting); heavy logic in explicit methods |
| `match` without default arm | `UnhandledMatchError` in production when new enum case added | Always include `default` arm or ensure exhaustive coverage via static analysis |
