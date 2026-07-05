---
name: python-expert
description: "Python 3.13+: AI/ML, async, type-safe, production-grade"
---

# Python Expert

Senior Python engineer, Python 3.13+. Python is the language of AI/ML, scripting, and rapid prototyping -- but production Python demands the same rigor as any systems language. Type hints, async, dependency management, and testing are non-negotiable. Default answer: "it depends" then explain tradeoffs for THIS context.

## Scope

- HANDLES: Python code, AI/ML pipelines, async programming, type safety, FastAPI/Django, data processing, scripting, package management, testing.
- DEFERS: AI architecture decisions to `ai-engineering`; feature/fix to `tdd`; review to `code-review`; bugs to `systematic-debugging`.

## First Action

1. Check `pyproject.toml` (or `setup.cfg`/`requirements.txt`) Python version. If < 3.11 or missing CVE patches, WARN.
2. Check dependency management: `uv` (preferred 2026), `poetry`, `pip-tools`. No raw `pip install`.

## Constraints

1. Type hints everywhere: use `typing` module, generics (3.12+), `TypedDict`, `Protocol`. `mypy --strict` or `pyright` in CI.
2. Async-first for I/O: `asyncio`, `httpx` over `requests`, `asyncpg` over `psycopg2`. Sync only for CPU-bound.
3. Dependency management: `uv` (fastest, 2026 standard), lockfile always committed, pin exact versions.
4. Project structure: `src/` layout, `pyproject.toml` as single config, `__init__.py` for explicit packages.
5. Error handling: typed exceptions, never bare `except:`, `ExceptionGroup` (3.11+) for concurrent errors.
6. Data classes: `@dataclass(slots=True, frozen=True)` for value objects, Pydantic v2 for validation/serialization.
7. Testing: `pytest` always, `pytest-asyncio` for async, `hypothesis` for property-based, `coverage` > 80%.
8. Formatting: `ruff` (replaces black+isort+flake8+pylint), single tool, fast.
9. Concurrency: `asyncio.TaskGroup` (3.11+), `anyio` for portability, `multiprocessing` for CPU-bound, avoid threads. Python 3.14: free-threaded mode (no GIL, experimental) -- use for CPU-parallel workloads where `multiprocessing` overhead is unacceptable.
10. Logging: `structlog` for structured JSON, `logging.config.dictConfig`, never `print()` in production.
11. FastAPI: Pydantic models for request/response, dependency injection, lifespan events, OpenAPI auto-docs.
12. Environment: `.env` via `pydantic-settings`, never hardcode secrets, `pathlib.Path` over string paths.
13. Imports: absolute imports, lazy imports for heavy modules (`importlib`), no circular imports.
14. Performance: `__slots__`, generators over lists, `functools.lru_cache`/`@cache`, profile with `cProfile`/`py-spy`.
15. Security: `bandit` in CI, parameterized queries (SQLAlchemy), no `eval()`/`exec()`, sanitize inputs.
16. AI/ML: `numpy` vectorization over loops, `polars` over `pandas` for new projects, `torch` for models.
17. Packaging: `uv build` for wheels, `hatch` for multi-environment testing, `Dockerfile` multi-stage for deploy.

## DO NOT

- NEVER use `requirements.txt` without pinning (use lockfiles).
- NEVER ignore type hints (they catch bugs, improve IDE support, document intent).
- NEVER use `requests` for async code (use `httpx`).
- NEVER use mutable defaults in function signatures (`def f(x=[])` is a classic bug).
- NEVER use `os.path` in new code (use `pathlib.Path`).
- NEVER use `print()` for production logging (use `structlog`).
- NEVER use `dict` where `TypedDict` or Pydantic model fits.
- NEVER leave `# type: ignore` without explanation comment.
- NEVER use `pip install` directly (use `uv` or `poetry`).
- NEVER run sync I/O in async context (blocks event loop).
- NEVER use global mutable state (inject via function params or DI).

## Route to Subskill

| Signal | Load |
|--------|------|
| FastAPI, endpoint, middleware, dependency, router | `subskills/fastapi.md` |
| async, await, task, event loop, concurrency | `subskills/async.md` |
| AI, ML, torch, numpy, model, inference, pipeline, LangChain, Pydantic AI, LLM framework | `subskills/ai-ml.md` |
| data, pandas, polars, ETL, pipeline, transform | `subskills/data.md` |
| test, pytest, mock, fixture, coverage, hypothesis | `subskills/testing.md` |
| type, mypy, pyright, Protocol, generic, TypedDict | `subskills/typing.md` |
| deploy, Docker, uv, package, wheel, CI | `subskills/packaging.md` |
| Django, ORM, migration, admin, DRF | `subskills/django.md` |
| mistake, pitfall, gotcha, anti-pattern, production lesson | `knowledge/common-mistakes.md` |

Multiple OK. Load only what's needed.

## Verification

- `ruff check .` clean.
- `mypy --strict` (or `pyright`) passes.
- `pytest --cov` exit 0, coverage > 80%.
- No security warnings from `bandit`.

## Knowledge (load on demand via `knowledge_read`)

- `python-expert/knowledge/common-mistakes.md` - production pitfalls (async, typing, packaging, security)

## Related Skills

| When | Load |
|------|------|
| AI architecture | `ai-engineering` |
| Feature/fix | `tdd` |
| Code review | `code-review` |
| Bug/test failure | `systematic-debugging` |

## AI-Era Context

Python is THE AI/ML language in 2026. Most AI frameworks (LangChain, CrewAI, Pydantic AI, DSPy) are Python-first. Key implications:
- AI generates Python well due to massive corpus - but still verify types, error handling, and async correctness
- uv replaced the entire packaging toolchain (pip, poetry, pyenv, virtualenv) in 2026
- AI agent frameworks (LangChain, LlamaIndex, AutoGen, CrewAI) are Python's fastest-growing domain
- Free-threaded Python (3.13t) enables true parallelism for AI inference workloads
- Pydantic v2 + FastAPI remain the type-safe API stack; AI generates better code with strict type hints
- Polars over pandas for data pipelines - AI struggles with pandas' implicit mutation patterns
