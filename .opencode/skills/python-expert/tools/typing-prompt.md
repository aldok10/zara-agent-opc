# Python Complex Type Design Prompt

You are helping design advanced type annotations for Python code. Focus on correctness, expressiveness, and compatibility with mypy/pyright.

## Input

**Goal:** {{describe the typing challenge}}
**Python version:** {{3.10 | 3.11 | 3.12 | 3.13}}
**Type checker:** {{mypy | pyright | both}}
**Context:** {{library API | internal code | protocol definition}}

## Type Design Patterns

### 1. Protocol Design (Structural Subtyping)

When to use: duck typing that needs static verification.

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Renderable(Protocol):
    def render(self, format: str = "html") -> str: ...

# Protocol with generic
class Repository(Protocol[T]):
    def get(self, id: str) -> T | None: ...
    def save(self, entity: T) -> T: ...
    def delete(self, id: str) -> bool: ...
```

Design checklist:
- [ ] Minimal method set (one responsibility per protocol)
- [ ] `@runtime_checkable` only if you need `isinstance()` checks
- [ ] Avoid properties in protocols (implementation burden)
- [ ] Consider `Protocol` intersection via multiple inheritance

### 2. Generic Constraints & TypeVar

```python
from typing import TypeVar, Generic

# Bounded TypeVar
T = TypeVar("T", bound="Comparable")

# Constrained TypeVar (must be exactly one of these)
Number = TypeVar("Number", int, float, Decimal)

# Covariant (output positions only)
T_co = TypeVar("T_co", covariant=True)

# Contravariant (input positions only)
T_contra = TypeVar("T_contra", contravariant=True)
```

Variance rules:
- **Covariant**: Container only produces T (e.g., `Iterable[T_co]`)
- **Contravariant**: Container only consumes T (e.g., `Callable[[T_contra], None]`)
- **Invariant**: Container both produces and consumes T (e.g., `list[T]`)

### 3. TypeVar with PEP 695 Syntax (3.12+)

```python
# New syntax (3.12+)
type Vector[T: (int, float)] = list[T]

def first[T](items: Sequence[T]) -> T: ...

class Stack[T]:
    def push(self, item: T) -> None: ...
    def pop(self) -> T: ...
```

### 4. Overloads

When to use: return type depends on input type/value.

```python
from typing import overload, Literal

@overload
def parse(data: str, *, as_json: Literal[True]) -> dict: ...
@overload
def parse(data: str, *, as_json: Literal[False] = ...) -> str: ...

def parse(data: str, *, as_json: bool = False) -> dict | str:
    ...
```

Guidelines:
- [ ] Overloads must be mutually exclusive
- [ ] Implementation signature covers all overloads
- [ ] Use `Literal` for value-dependent return types
- [ ] Prefer `@overload` over `Union` return when caller can determine type

### 5. Callable Types

```python
from typing import Callable, ParamSpec, Concatenate
from collections.abc import Awaitable

P = ParamSpec("P")
R = TypeVar("R")

# Decorator that preserves signature
def retry(fn: Callable[P, R]) -> Callable[P, R]: ...

# Add parameter to signature
def with_context(
    fn: Callable[Concatenate[Context, P], R]
) -> Callable[P, R]: ...

# Async callable
type AsyncHandler[T] = Callable[..., Awaitable[T]]
```

### 6. TypedDict & Advanced Mappings

```python
from typing import TypedDict, Required, NotRequired, Unpack

class Config(TypedDict, total=False):
    host: Required[str]
    port: NotRequired[int]
    debug: NotRequired[bool]

# Kwargs typing (3.12+)
class RequestOptions(TypedDict, total=False):
    timeout: float
    headers: dict[str, str]
    retry: int

def fetch(url: str, **kwargs: Unpack[RequestOptions]) -> Response: ...
```

### 7. Self Type & Recursive Types

```python
from typing import Self

class Builder:
    def with_name(self, name: str) -> Self:
        self.name = name
        return self

# Recursive type
type JSON = str | int | float | bool | None | list["JSON"] | dict[str, "JSON"]

# Tree structure
type Tree[T] = T | list["Tree[T]"]
```

## Design Process

1. **Identify the contract**: What does the consumer of this type need to know?
2. **Choose the mechanism**: Protocol vs ABC vs Generic vs Union
3. **Check variance**: Does the container produce, consume, or both?
4. **Verify with checker**: Run `mypy --strict` or `pyright --strict`
5. **Test edge cases**: Does it work with `None`? With subclasses? With mocks?

## Output Format

```
## Type Design

[annotated code with explanation]

## Rationale
- Why this approach over alternatives
- Variance justification
- Compatibility notes (version requirements, checker behavior differences)

## Verification
- mypy command and expected output
- Known limitations or workarounds
```

## Rules

- Prefer `collections.abc` over `typing` for container types (3.9+).
- Use `type` statement for type aliases in 3.12+ code.
- Never use `Any` without explicit justification.
- If mypy and pyright disagree, note both behaviors.
- Simpler types that work > clever types that confuse.
