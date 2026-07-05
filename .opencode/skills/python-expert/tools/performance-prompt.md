# Python Performance Profiling & Optimization Prompt

You are helping identify and resolve Python performance bottlenecks. Follow a data-driven approach: measure first, optimize second.

## Input

**Problem:** {{slow endpoint | high memory | CPU bound | I/O bound | startup time}}
**Code/file:** {{path or snippet}}
**Python version:** {{version}}
**Runtime:** {{CPython | PyPy}}
**Scale:** {{requests/sec | data size | concurrency level}}
**Constraint:** {{latency target | memory limit | cost budget}}

## Profiling Toolkit

### CPU Profiling

```python
# Quick: cProfile (built-in)
python -m cProfile -s cumulative script.py

# Detailed: line_profiler
# @profile decorator on target functions
kernprof -l -v script.py

# Sampling (low overhead, production-safe)
py-spy record -o profile.svg -- python script.py

# Statistical
python -m scalene script.py
```

### Memory Profiling

```python
# Peak memory and allocations
python -m tracemalloc
# or
python -m memray run script.py
memray flamegraph output.bin

# Object-level inspection
import objgraph
objgraph.show_most_common_types(limit=20)
objgraph.show_growth()

# Per-line memory
# @profile decorator
python -m memory_profiler script.py
```

### I/O Profiling

```bash
# System calls
strace -c -e trace=network,file python script.py  # Linux
dtruss -c python script.py  # macOS

# Database query timing
# Enable query logging in ORM or use middleware
```

## Optimization Strategies (by bottleneck type)

### CPU-Bound

Priority order:
1. **Algorithm improvement** -- O(n^2) to O(n log n) beats any micro-optimization
2. **Built-in acceleration** -- `sum()`, `map()`, `itertools`, `collections`
3. **NumPy/vectorization** -- eliminate Python loops over numeric data
4. **Caching** -- `functools.lru_cache`, `functools.cache` (3.9+)
5. **C extensions** -- `cython`, `cffi`, or `ctypes` for hot loops
6. **Multiprocessing** -- `concurrent.futures.ProcessPoolExecutor`

```python
# Before: Python loop
total = 0
for x in data:
    total += x * x

# After: vectorized
import numpy as np
total = np.sum(np.array(data) ** 2)
```

### I/O-Bound

Priority order:
1. **Batch operations** -- single query > N queries
2. **Connection pooling** -- reuse DB/HTTP connections
3. **Async I/O** -- `asyncio` + `aiohttp`/`asyncpg` for concurrent I/O
4. **Caching** -- avoid repeated I/O for same data
5. **Threading** -- `concurrent.futures.ThreadPoolExecutor` for legacy sync libs

```python
# Before: sequential
results = [fetch(url) for url in urls]

# After: concurrent
async def fetch_all(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [session.get(url) for url in urls]
        return await asyncio.gather(*tasks)
```

### Memory-Bound

Priority order:
1. **Generators** -- `yield` instead of building full lists
2. **`__slots__`** -- reduce per-instance memory for many objects
3. **Data classes with slots** -- `@dataclass(slots=True)` (3.10+)
4. **Streaming** -- process chunks instead of loading entire files
5. **Object reuse** -- flyweight pattern, interning
6. **Compact structures** -- `array.array`, `struct`, `numpy` over lists

```python
# Before: 1M dicts in memory
users = [{"name": n, "age": a} for n, a in raw_data]

# After: slots dataclass
@dataclass(slots=True)
class User:
    name: str
    age: int
users = [User(n, a) for n, a in raw_data]
# ~40-60% less memory per instance
```

### Startup Time

1. **Lazy imports** -- defer heavy imports to first use
2. **Import profiling** -- `python -X importtime script.py`
3. **Compiled bytecode** -- ensure `.pyc` files exist
4. **Reduce dependencies** -- fewer imports = faster start
5. **Module-level computation** -- move to function scope

## Async vs Threading vs Multiprocessing

| Scenario | Solution | Why |
|----------|----------|-----|
| Many HTTP calls | `asyncio` + `aiohttp` | Single thread, no GIL issue, max concurrency |
| CPU-heavy computation | `multiprocessing` | Bypasses GIL, true parallelism |
| Legacy sync I/O library | `ThreadPoolExecutor` | Concurrent I/O without rewriting |
| Mixed CPU + I/O | `ProcessPool` + `asyncio` | Separate concerns |
| Web server handling | `uvicorn`/`gunicorn` workers | Battle-tested scaling |

## Optimization Process

1. **Baseline**: Measure current performance with realistic data
2. **Profile**: Identify the actual bottleneck (not the assumed one)
3. **Hypothesize**: What change would address this specific bottleneck?
4. **Implement**: Smallest change that tests the hypothesis
5. **Measure**: Compare against baseline with same data
6. **Validate**: Correctness preserved (run tests)
7. **Document**: Record the tradeoff made

## Output Format

```
## Bottleneck Identified
- Type: [CPU | I/O | Memory | Startup]
- Location: [file:line or function name]
- Evidence: [profiler output excerpt]
- Impact: [X% of total time/memory]

## Optimization Applied
- Technique: [name]
- Change: [diff or description]
- Tradeoff: [what was sacrificed -- readability, memory, complexity]

## Results
- Before: [metric]
- After: [metric]
- Improvement: [X% or Xms reduction]

## Further Opportunities
- [next bottleneck if more optimization needed]
```

## Rules

- Never optimize without profiling data. Intuition about bottlenecks is wrong 80% of the time.
- Readability > micro-optimization unless the profiler says otherwise.
- One change at a time -- measure each independently.
- If `asyncio` requires rewriting > 30% of the codebase, consider threads first.
- NumPy wins for numeric. For string/object processing, stick to Python or Cython.
- Production profiling needs low-overhead tools (py-spy, not cProfile).
