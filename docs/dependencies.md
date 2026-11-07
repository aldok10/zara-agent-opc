# Dependencies

This repo has two dependency surfaces: Python scripts and one Rust binary. There
is no package manager lockfile for either, and that is deliberate.

## The lock is a gitlink

The only external dependency is `zmem-mcp`, the Rust MCP server behind the
`Orchestrator` tool host. It is not a published crate and ships no prebuilt
binary, so it is pinned as a git submodule:

| Field | Value |
|---|---|
| Path | `mcp/zarust-memory` |
| URL | `https://github.com/aldok10/zarust-memory.git` |
| Pin | the gitlink recorded in the superproject tree |
| Transitive pin | `mcp/zarust-memory/Cargo.lock` |

The gitlink is the lock. `git submodule status -- mcp/zarust-memory` shows the
pinned commit; a leading `-` means the checkout is missing. Rationale and the
reversal condition live in
[`.harness/decisions/0002-pin-mcp-by-submodule.md`](.harness/decisions/0002-pin-mcp-by-submodule.md).

## Restore after a fresh clone

```bash
git submodule update --init --recursive
```

Without it, `mcp/zarust-memory` is an empty directory, the binary is absent, and
the MCP tool list is empty — which looks like a broken server, not a missing
checkout.

## Rebuild the binary

The build output is gitignored, so it is rebuilt from the pinned tree:

```bash
cd mcp/zarust-memory
cargo +stable-x86_64-pc-windows-gnu build --release -p zmem-mcp
```

The result must land at `mcp/zarust-memory/target/release/zmem-mcp.exe`, the path
`opencode.json` launches. `uv run --project scripts zara-cli config validate` fails if that file
is missing.

## Python: uv owns the interpreter and the lock

One project, one lockfile, one virtual environment.

| File | Role |
|---|---|
| `scripts/pyproject.toml` | the `zara-cli` project: `requires-python >=3.12`, no runtime dependencies, console script `zara-cli = zara_cli.cli:main` |
| `scripts/uv.lock` | the resolver lock; committed, machine-checked by `ARCH-015` |
| `scripts/.python-version` | the interpreter pin uv reads (`3.12`) |
| `scripts/.venv/` | created by `uv sync --project scripts`; gitignored, never hand-made |

```bash
uv sync --project scripts          # create/refresh scripts/.venv from scripts/uv.lock
uv run --project scripts zara-cli  # run the CLI inside that environment
uv lock --check --project scripts  # exit 1 if scripts/pyproject.toml and scripts/uv.lock disagree
```

Why uv and not `python -m venv` + `pip`: uv resolves and installs in one step,
keeps the lockfile deterministic, and creates the venv itself. There is no
`pip install` step to forget and no manually activated shell.

Every gate imports from the standard library only: `argparse`, `json`, `os`,
`pathlib`, `re`, `shutil`, `subprocess`, `sys`, `tempfile`, `time`. A new
import must resolve from the stdlib. Adding a PyPI package means adding it to
`scripts/pyproject.toml`, running `uv lock --project scripts`, and committing both files.

The one real dependency is not a Python package. It is the Rust MCP server,
pinned by the submodule gitlink plus `mcp/zarust-memory/Cargo.lock`. That
gitlink is the dependency lock: see `.harness/decisions/0002-pin-mcp-by-submodule.md`.

## Regenerate `.mcp.json`

`opencode.json` is the source of truth for MCP servers. `.mcp.json` is a
generated portable mirror for harnesses that read the common format:

```bash
uv run --project scripts zara-cli config export-mcp           # write .mcp.json
uv run --project scripts zara-cli config export-mcp --check   # exit 1 if it is stale
```

The script is stdlib-only and deterministic: sorted keys, 2-space indent, one
trailing newline. It refuses to emit an absolute Windows drive path, so a
machine-local binary path fails the export instead of being committed. Re-run it
whenever the `mcp` block in `opencode.json` changes.
