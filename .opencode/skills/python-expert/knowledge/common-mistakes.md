---
type: fact
title: "Python Common Mistakes - Production Lessons"
---

# Python Common Mistakes: Production Lessons

42 distinct mistakes compiled from production postmortems, official Python docs, and practitioner guides.

## Async / Event Loop

| Mistake | Impact | Fix |
|---------|--------|-----|
| Blocking I/O in async def (time.sleep, sync HTTP, file I/O) | Entire event loop freezes, all concurrent tasks stall | `await asyncio.sleep()`, aiofiles, `run_in_executor()` |
| CPU-bound work in coroutines | All tasks starved, throughput drops to zero | `ProcessPoolExecutor` via `run_in_executor` |
| Fire-and-forget `create_task` without tracking | Memory leak, silent failures, tasks GC'd mid-execution | Track in set, add `done_callback`, cancel on shutdown |
| Silent task failures (unawaited exceptions) | Errors vanish, data corruption goes undetected | Always await or use `TaskGroup` (3.11+) |
| Async queue producers outrunning consumers | Unbounded memory growth, eventual OOM | `asyncio.Queue(maxsize=N)` with backpressure |

## FastAPI / Web Framework

| Mistake | Impact | Fix |
|---------|--------|-----|
| Sync ORM in async def routes | DB query blocks event loop, throughput collapses | `async_engine` + `AsyncSession` or use `def` endpoint |
| Single Uvicorn worker, no process management | One crash = full outage, no fault tolerance | `gunicorn -k uvicorn.workers.UvicornWorker -w N` |
| No `--max-requests` worker recycling | Memory leaks accumulate indefinitely | Set `--max-requests` + `--max-requests-jitter` |
| Using `--reload` in production | File watcher overhead, instability | Remove in prod, use only in development |
| Heavy middleware on all routes | Latency added to health checks and simple endpoints | Scope middleware to specific routers |

## Memory & Performance

| Mistake | Impact | Fix |
|---------|--------|-----|
| Unbounded caches (`@lru_cache` without maxsize) | RSS grows until OOM kill | Explicit `maxsize`, use `TTLCache` for time-bound data |
| Global containers that grow (module-level lists/dicts) | Memory never released, RSS climbs over hours | `deque(maxlen=N)`, flush on schedule, or request-scoped |
| Closures capturing large objects | Objects pinned in memory far beyond intended lifetime | Extract only needed values into closure scope |
| Reference cycles with `__del__` | Objects become uncollectable by GC | `weakref.finalize()` instead of `__del__` |
| Logging handlers added per request, never removed | Handler list grows unbounded, file descriptor leak | Add handlers once at startup, configure in `logging.dictConfig` |

## Language Pitfalls

| Mistake | Impact | Fix |
|---------|--------|-----|
| Mutable default arguments (`def f(items=[])`) | State accumulates across calls silently | `None` sentinel: `def f(items=None): items = items or []` |
| Late binding closures in loops (`lambda: i`) | All closures reference final loop value | Default arg capture: `lambda i=i: i` |
| Using threading for CPU-bound work | Slower than single-threaded due to GIL contention | `multiprocessing` or `ProcessPoolExecutor` |

## Pandas & Data

| Mistake | Impact | Fix |
|---------|--------|-----|
| `iterrows()` / `apply(axis=1)` on large DataFrames | 1000-15000x slower than vectorized equivalents | Vectorized operations, `np.where`, `.map()` |
| Wrong dtypes (object for categoricals) | 50x memory bloat on categorical-like columns | `astype('category')`, downcast numerics |
| SettingWithCopyWarning / chained indexing | Silent no-op, assignment affects copy not original | `.loc[mask, 'col'] = val` always |
| Using Pandas for >5M rows | Single-threaded, memory-bound, painfully slow | Polars or DuckDB for analytical workloads |

## AI/ML Serving

| Mistake | Impact | Fix |
|---------|--------|-----|
| Loading model on every request | Multi-second latency, GPU memory thrashing | Load once at startup via lifespan handler |
| Tokenizer mismatch with model | Garbage output, hallucinations, silent accuracy loss | Same checkpoint, pin exact revision hash |
| No input validation on serving endpoint | Wrong tensor shapes crash worker, OOM on oversized input | Validate shape/length, enforce `max_length` cap |
| Unbounded batch sizes in inference | OOM on GPU under load spike | Max batch size + request queuing with backpressure |
| Training-serving skew (preprocessing differs) | Silent accuracy degradation in production | Version transforms with model artifact, monitor input distributions |

## Security

| Mistake | Impact | Fix |
|---------|--------|-----|
| Deserializing untrusted pickle | Remote Code Execution | `safetensors`, JSON, ONNX, protobuf |
| Pickle-based ML model from unknown sources | Supply-chain RCE via crafted pickle payload | `safetensors` format, verify checksums before loading |
| Using pickle for caching without signature | Cache poisoning leads to RCE | HMAC-signed serialization, or use JSON/msgpack |

## Dependency Management

| Mistake | Impact | Fix |
|---------|--------|-----|
| Unpinned dependency versions | Silent breakage, irreproducible builds across environments | Pin exact versions in lockfile (`uv.lock`, `poetry.lock`) |
| Mixing pip and conda in same environment | Resolver conflicts, silent package corruption | Use one package manager exclusively per environment |
| No separate dependency groups (dev/test/prod) | Production ships pytest, debuggers, linters | Poetry groups, pip extras, or `uv` dependency groups |

---

## Sources

1. Python Official Docs - asyncio: https://docs.python.org/3/library/asyncio-task.html
2. FastAPI Deployment Guide: https://fastapi.tiangolo.com/deployment/
3. Real Python - Common Gotchas: https://docs.python-guide.org/writing/gotchas/
4. Uvicorn Settings: https://www.uvicorn.org/settings/
5. Python Memory Management (CPython internals): https://docs.python.org/3/c-api/memory.html
6. OWASP Python Security: https://cheatsheetseries.owasp.org/cheatsheets/Python_Security_Cheat_Sheet.html
7. Pandas Performance Tips: https://pandas.pydata.org/docs/user_guide/enhancingperf.html
8. PyTorch Best Practices: https://pytorch.org/docs/stable/notes/cuda.html
9. Safetensors (Hugging Face): https://huggingface.co/docs/safetensors/
10. Python 3.12-3.14 What's New: https://docs.python.org/3/whatsnew/
