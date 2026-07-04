# Typing

Type hints = documentation + bug prevention + IDE autocomplete. Not optional in 2026.

## Collections

- `list[int]`, `dict[str, int]`, `set[str]` — builtin generics, no `typing.List`.
- `tuple[int, str]` fixed-length; `tuple[int, ...]` variable-length homogeneous.
- `Sequence`/`Mapping`/`Iterable` from `collections.abc` for read-only params (accept more).

## Optional & unions

- `str | None` (3.10+) preferred over `Optional[str]`.
- `int | str` over `Union[int, str]`.

## Structured types

- `TypedDict` for dicts with known keys (API payloads, config):

```python
class User(TypedDict):
    id: int
    name: str
    email: NotRequired[str]  # optional key
```

- `Protocol` = structural typing, Go-style interfaces, no inheritance:

```python
class Reader(Protocol):
    def read(self, n: int) -> bytes: ...
# any object with matching read() satisfies Reader
```

## Generics (3.12+ syntax)

```python
def first[T](items: list[T]) -> T:
    return items[0]

class Box[T]:
    def __init__(self, value: T) -> None:
        self.value = value
```

## Narrowing helpers

- `Literal["asc", "desc"]` for fixed string sets — catches typos at check time.
- `TypeGuard` / `TypeIs` (3.13) for custom narrowing functions.

## Domain patterns

- `NewType("UserId", int)` prevents mixing raw ints with domain IDs.
- Result type (`T | Error`) to make failure explicit instead of exceptions everywhere.

## Checkers

- `mypy --strict` or `pyright` — run in CI, fail the build on errors.
- Types are compile-time only. Use Pydantic for runtime validation at I/O boundaries.

## Anti-patterns

- `Any` everywhere — disables all checking silently.
- `# type: ignore` without a reason comment — hides real bugs.
- No type checker in CI — hints drift out of sync with code.
- Trusting hints for runtime safety — validate external data explicitly.
