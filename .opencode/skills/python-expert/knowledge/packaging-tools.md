---
type: fact
title: "Python Packaging & Tools"
---
# Python Packaging & Tools

## uv

Replaces pip, virtualenv, pip-tools, pipx in one binary (written in Rust).

Core commands:
```bash
uv init myproject          # Create new project with pyproject.toml
uv add requests "flask>=3" # Add dependencies
uv remove flask            # Remove dependencies
uv sync                    # Install from lock file
uv lock                    # Update lock file without installing
uv run pytest              # Run command in project environment
uv tool install ruff       # Install CLI tools (replaces pipx)
```

Virtual environment management:
```bash
uv venv                    # Create .venv in current directory
uv venv --python 3.13      # Specific Python version
uv python install 3.13     # Download and manage Python versions
uv python list             # Show available/installed versions
```

Speed: 10-100x faster than pip due to parallel resolution and caching.

## pyproject.toml

Single config file for build system, dependencies, and tool settings:

```toml
[project]
name = "mypackage"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "httpx>=0.27",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = ["pytest>=8", "ruff>=0.5"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.mypy]
strict = true
```

## UV Workspaces (Monorepos)

Root `pyproject.toml`:
```toml
[tool.uv.workspace]
members = ["packages/*", "services/*"]
```

Each member has its own `pyproject.toml`. Shared dependencies resolve together.

```bash
uv run --package api pytest     # Run in specific package
uv sync --all-packages          # Sync all workspace members
```

- Cross-package dependencies via path: `api = {workspace = true}`
- Single lock file for the entire workspace
- Each package can have different Python version requirements

## Publishing to PyPI

Trusted publishing (no API tokens needed):
1. Configure GitHub Actions as trusted publisher on PyPI
2. Use OIDC token exchange in CI

```yaml
# .github/workflows/publish.yml
jobs:
  publish:
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - run: uv build
      - uses: pypa/gh-action-pypi-publish@release/v1
```

Manual publishing:
```bash
uv build                        # Creates dist/
uv publish --token $PYPI_TOKEN  # Upload to PyPI
```

Versioning strategies:
- Dynamic version from git tags: `dynamic = ["version"]`
- `hatch-vcs` or `setuptools-scm` for git-based versioning

## Docker for Python

Multi-stage with uv:
```dockerfile
FROM python:3.13-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-editable

FROM python:3.13-slim
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY src/ ./src/
ENV PATH="/app/.venv/bin:$PATH"
CMD ["python", "-m", "myapp"]
```

Best practices:
- `--frozen` ensures lock file is not modified during build
- `--no-editable` for production (no .pth files)
- Copy dependency files first for layer caching
- Use slim/distroless base images
- Set `UV_COMPILE_BYTECODE=1` for faster startup
- Pin base image digest for reproducibility

## Dependency Resolution & Lock Files

`uv.lock`:
- Cross-platform (records markers for all platforms)
- Human-readable TOML format
- Commit to version control
- `uv lock --upgrade` to update all within constraints
- `uv lock --upgrade-package httpx` for selective updates

Resolution strategy:
- Default: lowest compatible version (more reproducible)
- `--resolution highest` for latest versions
- Override constraints: `[tool.uv]` section for forced versions
- Platform-specific overrides via environment markers
