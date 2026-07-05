---
type: fact
title: "Modern Python (3.12-3.14)"
---
# Modern Python (3.12-3.14)

## Python 3.12 Key Features

### Type Parameter Syntax (PEP 695)

New syntax for generics -- cleaner than TypeVar:

```python
# Old way
from typing import TypeVar
T = TypeVar('T')
def first(items: list[T]) -> T: ...

# New way (3.12+)
def first[T](items: list[T]) -> T: ...

# Generic classes
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

# Type aliases
type Vector = list[float]
type Matrix[T] = list[list[T]]
```

### Improved f-strings

Nested quotes, backslashes, and comments now allowed in f-strings:

```python
# Nested quotes (3.12+)
msg = f"{'hello'}"
data = f"{some_dict['key']}"

# Backslashes
path = f"C:\\Users\\{name}"

# Multi-line expressions
result = f"{
    value
    if condition
    else default
}"
```

### Per-Interpreter GIL (PEP 684)

Each sub-interpreter gets its own GIL, enabling true parallelism
without multiprocessing overhead. Foundation for free-threading.

## Python 3.13 Key Features

### Free-Threaded Mode (PEP 703)

Experimental: run Python without the GIL.

```bash
# Build with free-threading support
python3.13t script.py

# Check at runtime
import sys
print(sys._is_gil_enabled())  # False in free-threaded mode
```

**Implications:**
- True parallelism for CPU-bound threads
- C extensions need updating for thread safety
- Performance may be slower for single-threaded code (5-10%)
- Use `threading` for parallel CPU work (previously only I/O benefited)

### Improved Error Messages

Better tracebacks with more context:

```python
# Shows the exact expression that failed
# NameError: name 'price' is not defined. Did you mean: 'prize'?
```

### Improved Interactive Interpreter

- Multi-line editing with history
- Colored output
- Paste mode that handles indentation
- Help and exit without parentheses

## Python 3.14 Key Features

### Deferred Evaluation of Annotations (PEP 649)

Annotations are no longer evaluated at function definition time:

```python
class Tree:
    # Works without quotes -- forward reference resolved lazily
    def children(self) -> list[Tree]:
        ...
```

### Template Strings (PEP 750)

Tagged strings for safe interpolation:

```python
from templatelib import Template

name = "world"
template = t"Hello {name}"  # Returns Template object, not str
# Enables custom processing before string creation
```

## Pattern Matching (3.10+, refined in 3.12+)

```python
match command:
    case {"action": "move", "direction": str(dir)}:
        move(dir)
    case {"action": "attack", "target": str(t)} if t in enemies:
        attack(t)
    case _:
        print("Unknown command")

# Class patterns
match event:
    case Click(button=Button.LEFT, position=Point(x, y)) if x > 0:
        handle_left_click(x, y)
    case KeyPress(key=Key.ESCAPE):
        quit()
```

## Exception Groups and TaskGroups

```python
import asyncio

async def main():
    async with asyncio.TaskGroup() as tg:
        tg.create_task(fetch_users())
        tg.create_task(fetch_orders())
        # If any task fails, all are cancelled
        # Exceptions collected in ExceptionGroup

# Handling exception groups
try:
    await main()
except* ValueError as eg:
    for e in eg.exceptions:
        print(f"Value error: {e}")
except* TypeError as eg:
    for e in eg.exceptions:
        print(f"Type error: {e}")
```

## Dataclasses Enhancements

```python
from dataclasses import dataclass, field

@dataclass(slots=True, frozen=True)
class Config:
    host: str = "localhost"
    port: int = 8080
    tags: list[str] = field(default_factory=list)

# KW-only fields (3.10+)
@dataclass
class Request:
    url: str
    method: str = "GET"
    _: dataclasses.KW_ONLY
    timeout: float = 30.0
    retries: int = 3
```

## TypedDict Enhancements

```python
from typing import TypedDict, Required, NotRequired

class UserCreate(TypedDict, total=False):
    name: Required[str]
    email: Required[str]
    bio: NotRequired[str]
    avatar_url: NotRequired[str]

# ReadOnly (3.13+)
from typing import ReadOnly

class Config(TypedDict):
    name: ReadOnly[str]
    debug: bool
```
