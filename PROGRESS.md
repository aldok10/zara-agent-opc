# Progress

## Current State

- Last commit: `1699578` (branch `v1.x.x`); the harness, CLI and uv work are uncommitted.
- `zara-cli test`: pass (config refs, agent template, 14/14 agents load).
- `zara-cli check`: pass (23/23: 15 arch rules, config refs, MCP export sync, secrets, MCP health, config load, uv, venv, lock).
- `zara-cli e2e`: pass (`ZARA-OK`).
- `zara-cli clean-check`: pass (24/24).
- `zara-cli audit`: 73/73 components (7/7 critical, 66/66 recommended).
- `zara-cli vcr`: 11/11 = 1.00. No feature active.
- MCP `Orchestrator`: zmem-mcp, 9 tools, FTS5, audit clean.
- Agent prompts: 13 files, all on the 8-section harness template.
- Scripts: one Python CLI (`scripts/zara_cli/`); zero shell scripts in the repo (`ARCH-014`).
- Python: uv 0.13.7 owns `scripts/.venv` and `scripts/uv.lock`; `zara-cli` is the console script (`ARCH-015`).

## In Progress

- None. Every feature in `feature_list.json` is `passing` with evidence recorded by the gate.

## Next Steps

1. Commit in logical slices: state/schema, Python CLI, gates, docs, agent prompts, harness loop.
2. Run one real probe in `.harness/`: `python .harness/run_improvement.py --execute --task harness-ok --candidate .harness/candidates/0001-explicit-verification.md` (one model call per probe).
3. After the first probe, record the contrast in `.harness/improvement.md` and adopt only if the candidate passes a check the baseline fails.

## Blockers

- Free-model quota can interrupt long subagent waves. Work is resumable from tracked files; no state lives in chat.

## Session Log

### Session 006 — 2026-11-07

- Goal: keep every Python setup file in `scripts/`, and close the gitignore gaps.
- Completed: `pyproject.toml`, `uv.lock`, `.python-version` and `.venv/` moved under `scripts/`; Makefile, feature layers, `runtime.py`, `ARCH-015` and the audit pin list repointed to `--project scripts`; `doctor` and `setup` read `scripts/.venv` and `scripts/uv.lock`; the harness loop runs on `sys.executable` (the venv interpreter) instead of a bare `python`; `.gitignore` gained Python/uv, local database, and harness runtime entries.
- Verification run: `make check` 23/23, `arch` 15/15, `test` 3/3, `verify --all` 11/11, `clean-check` 24/24, `audit` 73/73, `e2e` `ZARA-OK` — all pass.
- Gitignore check: `git ls-files | git check-ignore --stdin` returns nothing, so no tracked file became ignored; `scripts/uv.lock` and `scripts/.python-version` stay tracked.

### Session 005 — 2026-11-07

- Goal: modern Python environment — uv-managed venv and uv as the runner.
- Completed: `scripts/pyproject.toml` (hatchling, `packages = ["zara_cli"]`, console script `zara-cli`), `uv sync --project scripts` creates `scripts/.venv`, `scripts/uv.lock` committed; Makefile targets run `uv run --no-sync --quiet zara-cli`; `requirements.txt` (root and `harness/`) deleted — `scripts/uv.lock` is the lockfile; `setup` and `check` now prove uv, the venv interpreter, and `uv lock --check --project scripts`; `ARCH-015` added; feature layers and docs repointed to `uv run --project scripts zara-cli`.
- Verification run: `arch` 15/15, `test` 3/3, `check` 23/23, `verify --all` 11/11, `clean-check` 24/24, `audit` 73/73, `e2e` `ZARA-OK` — all pass.
- Deliberate choice: arch rule commands keep calling `python scripts/zara-cli.py` (stdlib launcher) so the rule engine still runs when the environment is the thing that is broken; `ARCH-015` reports a missing uv instead of every rule failing.

### Session 004 — 2026-11-07

- Goal: remove every shell script; the audit becomes a zara-cli command too.
- Completed: `scripts/zara_cli/checks/audit.py` ports all 73 audit items to Python; five items that looked for shell filenames now probe `zara-cli verify|arch|session|clean-check`; all 7 `.sh` files deleted (`audit-harness.sh`, the four shims, `setup.sh`, `init.sh`) plus the bash launcher `scripts/zara-cli`; `ARCH-014` redefined as "no shell script carries repo logic"; H04/H05/H06 layers repointed to CLI commands; docs and skills updated.
- Verification run: `arch` 14/14, `test` 3/3, `check` 19/19, `verify --all` 11/11, `clean-check` 23/23, `e2e` `ZARA-OK`, `audit` 73/73 (7/7, 66/66), `vcr` 1.00 — all pass.
- Fixed along the way: `opencode.json` had drifted to an absolute MCP path, which `ARCH-004` and `ARCH-012` caught; restored to `./mcp/zarust-memory/target/release/zmem-mcp.exe` and regenerated `.mcp.json`.
- Deliberately excluded: 10 `.sh` files under `.opencode/skills/*/examples` and `additional-skills/*/tools` are skill assets (wrappers around trivy, coverage, git bisect), not harness entry points. `ARCH-014` exempts them by path.

### Session 003 — 2026-11-07

- Goal: one command for the whole harness — move every script into `scripts/`, convert all logic to Python, expose it as `zara-cli`.
- Completed: `scripts/zara_cli/` package (cli, context, process, result, console, features, checks/*, commands/*); launchers `zara-cli.py`, `zara-cli`, `zara-cli.cmd`; Makefile delegates to the CLI; 14 old scripts deleted; four `.sh` files kept only as shims for the vendored audit, now enforced by `ARCH-014`; arch rules and feature layers repointed to the CLI; docs and module architecture rewritten.
- Design rules encoded: `checks` returns `Check` objects and never prints, `commands` owns output and exit codes, `context` is the only module that knows paths, `features` is the only writer of `feature_list.json`.
- Verification run: `zara-cli arch` 14/14, `check` 19/19, `test` 3/3, `verify --all` 11/11 features, `clean-check` 23/23, `e2e` `ZARA-OK`, `audit` 73/73, `vcr` 1.00 — all pass.
- Fixed along the way: the audit crashed on `→` under the Windows console code page — `console.utf8_streams()` now reconfigures stdout/stderr; `verify --all` used to skip passing features, so evidence could not be refreshed — it now re-runs every non-blocked feature; evidence keeps the last three runs instead of growing without bound.

### Session 002 — 2026-11-07

- Goal: apply harness engineering and Harness2 to the whole repo, including every agent and subagent prompt.
- Completed: state schema migration (`planned|active|passing|blocked`), real bash layered gate, 13 arch rules, docs set (architecture, verification, memory contract, guardrails, quality, environment, dependencies, ADRs), module-level architecture docs, Harness2 loop (dry-run default), harness skill + `/harness` command, merged `zara-extended` into `zara`, rewrote all 13 agent prompts to one 8-section template, lockfile/runtime pins, generated `.mcp.json`, secrets scan.
- Verification run: `make test`, `make check`, `make e2e`, `make clean-check`, `make vcr`, `uv run --project scripts zara-cli audit` — all pass.
- Fixed along the way: Python `bash` resolved to WSL bash (no git/python) — now resolved with `shutil.which`; `opencode` is a `.CMD` shim that `subprocess` cannot exec — now resolved through `scripts/proc_util.py`.
- Known risk: the vendored audit is Claude-centric; `.mcp.json` is generated to satisfy its tool-scoping check, and `ARCH-012` keeps it in sync.

### Session 001 — 2026-11-07

- Goal: install harness engineering and the Harness2 recursive improvement loop.
- Completed: instructions router, state files, verification gates, arch rules, templates, docs, improvement loop skeleton.
