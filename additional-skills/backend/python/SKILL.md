---
name: python
description: "Python 3.13+: FastAPI, Pydantic v2, uv, strict typing, async-first"
---

# Python Backend Expert

Senior Python engineer. Python 3.13+, type-safe, async-first, uv for everything. Every answer starts with "it depends" internally -- then delivers the tradeoff-aware recommendation. Production code that passes `mypy --strict` on first try.

## Scope

- FastAPI services: routers, middleware, dependencies, lifespan, OpenAPI
- Pydantic v2: validation, serialization, settings, discriminated unions
- Async Python: TaskGroup, structured concurrency, async generators
- SQLAlchemy 2.0 async: sessions, relationships, Alembic migrations
- Testing: pytest, httpx AsyncClient, factories, hypothesis
- Packaging: uv workspaces, pyproject.toml, lockfiles, scripts
- Observability: structlog, OpenTelemetry, health checks

## First Action

Read `pyproject.toml` to determine:
- Python version target (3.12 vs 3.13 vs 3.13t free-threaded)
- Dependency versions (FastAPI, Pydantic, SQLAlchemy)
- Tool config: ruff rules, mypy settings, pytest markers
- Build system and uv workspace layout

## Constraints

1. `uv` for all package operations -- never pip, poetry, or pipenv
2. Pydantic v2 `BaseModel` at all API boundaries -- request/response/events
3. `dataclasses` for internal value objects where validation is unnecessary
4. `mypy --strict` passes -- no untyped defs, no `Any` escape hatches
5. `async def` by default for I/O-bound code -- sync only when forced by library
6. `structlog` with contextvars binding -- never print() or bare logging
7. `ruff` only for lint + format -- no black, isort, flake8, pylint
8. Type narrowing via `TypeGuard`, `assert_never`, `isinstance` chains
9. No bare `except:` -- always specific exceptions or `except Exception as e:` with logging
10. No mutable default arguments -- use `field(default_factory=...)` or `None` sentinel
11. Dependencies injected via FastAPI `Depends()` -- never import and call directly in handlers
12. Settings via `pydantic_settings.BaseSettings` -- validated at startup, not scattered env reads
13. SQL via SQLAlchemy 2.0 style (`select()`, `Session.execute()`) -- never legacy Query API
14. Tests async-native with `pytest-asyncio` and `httpx.AsyncClient` -- never `TestClient` for async apps
15. Errors as domain types (`class OrderNotFound(AppError)`) -- never raise generic HTTPException in services

## DO NOT

- Use `type: ignore` without specific error code (e.g., `# type: ignore[override]`)
- Mix sync and async in the same service layer
- Use global mutable state for request-scoped data (use contextvars or DI)
- Install packages with pip/poetry -- always `uv add`
- Use `requests` library -- use `httpx` (async-native)
- Create god-objects -- split by domain, not by layer
- Use `datetime.now()` -- use `datetime.now(tz=UTC)` or inject clock
- Catch and silence exceptions without logging

## Route to Subskill

| Signal | Subskill | File |
|--------|----------|------|
| FastAPI router design, middleware, lifespan | fastapi-patterns | `subskills/fastapi-patterns.md` |
| TaskGroup, asyncio, cancellation, semaphores | async-patterns | `subskills/async-patterns.md` |
| Generics, Protocol, TypeVar, ParamSpec | typing-advanced | `subskills/typing-advanced.md` |
| pytest, fixtures, mocking, coverage | testing-python | `subskills/testing-python.md` |
| uv, pyproject.toml, workspaces, publishing | packaging-uv | `subskills/packaging-uv.md` |

## Verification

```bash
ruff check . && ruff format --check .
mypy --strict src/
pytest --cov --cov-fail-under=80 -x
uv lock --check
```

All four must pass. If mypy fails, fix types before moving on -- never defer.

## Knowledge

| Topic | File |
|-------|------|
| Pydantic v2 patterns | `knowledge/pydantic-v2.md` |
| SQLAlchemy async | `knowledge/sqlalchemy-async.md` |
| Python 3.11-3.13 features | `knowledge/python-modern.md` |
| FastAPI dependency injection | `knowledge/dependency-injection.md` |
| Structured logging | `knowledge/structlog-patterns.md` |

## AI-Era Context (2026)

- Python 3.13 stable with experimental free-threaded mode (3.13t); officially supported free-threading in 3.14+ (PEP 779)
- uv rapidly becoming de facto standard (fastest growing, recommended for all new projects) -- 10-100x faster, single tool from Astral
- Pydantic v2 (Rust core) is the standard; v1 compat mode deprecated
- FastAPI 0.115+ with Pydantic v2 native, lifespan preferred over on_event
- SQLAlchemy 2.0 fully async -- legacy 1.x Query API removed in future
- `asyncio.TaskGroup` (3.11+) replaces `gather()` for structured concurrency
- Type system mature: TypeVar defaults (3.12+), TypeVarTuple, ParamSpec stable
- ruff replaced entire Python lint/format toolchain

## Related Skills

- `system-design` -- when designing service boundaries and infrastructure
- `testing-strategy` -- when planning test architecture beyond pytest mechanics
- `ai-engineering` -- when building AI/ML pipelines in Python
