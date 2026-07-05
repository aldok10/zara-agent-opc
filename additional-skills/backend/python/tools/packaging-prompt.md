---
type: tool
title: "Python Packaging Setup"
---

# Python Packaging Setup

## Purpose

Configure modern Python packaging with pyproject.toml, build backends, and dependency management. Covers project metadata, build systems, tool configuration, and publishing workflow.

## When to Use

- Starting a new Python project and choosing packaging setup
- Migrating from setup.py/setup.cfg to pyproject.toml
- Choosing between uv, pip, poetry, or hatch for dependency management
- Configuring build backend (setuptools, hatchling, flit, maturin)
- Setting up package publishing to PyPI or private registry

## Prompt Template

```
CONTEXT:
- Project type: [library | application | CLI tool | mixed]
- Python version range: [>=3.11 | >=3.12 | >=3.13]
- Distribution: [pure Python | C extension | Rust extension (maturin)]
- Dependency manager: [uv | pip | poetry | hatch | pdm]
- Build backend: [setuptools | hatchling | flit-core | maturin | scikit-build]
- Publishing target: [PyPI | private registry | internal only]
- Monorepo: [single package | workspace with multiple packages]

CONFIGURATION:
1. pyproject.toml structure
   - [project] metadata (name, version, description, authors)
   - [project.dependencies] (pinned vs range)
   - [project.optional-dependencies] (dev, test, docs groups)
   - [project.scripts] (CLI entry points)
   - [project.urls] (homepage, repository, issues)

2. Build backend selection
   - setuptools: familiar, handles complex builds, C extensions
   - hatchling: fast, plugins, good defaults
   - flit-core: minimal, pure Python only
   - maturin: Rust+Python hybrid packages
   - scikit-build: CMake-based extensions

3. Dependency management
   - Lock file strategy (uv.lock, requirements.txt, poetry.lock)
   - Version constraints (>=, ~=, == for apps vs libraries)
   - Optional dependency groups
   - Private index configuration

4. Tool configuration (in pyproject.toml)
   - [tool.ruff] (linting + formatting)
   - [tool.pytest.ini_options]
   - [tool.mypy] or [tool.pyright]
   - [tool.coverage]

5. Version management
   - Static version in pyproject.toml
   - Dynamic version from VCS (setuptools-scm, hatch-vcs)
   - __version__ single source of truth

6. Package structure
   - src/ layout vs flat layout
   - py.typed marker for type stubs
   - Package data inclusion/exclusion
   - Namespace packages

PUBLISHING:
- Build: python -m build or uv build
- Test: upload to TestPyPI first
- Publish: twine upload or uv publish
- CI: trusted publishers (GitHub Actions OIDC)
```

## Output Format

```
## Packaging Setup: [project name]

### Recommended Stack
- Manager: [choice with rationale]
- Backend: [choice with rationale]
- Layout: [src/ or flat, with reasoning]

### pyproject.toml
[Key sections with annotated configuration]

### Project Structure
[Directory tree showing package layout]

### Development Workflow
1. [Install/sync command]
2. [Test command]
3. [Lint/format command]
4. [Build command]

### Publishing Checklist
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Tests pass on all supported Python versions
- [ ] Build artifacts verified
- [ ] Published to registry

### Migration Notes (if applicable)
- [What moved from where to where]
```
