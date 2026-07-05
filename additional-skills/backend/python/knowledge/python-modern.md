---
type: fact
title: "Python 3.11-3.13 Features"
---

# Python 3.11-3.13 Features

Key features across recent Python versions relevant to backend development.

## Python 3.11

### ExceptionGroup and except*

```python
# Raise multiple exceptions together
def validate_fields(data: dict) -> None:
    errors: list[ValueError] = []
    if not data.get("name"):
        errors.append(ValueError("name required"))
    if not data.get("email"):
        errors.append(ValueError("email required"))
    if errors:
        raise ExceptionGroup("validation failed", errors)

# Handle specific types from a group
try:
    validate_fields({})
except* ValueError as eg:
    for e in eg.exceptions:
        print(e)
```

### TaskGroup (Structured Concurrency)

```python
async with asyncio.TaskGroup() as tg:
    task1 = tg.create_task(fetch_users())
    task2 = tg.create_task(fetch_orders())
# Both complete or both cancelled -- no orphaned tasks
```

### tomllib (stdlib TOML)

```python
import tomllib
from pathlib import Path

config = tomllib.loads(Path("config.toml").read_text())
```

Read-only. For writing TOML, use `tomli-w`.

### Performance: 10-60% faster

CPython 3.11 introduced specializing adaptive interpreter -- significant speedup with zero code changes.

## Python 3.12

### Type Parameter Syntax

```python
# Old
from typing import TypeVar
T = TypeVar("T", bound=int)
def add(a: T, b: T) -> T: ...

# New (3.12+)
def add[T: int](a: T, b: T) -> T: ...

# Type aliases
type Vector = list[float]
type Handler[T] = Callable[[T], Awaitable[None]]
```

### f-string Improvements

```python
# Nested quotes, backslashes, comments now allowed
msg = f"Hello {name!r}, you have {len(items):,} items"
data = f"{json.dumps({'key': value})}"  # Nested quotes work
```

### Per-Interpreter GIL (subinterpreters)

```python
import interpreters  # Still evolving API
# Each subinterpreter has its own GIL -- true parallelism for CPU-bound
```

Experimental in 3.12. More practical in 3.13+.

## Python 3.13

### Free-Threaded Mode (3.13t)

```bash
# Install free-threaded build
uv python install 3.13t

# Run without GIL
python3.13t -X nogil script.py
```

True multi-threaded parallelism. Libraries must declare `Py_mod_gil` support. Many C extensions still incompatible.

### TypeVar Defaults

```python
from typing import TypeVar

T = TypeVar("T", default=str)

class Container[T = str]:  # Default type parameter
    def __init__(self, value: T) -> None:
        self.value = value

c = Container()  # Container[str] inferred
```

### Improved Error Messages

```python
# Better suggestions for typos, missing imports, attribute errors
# NameError: did you mean 'datetime'? Did you forget to import?
```

### Deprecation of Legacy APIs

- `asyncio.get_event_loop()` without running loop raises DeprecationWarning
- Use `asyncio.get_running_loop()` or `asyncio.run()`

### REPL Improvements

- Multi-line editing with history
- Color output
- Better paste support

## Migration Checklist

When upgrading Python version:

1. Update `.python-version` and `requires-python` in pyproject.toml
2. Run `uv lock` to re-resolve dependencies
3. Check `ruff` for new rules available
4. Update mypy version (type system features need matching mypy)
5. Test with `mypy --strict` -- new versions catch more issues
6. For 3.13t: audit C extensions for GIL-free compatibility

## Rules

1. Target 3.13 for new projects -- stable, fast, great typing
2. Use `TaskGroup` over `gather()` (3.11+)
3. Use `type` statement for aliases (3.12+)
4. Use type parameter syntax `def f[T](x: T)` (3.12+) for new code
5. 3.13t (free-threaded) only for CPU-bound after verifying library support
6. `tomllib` from stdlib -- no third-party TOML reader needed
7. `ExceptionGroup` for collecting multiple validation errors
