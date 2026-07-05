---
type: tool
title: "Python Code Review"
---

# Python Code Review

## Purpose

Review Python code for correctness, type safety, and idiomatic patterns. Focuses on typing discipline, async usage, packaging standards, and performance for production services.

## When to Use

- Reviewing FastAPI/Django/Flask services or CLI tools
- Evaluating async patterns and concurrency (asyncio, threading)
- Checking type annotation coverage and correctness
- Reviewing packaging (pyproject.toml, dependency management)

## Prompt Template

```
CONTEXT:
- Python version: [3.12 | 3.13 | 3.14]
- Framework: [FastAPI | Django | Flask | none]
- Code to review: [paste code or file path]
- Type checker: [mypy | pyright | none]
- Package manager: [uv | pip | poetry | pdm]

REVIEW AGAINST:
1. Type annotations: full coverage on public API, use generics,
   Protocol for structural typing, TypeAlias/TypeVar properly
2. Async: proper await usage, no sync calls in async context,
   asyncio.gather for concurrent operations, TaskGroup for structured concurrency
3. Error handling: specific exceptions (not bare except),
   exception chaining (from e), context managers for resource cleanup
4. Data modeling: Pydantic for external data, dataclasses for internal,
   slots=True for performance, frozen for immutability
5. Performance: generator expressions for large sequences, __slots__,
   avoid global mutable state, lru_cache/functools.cache appropriately
6. Security: parameterized queries, no pickle from untrusted,
   input validation at boundaries, secrets module for tokens
7. Packaging: pyproject.toml, pinned dependencies, proper extras,
   src layout, __all__ for public API
8. Testing: pytest idioms, fixtures over setup/teardown,
   parametrize for variants, proper async test support

IDENTIFY:
- Type: Any usage hiding bugs
- Mutable default arguments
- Resource leaks (unclosed files/connections)
- Blocking calls in async functions
- Import cycles
- Global mutable state
- Missing __init__.py or incorrect relative imports
```

## Output Format

```
## Python Review: [module/file name]

### Summary
[1-2 sentence verdict]

### Issues
| # | Category | Severity | Line/Area | Description | Fix |
|---|----------|----------|-----------|-------------|-----|
| 1 | ...      | ...      | ...       | ...         | ... |

### Type Safety
- [Coverage: full/partial/none]
- [Checker compatibility: mypy strict/basic]

### Positive Patterns
- [What follows Python best practices]

### Suggested Changes
1. [Specific improvement with code snippet]
2. ...
```
