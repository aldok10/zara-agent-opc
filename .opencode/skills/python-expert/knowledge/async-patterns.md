---
type: fact
title: "Async Patterns in Python"
---
# Async Patterns in Python

## asyncio Event Loop and Coroutines

```python
import asyncio

async def fetch_data(url: str) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

async def main():
    data = await fetch_data("https://api.example.com/users")
    return data

# Entry point
asyncio.run(main())
```

**Key concepts:**
- `async def` creates a coroutine function
- `await` suspends execution until the awaitable completes
- `asyncio.run()` creates and manages the event loop
- Only one coroutine runs at a time per thread (cooperative multitasking)

## Structured Concurrency with TaskGroup

Preferred over `gather` since Python 3.11 -- proper cancellation and error handling.

```python
async def process_batch(items: list[str]) -> list[Result]:
    results: list[Result] = []

    async with asyncio.TaskGroup() as tg:
        tasks = [
            tg.create_task(process_item(item))
            for item in items
        ]

    # All tasks complete here (or all cancelled on first failure)
    return [t.result() for t in tasks]
```

**TaskGroup guarantees:**
- If any task raises, all other tasks are cancelled
- All exceptions collected into ExceptionGroup
- No orphaned tasks possible
- Replaces the need for manual try/finally cleanup

## AnyIO for Framework-Agnostic Async

Write code that works with both asyncio and Trio:

```python
import anyio

async def fetch_all(urls: list[str]) -> list[bytes]:
    results: list[bytes] = []

    async with anyio.create_task_group() as tg:
        async def fetch_one(url: str) -> None:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url)
                results.append(resp.content)

        for url in urls:
            tg.start_soon(fetch_one, url)

    return results

# Works with any backend
anyio.run(fetch_all, urls)
```

## Common Patterns

### Semaphore (concurrency limiting)

```python
async def fetch_with_limit(urls: list[str], max_concurrent: int = 10):
    semaphore = asyncio.Semaphore(max_concurrent)

    async def limited_fetch(url: str) -> bytes:
        async with semaphore:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url)
                return resp.content

    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(limited_fetch(url)) for url in urls]

    return [t.result() for t in tasks]
```

### Timeout

```python
async def fetch_with_timeout(url: str, timeout: float = 5.0):
    try:
        async with asyncio.timeout(timeout):
            async with httpx.AsyncClient() as client:
                return await client.get(url)
    except TimeoutError:
        return None
```

### Producer-Consumer with Queue

```python
async def producer(queue: asyncio.Queue[str], items: list[str]):
    for item in items:
        await queue.put(item)
    await queue.put(None)  # Sentinel

async def consumer(queue: asyncio.Queue[str]):
    while True:
        item = await queue.get()
        if item is None:
            break
        await process(item)
        queue.task_done()

async def pipeline(items: list[str], num_workers: int = 4):
    queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)

    async with asyncio.TaskGroup() as tg:
        tg.create_task(producer(queue, items))
        for _ in range(num_workers):
            tg.create_task(consumer(queue))
```

## Error Handling in Async Code

```python
async def resilient_fetch(url: str, retries: int = 3) -> bytes | None:
    for attempt in range(retries):
        try:
            async with asyncio.timeout(10):
                async with httpx.AsyncClient() as client:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    return resp.content
        except (httpx.HTTPStatusError, TimeoutError) as e:
            if attempt == retries - 1:
                logger.error(f"Failed after {retries} attempts: {url}")
                return None
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
    return None
```

**Exception handling with TaskGroups:**

```python
try:
    async with asyncio.TaskGroup() as tg:
        tg.create_task(risky_operation_a())
        tg.create_task(risky_operation_b())
except* ValueError as eg:
    for exc in eg.exceptions:
        logger.warning(f"Value error: {exc}")
except* ConnectionError as eg:
    for exc in eg.exceptions:
        logger.error(f"Connection failed: {exc}")
```

## When to Use Async vs Threading vs Multiprocessing

**Use asyncio when:**
- I/O-bound work (HTTP requests, database queries, file I/O)
- Many concurrent connections (web servers, chat)
- You control the code (can make it async end-to-end)
- You need thousands of concurrent operations

**Use threading when:**
- Calling blocking libraries that can't be made async
- Simple parallelism with shared state
- CPU-bound work in free-threaded Python (3.13t+)
- Few concurrent operations (<100)

**Use multiprocessing when:**
- CPU-bound work (data processing, computation)
- Need true parallelism on GIL-enabled Python
- Memory isolation is acceptable or desired
- Tasks are independent (no shared mutable state)

**Hybrid approaches:**
```python
# Run blocking code in a thread pool from async context
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

async def run_blocking(func, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, func, *args)
```
