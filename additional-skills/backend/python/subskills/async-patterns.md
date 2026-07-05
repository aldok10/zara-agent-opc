# Async Patterns

Advanced async Python: TaskGroup, asyncio internals, cancellation, event loops, semaphores, structured concurrency.

## TaskGroup (Python 3.11+)

```python
import asyncio

async def fetch_all(urls: list[str]) -> list[Response]:
    results: list[Response] = []
    async with asyncio.TaskGroup() as tg:
        for url in urls:
            tg.create_task(fetch_one(url, results))
    return results  # All tasks completed or all cancelled on first error
```

TaskGroup replaces `asyncio.gather()` -- provides structured concurrency. If any task raises, all others are cancelled and exceptions collected into `ExceptionGroup`.

## ExceptionGroup Handling

```python
async def resilient_fetch(urls: list[str]) -> list[Response | None]:
    results: dict[str, Response | None] = {url: None for url in urls}
    try:
        async with asyncio.TaskGroup() as tg:
            for url in urls:
                tg.create_task(_fetch_and_store(url, results))
    except* httpx.HTTPError as eg:
        for exc in eg.exceptions:
            logger.warning("fetch_failed", url=exc.request.url, status=exc.response.status_code)
    return list(results.values())
```

Use `except*` (3.11+) to handle specific exception types within an ExceptionGroup while letting others propagate.

## Semaphore for Concurrency Limiting

```python
async def fetch_with_limit(urls: list[str], max_concurrent: int = 10) -> list[Response]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(url: str) -> Response:
        async with semaphore:
            return await httpx.AsyncClient().get(url)

    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(bounded_fetch(url)) for url in urls]
    return [t.result() for t in tasks]
```

Always limit concurrent I/O -- unbounded fan-out kills upstream services and exhausts file descriptors.

## Cancellation and Timeouts

```python
async def with_timeout(coro, seconds: float):
    """Timeout with cleanup opportunity."""
    try:
        async with asyncio.timeout(seconds):
            return await coro
    except TimeoutError:
        logger.warning("operation_timed_out", timeout=seconds)
        raise

# Shield critical work from cancellation
async def process_payment(payment: Payment) -> Receipt:
    receipt = await asyncio.shield(payment_gateway.charge(payment))
    await notify_user(receipt)  # This CAN be cancelled
    return receipt
```

`asyncio.timeout()` (3.11+) replaces `wait_for()`. Use `shield()` sparingly -- only for operations that must not be interrupted (payments, commits).

## Async Generators

```python
from typing import AsyncGenerator

async def stream_records(query: str) -> AsyncGenerator[Record, None]:
    async with get_session() as session:
        result = await session.stream(select(RecordModel).where(...))
        async for row in result:
            yield Record.model_validate(row)
```

Async generators enable memory-efficient streaming. Always ensure cleanup with async context managers.

## Event Loop Internals

```python
# Run sync code without blocking the event loop
import asyncio
from functools import partial

async def cpu_bound_in_thread(data: bytes) -> str:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(heavy_computation, data))

# Custom executor for many blocking calls
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="io-worker")

async def blocking_io():
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(executor, sync_file_read)
```

Default executor is a ThreadPoolExecutor. For CPU-bound, consider ProcessPoolExecutor or free-threaded Python 3.13t.

## Queue-Based Producer/Consumer

```python
async def producer_consumer(items: list[str], workers: int = 5):
    queue: asyncio.Queue[str | None] = asyncio.Queue(maxsize=100)

    async def producer():
        for item in items:
            await queue.put(item)
        for _ in range(workers):
            await queue.put(None)  # Poison pill

    async def consumer():
        while True:
            item = await queue.get()
            if item is None:
                break
            await process(item)
            queue.task_done()

    async with asyncio.TaskGroup() as tg:
        tg.create_task(producer())
        for _ in range(workers):
            tg.create_task(consumer())
```

## Rules

1. Prefer `TaskGroup` over `gather()` -- structured cancellation by default
2. Always limit concurrency with `Semaphore` for external I/O
3. Use `asyncio.timeout()` not `wait_for()` (3.11+)
4. Never use `asyncio.sleep(0)` as a yield point -- restructure the code
5. Run blocking I/O in executor, CPU-bound in process executor or 3.13t
6. Handle `CancelledError` only to clean up, then re-raise
7. Async generators must clean up resources (use `async with` internally)
8. Never call `loop.run_until_complete()` from within an async context
