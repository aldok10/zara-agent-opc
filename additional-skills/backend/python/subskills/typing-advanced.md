---
type: subskill
title: "Advanced Typing"
---

# Advanced Typing

Complex type annotations: Generics, Protocols, TypeVar, overloads, TypeGuard, ParamSpec, Unpack, TypeVarTuple.

## Generics

```python
from typing import Generic, TypeVar

T = TypeVar("T")

class Repository(Generic[T]):
    def __init__(self, model_class: type[T]) -> None:
        self._model = model_class

    async def get(self, id: int) -> T | None: ...
    async def list(self, limit: int = 100) -> list[T]: ...
    async def create(self, entity: T) -> T: ...

# Usage - mypy infers Order for all methods
order_repo = Repository(Order)
order: Order | None = await order_repo.get(1)
```

## TypeVar with Bounds and Defaults (3.12+)

```python
from typing import TypeVar

# Bounded -- T must be subclass of BaseModel
ModelT = TypeVar("ModelT", bound=BaseModel)

# Default (3.13+) -- callers can omit the type parameter
T = TypeVar("T", default=str)

class Container(Generic[T]):
    def __init__(self, value: T) -> None:
        self.value = value

c = Container(42)    # Container[int]
c2 = Container()     # Container[str] via default -- requires 3.12+
```

## Protocols (Structural Typing)

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Sendable(Protocol):
    async def send(self, message: str) -> None: ...

class EmailSender:
    async def send(self, message: str) -> None:
        await self._smtp.send(message)

class SlackSender:
    async def send(self, message: str) -> None:
        await self._client.post(message)

async def notify(sender: Sendable, msg: str) -> None:
    await sender.send(msg)  # Both EmailSender and SlackSender satisfy this
```

Prefer Protocols over ABC for dependency boundaries. Use `@runtime_checkable` only when you need `isinstance()` checks.

## Overloads

```python
from typing import overload, Literal

@overload
async def get_user(id: int, *, raise_on_missing: Literal[True]) -> User: ...
@overload
async def get_user(id: int, *, raise_on_missing: Literal[False] = ...) -> User | None: ...

async def get_user(id: int, *, raise_on_missing: bool = False) -> User | None:
    user = await repo.get(id)
    if user is None and raise_on_missing:
        raise UserNotFound(id)
    return user
```

Overloads give callers precise return types based on argument values. Implementation signature is not visible to callers.

## TypeGuard and TypeIs

```python
from typing import TypeGuard, TypeIs

# TypeGuard -- narrows in if-branch only
def is_admin(user: User) -> TypeGuard[AdminUser]:
    return user.role == "admin"

# TypeIs (3.12+) -- narrows in both branches
def is_active(user: User) -> TypeIs[ActiveUser]:
    return user.status == "active"

def handle(user: User) -> None:
    if is_active(user):
        user.last_seen  # ActiveUser -- narrowed
    else:
        user.deactivated_at  # InactiveUser -- narrowed (TypeIs only)
```

## ParamSpec (Decorator Typing)

```python
from typing import ParamSpec, TypeVar, Callable, Awaitable
from functools import wraps

P = ParamSpec("P")
R = TypeVar("R")

def retry(attempts: int = 3) -> Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[R]]]:
    def decorator(func: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for i in range(attempts):
                try:
                    return await func(*args, **kwargs)
                except Exception:
                    if i == attempts - 1:
                        raise
            raise RuntimeError("unreachable")
        return wrapper
    return decorator

@retry(attempts=3)
async def fetch_data(url: str, timeout: float = 5.0) -> bytes: ...
# Callers see: (url: str, timeout: float = 5.0) -> bytes -- preserved!
```

## Unpack and TypedDict for **kwargs

```python
from typing import Unpack, TypedDict

class LogKwargs(TypedDict, total=False):
    level: str
    extra: dict[str, str]
    stack_info: bool

def log(message: str, **kwargs: Unpack[LogKwargs]) -> None:
    ...

log("hello", level="info")  # Type-checked kwargs
```

## assert_never for Exhaustive Matching

```python
from typing import assert_never, Literal

Status = Literal["pending", "active", "cancelled"]

def handle_status(status: Status) -> str:
    match status:
        case "pending": return "Waiting"
        case "active": return "Running"
        case "cancelled": return "Stopped"
        case _ as unreachable:
            assert_never(unreachable)  # Compile error if Status gains new values
```

## Rules

1. Use `Protocol` over ABC for dependency inversion at boundaries
2. Constrain TypeVars with `bound=` -- unbounded `TypeVar` loses type safety
3. Use `overload` when return type depends on argument values
4. `TypeGuard` for custom narrowing functions, `TypeIs` when both branches narrow
5. `ParamSpec` for decorators that preserve function signatures
6. `assert_never` in exhaustive match/case for forward compatibility
7. Avoid `cast()` -- it's a lie to the type checker. Restructure instead.
8. `type` statement (3.12+) for complex type aliases: `type Vector = list[float]`
