---
type: fact
title: "PHP & Swoole Common Mistakes - Production Lessons"
---

# PHP & Swoole Common Mistakes: Production Lessons

## Type System & strict_types

| Mistake | Impact | Fix |
|---------|--------|-----|
| Not using `declare(strict_types=1)` | Silent type coercion causes logic bugs | Add to every file |
| `strict_types` only applies to declaring file | Functions in other files still coerce | Add declaration to every file |
| int passes float param even in strict mode | One exception to strict mode | Explicit check if needed |
| Array string keys auto-cast ("1" becomes int 1) | Key collisions | PHPStan + explicit handling |
| Loose comparison (`0 == "foo"` true in <8.0) | Authentication bypass | Always `===` |
| Stringable objects rejected by string type in strict | TypeError unexpected | Cast explicitly |

## Memory & Long-Running (Swoole/Octane/RoadRunner)

| Mistake | Impact | Fix |
|---------|--------|-----|
| Singleton state persists between requests | User data leaks between requests | Reset in `RequestTerminated` |
| Static property contamination | Privilege escalation | Never store per-request state in statics |
| `$_SESSION` not cleared (FrankenPHP CVE-2026-24894) | Session leakage | Upgrade + `session_start()` |
| Growing static arrays | OOM over time | Bounded caches with eviction |
| Timer not cleared on worker exit | Resource leak | `Timer::clear()` in `onWorkerStop` |
| Event listener accumulation per-request | Unbounded growth | Register only in `WorkerStart` |
| Query log enabled in production Octane | Memory explosion | `DB::disableQueryLog()` |
| Telescope/debugbar in Octane production | Massive leak | Disable or limit entries |
| `Model::all()` in workers | Permanent memory spike | Chunking/generators |
| Doctrine identity map growing | All entities retained | `detach()` after processing |

## Connection Pool & Database

| Mistake | Impact | Fix |
|---------|--------|-----|
| Connection pool exhaustion | Coroutines block/timeout | Size pool = max concurrent; add timeout |
| Double-return connection to pool | Deadlock | Track borrowed state |
| Shared PDO across coroutines | Corrupted results/transactions | One connection per coroutine |
| MySQL gone away on idle | Next query fails | Health-check ping; idle timeout |
| Socket timeout with `SWOOLE_HOOK_ALL` | phpredis timeout | Set `default_socket_timeout = -1` |

## Coroutine Traps

| Mistake | Impact | Fix |
|---------|--------|-----|
| All coroutines asleep (blocking I/O) | Fatal error deadlock | `SWOOLE_HOOK_ALL`; never blocking `sleep()` |
| Traditional locks inside coroutines | Entire worker stalls | Use `Co\Lock` or `Co\Channel` |
| Coroutine context not propagated to children | Undefined data | Traverse with `Co::getPcid()` or pass explicitly |
| CPU-bound work in coroutine worker | All coroutines starved | Offload to TaskWorker |

## N+1 & Eloquent

| Mistake | Impact | Fix |
|---------|--------|-----|
| N+1 query problem | Hundreds of queries | Eager loading `with()`; `preventLazyLoading()` |
| Queries in loop | DB overload | Batch `WHERE IN` |
| Loading all columns | Wasted bandwidth | `select()` specific columns |
| Loading relations when only count needed | Unnecessary hydration | `withCount()` |
| Chaining without null check (`$project->user->name`) | Fatal on null | `?->` operator |

## Security

| Mistake | Impact | Fix |
|---------|--------|-----|
| `unserialize()` user input | RCE | `json_decode()` |
| SQL injection from string concat | Full DB compromise | Prepared statements |
| Missing `htmlspecialchars` | XSS | `{{ }}` in Blade; `htmlspecialchars()` raw |
| Mass assignment without `$fillable` | Attacker sets `role=admin` | Explicit allowlist |

## Production Operations

| Mistake | Impact | Fix |
|---------|--------|-----|
| OPcache `validate_timestamps=1` in prod | File stat overhead | Set to 0, restart on deploy |
| Not caching config/routes in Laravel | Runtime parsing | `config:cache`, `route:cache` post-deploy |
| `sync` queue driver in production | All work blocks request | Redis/SQS driver |
| Dangling array reference after foreach | Silent data corruption | `unset($value)` after loop |
| FrankenPHP/RoadRunner: OPcache not enabled for CLI | No bytecode cache | `opcache.enable_cli=1` |
| Alpine Docker with RoadRunner | musl incompatibility | Debian-based images |

## References

- [Toptal: 10 Most Common Mistakes PHP Developers Make](https://www.toptal.com/php/10-most-common-mistakes-php-programmers-make)
- [OpenSwoole Documentation: Coroutines & Connection Pools](https://openswoole.com/docs)
- [Swoole GitHub Issues: Memory leaks & coroutine deadlocks](https://github.com/swoole/swoole-src/issues)
- [Laravel Octane Documentation: Memory leaks & state management](https://laravel.com/docs/octane)
- [FrankenPHP CVE-2026-24894: Session data leakage advisory](https://github.com/dunglas/frankenphp/security/advisories)
