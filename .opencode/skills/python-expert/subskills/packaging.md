---
type: subskill
title: "Packaging & Deployment"
---

# Packaging & Deployment

## pyproject.toml

Single source of config (PEP 621)  --  metadata, deps, tool config all in one file. No `setup.py`.

```toml
[project]
name = "myapp"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["httpx>=0.27", "pydantic>=2.7"]
```

## uv (2026 standard)

- Fastest resolver/installer; replaces pip + poetry + virtualenv + pyenv.
- `uv sync` installs from lockfile; `uv add <pkg>` adds + updates lock; `uv run` runs in env.
- `uv lock` regenerates the lockfile  --  commit `uv.lock` ALWAYS.

## Layout

`src/` layout prevents accidental imports of uninstalled code and forces testing the installed package.

```
myapp/
  src/myapp/__init__.py
  tests/
  pyproject.toml
  uv.lock
```

## Docker multi-stage

```dockerfile
FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.12-slim AS runtime
RUN useradd -m app
COPY --from=builder /app/.venv /app/.venv
COPY src /app/src
USER app
ENV PATH="/app/.venv/bin:$PATH"
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["python", "-m", "myapp"]
```

- Non-root user, `.dockerignore` (exclude `.venv`, `.git`, tests), minimal slim base.
- Copy lock + deps before source for layer caching.

## Config

- `pydantic-settings` for typed env config; `.env` for dev, Vault/secrets-manager for prod.
- Never hardcode secrets  --  read from env at startup, validate presence.

## CI pipeline

```bash
ruff check && ruff format --check
mypy --strict src
pytest --cov --cov-fail-under=80
bandit -r src
uv build
```

## Versioning

- Semver; tag releases (`git tag v0.1.0`); changelog per release.

## Anti-patterns

- No lockfile  --  non-reproducible builds.
- Global `pip install`  --  pollutes system, version conflicts.
- `requirements.txt` without pins  --  silent breakage on rebuild.
- Fat Docker images (full base, build tools in runtime, source + deps in one layer).
