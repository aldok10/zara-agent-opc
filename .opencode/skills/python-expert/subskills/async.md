# Async Python

asyncio event loop is single-threaded, cooperative. I/O-bound → async. CPU-bound → multiprocessing. Blocking anything stalls every coroutine.

## Structured Concurrency (3.11+)

```python
async with asyncio.TaskGroup() as tg:
    t1 = tg.create_task(fetch(url1))
    t2 = tg.create_task(fetch(url2))
# all tasks awaited on exit; if one raises, siblings are cancelled
results = [t1.result(), t2.result()]
```

Prefer `TaskGroup` over bare `gather` — automatic cancellation and no orphaned tasks.

## ExceptionGroup

TaskGroup raises an `ExceptionGroup`. Handle with `except*`:

```python
try:
    async with asyncio.TaskGroup() as tg: ...
except* ValueError as eg:
    for exc in eg.exceptions: log(exc)
except* ConnectionError as eg:
    ...
```

## Timeouts (always)

```python
async with asyncio.timeout(5.0):      # 3.11+
    data = await client.get(url)
```

Every external call needs a timeout. No exceptions.

## Calling Sync Code

```python
result = await asyncio.to_thread(cpu_light_sync_fn, arg)
```

Offloads blocking sync calls to a thread pool. For true CPU work use `ProcessPoolExecutor`.

## Rate-Limiting & Queues

```python
sem = asyncio.Semaphore(10)           # bound concurrent connections
async def bounded(url):
    async with sem: return await client.get(url)
```

`asyncio.Queue` for in-process producer/consumer pipelines; use `queue.join()` + sentinels to signal completion.

## Library Choices

- HTTP: `httpx` (async) over `requests` (sync-only)
- Postgres: `asyncpg` over `psycopg2`
- Portable: `anyio` — one codebase runs on asyncio AND trio

## Anti-Patterns

- `time.sleep()` in a coroutine → use `await asyncio.sleep()`
- Sync I/O (open(), requests, sync DB) on the loop → blocks everything
- CPU-heavy loops in async → move to processes
- No timeouts on network calls → hangs forever
- Fire-and-forget `asyncio.create_task()` without keeping a reference → task GC'd or errors swallowed
- Mixing sync/async carelessly instead of `to_thread`/`run_in_executor`
