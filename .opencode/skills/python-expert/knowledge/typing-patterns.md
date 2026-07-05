---
type: fact
title: "Typing Patterns in Python"
---
# Typing Patterns in Python

## Type Narrowing

### isinstance checks

```python
def process(value: str | int | None) -> str:
    if value is None:
        return "empty"
    if isinstance(value, int):
        # Type narrowed to int here
        return str(value * 2)
    # Type narrowed to str here
    return value.upper()
```

### TypeGuard (custom narrowing)

```python
from typing import TypeGuard

def is_string_list(val: list[object]) -> TypeGuard[list[str]]:
    return all(isinstance(x, str) for x in val)

def process(items: list[object]) -> None:
    if is_string_list(items):
        # items is list[str] here
        print(", ".join(items))
```

### TypeIs (3.13+ -- narrower and safer than TypeGuard)

```python
from typing import TypeIs

def is_positive(x: int | str) -> TypeIs[int]:
    return isinstance(x, int) and x > 0

def handle(val: int | str) -> None:
    if is_positive(val):
        # val is int here
        print(val + 1)
    else:
        # val is int | str here (not narrowed in else branch)
        pass
```

## Protocol Classes (Structural Subtyping)

Define interfaces by behavior, not inheritance:

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Serializable(Protocol):
    def to_dict(self) -> dict[str, object]: ...
    def from_dict(cls, data: dict[str, object]) -> "Serializable": ...

class User:
    def to_dict(self) -> dict[str, object]:
        return {"name": self.name}

    @classmethod
    def from_dict(cls, data: dict[str, object]) -> "User":
        return cls(name=str(data["name"]))

# User satisfies Serializable without inheriting from it
def save(obj: Serializable) -> None:
    data = obj.to_dict()
    ...
```

**Callable protocol for complex signatures:**

```python
class Handler(Protocol):
    def __call__(self, request: Request, *, timeout: float = ...) -> Response: ...

def register(path: str, handler: Handler) -> None: ...
```

## Generic Types

### New syntax (3.12+)

```python
class Repository[T]:
    def __init__(self, model_class: type[T]) -> None:
        self._model = model_class

    def get(self, id: int) -> T | None: ...
    def list(self) -> list[T]: ...
    def save(self, entity: T) -> T: ...

# Bounded generics
from collections.abc import Hashable

def dedupe[T: Hashable](items: list[T]) -> list[T]:
    seen: set[T] = set()
    result: list[T] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result
```

### Variance

```python
# Covariant: Producer[Cat] is subtype of Producer[Animal]
class Producer[T_co](Protocol):
    def produce(self) -> T_co: ...

# Contravariant: Consumer[Animal] is subtype of Consumer[Cat]
class Consumer[T_contra](Protocol):
    def consume(self, item: T_contra) -> None: ...
```

## Overload Decorator

Describe different return types based on input:

```python
from typing import overload, Literal

@overload
def fetch(url: str, raw: Literal[True]) -> bytes: ...
@overload
def fetch(url: str, raw: Literal[False] = ...) -> str: ...

def fetch(url: str, raw: bool = False) -> bytes | str:
    data = _download(url)
    if raw:
        return data
    return data.decode()

# Type checker knows:
reveal_type(fetch("http://x", raw=True))   # bytes
reveal_type(fetch("http://x", raw=False))  # str
reveal_type(fetch("http://x"))             # str
```

## Runtime Validation

### Pydantic v2

```python
from pydantic import BaseModel, Field, field_validator

class CreateUser(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str
    age: int = Field(ge=0, le=150)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email")
        return v.lower()

# Validates at construction
user = CreateUser(name="Alice", email="ALICE@example.com", age=30)
# user.email == "alice@example.com"
```

### beartype (minimal overhead decorator)

```python
from beartype import beartype

@beartype
def process(items: list[int], threshold: float) -> list[int]:
    return [x for x in items if x > threshold]

# Raises BeartypeCallHintParamViolation if wrong types passed
```

## Type Stubs and py.typed

**For your own library:**

```
my_package/
    __init__.py
    core.py
    py.typed          # Empty marker file -- declares inline types
```

**For third-party libraries without types:**

```
stubs/
    some_library/
        __init__.pyi
        module.pyi
```

```python
# module.pyi
def connect(host: str, port: int = ...) -> Connection: ...

class Connection:
    async def execute(self, query: str, *args: object) -> list[Row]: ...
    async def close(self) -> None: ...
```

**pyproject.toml configuration:**

```toml
[tool.mypy]
strict = true
plugins = ["pydantic.mypy"]

[[tool.mypy.overrides]]
module = "some_untyped_library.*"
ignore_missing_imports = true
```

## Useful Patterns

```python
# Self type (3.11+)
from typing import Self

class Builder:
    def with_name(self, name: str) -> Self:
        self._name = name
        return self

# Never type (for functions that don't return)
from typing import Never

def fail(msg: str) -> Never:
    raise RuntimeError(msg)

# ParamSpec (for decorators preserving signatures)
from typing import ParamSpec, Callable
P = ParamSpec("P")

def retry[T, **P](func: Callable[P, T]) -> Callable[P, T]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        ...
    return wrapper
```
