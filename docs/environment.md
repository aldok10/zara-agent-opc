# Environment

What must be on the machine for the harness to run, and the one Windows trap that
silently broke a gate. Every row is checked by the command in its column.

## Host

Windows native, not WSL. All commands below run in Git Bash.

| Item | Value | Check |
|---|---|---|
| Git Bash | 5.3.15(2)-release, `x86_64-pc-cygwin` | `bash --version` |
| GNU Make | 4.4.1 | `make --version` |
| Python | 3.12.2, invoked as `python` | `python --version` |
| OpenCode CLI | v2.2.5 | `opencode --version` |
| jq | absent | `jq --version` → `command not found` |
| Node | v21.7.1 on the host, not used by the repo | `node --version` |
| Rust, declared | 1.99.0 | `cat .tool-versions` |
| Rust, local cargo | 1.80.0-nightly when checked | `cargo --version` |

Version pins live in two files: `scripts/.python-version` (`3.12`) and `.tool-versions`
(`python 3.12.2`, `rust 1.99.0`). The local `cargo --version` disagrees with the
pin on this host; check it before trusting the declared version.

The interpreter is `python`, never `python3`. `python3` is not on PATH here, and
`scripts/ARCHITECTURE.md` states the same rule.

## No jq, no Node

- `jq` is absent. Scripts read JSON with `python -c` or a short heredoc
  (one JSON reader, `scripts/zara_cli/context.py`, used by every command).
- The repo has no `package.json` and no `package-lock.json`. Nothing under
  `.opencode/` is imported at runtime: the `.ts` files there are skill examples
  under `skills/*/examples/`, not loaded by OpenCode. `DECISIONS.md` 0004 forbids
  registering an OpenCode v1 plugin, and the v1 plugin tree was removed with it.
  Node on the host is irrelevant to this repo.

## Windows trap: bare `bash` is WSL

Under Python `subprocess`, a bare `bash` resolves through `CreateProcess` to
`C:\Windows\System32\bash.exe` — the WSL launcher — not to Git Bash. WSL bash has
no `git` and no `python`, so a gate that shells out that way fails with
`command not found` on a machine where both are installed.

Observed on this host:

```
shutil.which("bash")                 -> C:\Program Files\Git\usr\bin\bash.EXE
subprocess.run(["bash","-lc",...])   -> Linux | NO-PYTHON
```

| Call | Resolves to | Has `git` / `python` |
|---|---|---|
| `shutil.which("bash")` | `C:\Program Files\Git\usr\bin\bash.EXE` | yes |
| bare `bash` in `subprocess` | `C:\Windows\System32\bash.exe` (WSL) | no |

Rules:

- Resolve the interpreter with `shutil.which("bash")` or run the logic in-process.
- `bash -lc` also drops the MSYS PATH, which is the second half of the same trap:
  the login shell can lose `python` and `git` even when the binary is correct.
  `docs/verification.md` records ARCH-005 and ARCH-010 failing for that reason.

The fix is in the code, not in the shell:

| File | Line | Code |
|---|---|---|
| `scripts/zara_cli/process.py` | `bash_argv()` | `path = shutil.which("bash")` |
| `...harness/run_improvement.py` | 29 | `BASH = shutil.which("bash") or "bash"` |

Any new Python script that shells out must do the same. `zara-cli arch` now prints `[PASS]` for every rule, and the runner never
calls a login shell.

## Rust and the MCP binary

The memory server is Rust, built from the pinned submodule. Heavy builds run on a
remote Linux build host (4 cores, 7.8 GB RAM, cargo 1.99.0). The Windows binary is
built locally with the gnu toolchain.

| Item | Value |
|---|---|
| Submodule | `mcp/zarust-memory` |
| Pin | gitlink `e640886c7ba749aaee92eb526066f0f8526eb818` |
| Transitive pin | `mcp/zarust-memory/Cargo.lock` |
| Binary | `mcp/zarust-memory/target/release/zmem-mcp.exe` (gitignored) |
| Enforced by | ARCH-010, `git submodule status -- mcp/zarust-memory` must not start with `-` |

Rebuild:

```bash
git submodule status -- mcp/zarust-memory      # leading '-' means uninitialized
git submodule update --init --recursive
cd mcp/zarust-memory
cargo +stable-x86_64-pc-windows-gnu build --release -p zmem-mcp
```

Verify the result:

```bash
./mcp/zarust-memory/target/release/zmem-mcp.exe --check
uv run --project scripts zara-cli setup
```

Expected `--check` output on this host:

```
zara-mcp 0.1.0
tools:  memory, episode, reflect, session, knowledge, ctx, dashboard, code_index, code_search
fts5:   true
```

What fails when the binary is missing:

| Command | Result |
|---|---|
| `zara-cli setup` | `[FAIL] missing mcp/zarust-memory/target/release/zmem-mcp.exe`, plus the build line |
| `uv run --project scripts zara-cli config validate` | `mcp Orchestrator: binary missing` → L1 fails (`scripts/zara_cli/checks/config.py`) |
| `make check` | `[FAIL] mcp health` → L2 fails |
| Agent memory tools | `Orchestrator` has no server to start; `recall`, `learn`, `reflect`, `episode`, `session` calls fail at runtime. Config load itself does not spawn the server, so the failure appears at the first tool call. (Inferred from the config shape, not exercised by a test.) |

## Python environment

uv owns it. `uv sync --project scripts` creates `scripts/.venv` from
`scripts/uv.lock`; `uv run --project scripts zara-cli` executes inside it. Nothing is installed globally, and `pip install` is not part of the
workflow.

```bash
uv sync --project scripts                      # create or refresh scripts/.venv
uv run --project scripts zara-cli setup        # submodule, binary, opencode, python, uv, venv, lock
```

Why:

- Every gate under `scripts/zara_cli/` and `...harness/run_improvement.py` imports
  from the standard library only, so the venv contains exactly one package:
  `zara-cli` itself.
- `scripts/pyproject.toml` declares `requires-python >=3.12` and the console script
  `zara-cli`. `scripts/uv.lock` is committed; `ARCH-015` fails the build when it drifts.
- `scripts/.python-version` pins the interpreter uv resolves. `.tool-versions` pins it
  for asdf users. They must agree.
- The one real dependency is the Rust MCP server, pinned by the submodule
  gitlink plus `mcp/zarust-memory/Cargo.lock`:
  `.harness/decisions/0002-pin-mcp-by-submodule.md`.

`scripts/zara-cli.py` still runs without uv (it puts `scripts/` on `sys.path`
and uses the system interpreter). That is the escape hatch when uv is not
installed; the gates themselves do not depend on it.

## Preflight

```bash
uv run --project scripts zara-cli init       # setup, make test, then the next feature
uv run --project scripts zara-cli setup      # submodule, binary, opencode, python only
```

`uv run --project scripts zara-cli setup` checks four things and exits non-zero if any is missing:
the submodule is initialized, the binary exists, `opencode` is on PATH, `python`
is on PATH. `uv run --project scripts zara-cli init` adds `make test` and the next planned feature; a red
baseline stops there.
