---
type: subskill
title: "Packaging with uv"
---

# Packaging with uv

uv workspaces, pyproject.toml, lockfiles, virtual environments, publishing, scripts.

## Project Init

```bash
# New project
uv init my-service --python 3.13
cd my-service

# Add dependencies
uv add fastapi pydantic-settings sqlalchemy[asyncio]
uv add --dev pytest pytest-asyncio httpx ruff mypy

# Pin exact versions in lockfile
uv lock
```

uv creates `pyproject.toml` + `uv.lock`. The lockfile is cross-platform and deterministic.

## pyproject.toml Structure

```toml
[project]
name = "order-service"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.115",
    "pydantic>=2.9",
    "sqlalchemy[asyncio]>=2.0",
    "structlog>=24.1",
    "uvicorn[standard]>=0.30",
]

[project.scripts]
serve = "order_service.main:cli"

[tool.uv]
dev-dependencies = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "httpx>=0.27",
    "ruff>=0.8",
    "mypy>=1.13",
]
```

## Workspaces (Monorepo)

```toml
# Root pyproject.toml
[tool.uv.workspace]
members = ["services/*", "libs/*"]

# libs/shared/pyproject.toml
[project]
name = "shared"
version = "0.1.0"

# services/orders/pyproject.toml
[project]
name = "order-service"
dependencies = ["shared"]  # Workspace dependency

[tool.uv.sources]
shared = { workspace = true }
```

`uv sync` resolves workspace members as editable installs. Single lockfile at root.

## Virtual Environments

```bash
# uv manages venvs automatically
uv sync              # Create/update .venv from lockfile
uv run pytest        # Run command in project venv
uv run python -m mypy --strict src/

# Explicit venv management (rare)
uv venv --python 3.13
source .venv/bin/activate
```

Never activate manually in CI -- always `uv run`.

## Scripts and Tasks

```toml
# pyproject.toml
[project.scripts]
serve = "order_service.main:cli"
migrate = "order_service.db:run_migrations"

[tool.uv.scripts]
lint = "ruff check . && ruff format --check ."
typecheck = "mypy --strict src/"
test = "pytest --cov -x"
check = ["lint", "typecheck", "test"]
```

```bash
uv run serve
uv run lint
uv run check  # Runs all three sequentially
```

## Lockfile Management

```bash
uv lock              # Generate/update lockfile
uv lock --check      # CI: verify lockfile is up to date
uv sync --frozen     # Install exactly from lockfile (no resolution)
uv sync --no-dev     # Production: skip dev dependencies
```

Commit `uv.lock` to git. CI runs `uv lock --check` to catch drift.

## Publishing

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/order_service"]
```

```bash
uv build            # Creates dist/*.whl and dist/*.tar.gz
uv publish          # Upload to PyPI (needs TWINE_* env vars or keyring)
```

## Python Version Management

```bash
uv python install 3.13      # Install Python 3.13
uv python list              # Show available versions
uv python pin 3.13          # Pin for this project (.python-version)
```

uv manages Python installations -- no pyenv needed.

## Rules

1. `uv add` for all dependency changes -- never edit pyproject.toml manually for deps
2. Commit `uv.lock` -- reproducible builds across environments
3. `uv sync --frozen` in CI and Docker -- no resolution, exact lockfile
4. Workspace members for shared code -- no path hacks or symlinks
5. `uv run` for all commands -- ensures correct venv without activation
6. `requires-python` declares minimum -- uv resolves compatible versions
7. Dev deps in `[tool.uv]` section (uv-specific) not `[project.optional-dependencies]`
8. Pin Python with `.python-version` file -- uv + CI respect it
