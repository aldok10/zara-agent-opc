# scripts/ Architecture

All harness logic is Python. There is no shell script in the repo; the audit is
Python too, and it probes commands instead of filenames.

## Layout

```
scripts/
  zara-cli.py            launcher, no PYTHONPATH needed
  zara-cli.cmd           Windows launcher
  zara_cli/
    cli.py               argparse table, dispatch, error boundary
    context.py           repo root, paths, JSON, git queries
    process.py           resolve/run/bash, Windows shim handling
    result.py            Check, Report, exit codes
    console.py           PASS/FAIL/WARN output
    features.py          FeatureStore: the only writer of feature state
    checks/
      arch.py            rule engine (.harness/arch-rules.json)
      config.py          config references, .mcp.json export
      secrets.py         credential scan over tracked files
      agents.py          prompt template, agent loading
      runtime.py         MCP health, opencode config, submodule pin
    commands/
      verify.py          L1 test, L2 check, L3 e2e, layered gate, vcr
      features.py        list/next/layers/activate/block/check
      lifecycle.py       setup, clean-check, session, audit, harness, doctor, init
```

## Dependency Direction

```
cli -> commands -> checks -> context / process / result / console
                     |
                  features
```

Nothing imports upward. `checks` never prints; it returns `Check` objects.
`commands` owns output and exit codes. `context` is the only module that knows
where files live. `features` is the only module that writes `feature_list.json`.

## Environment

uv owns the interpreter and the lockfile.

```bash
uv sync --project scripts                      # scripts/.venv from scripts/uv.lock
uv run --project scripts zara-cli <command>    # every gate
```

`scripts/pyproject.toml` declares the `zara-cli` console script pointing at
`zara_cli.cli:main`. The package is installed in editable-ish form from
`scripts/zara_cli`, so imports resolve without `PYTHONPATH`. `scripts/zara-cli.py`
stays as a stdlib launcher for the case where uv or the venv is missing; the
architecture rules use it on purpose, so the rule engine still runs when the
environment is the broken thing.

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | the gate passed |
| 1 | the gate ran and failed |
| 2 | the command could not run (usage, missing binary, bad state) |
| 130 | interrupted |

## Determinism

Everything except `e2e` is deterministic and offline. `e2e` costs one model
call and is the only command allowed to be nondeterministic.

## No Shell

There is no shell entry point. `uv run --project scripts zara-cli <command>` runs
every gate, and `make <target>` is a thin alias. `ARCH-014` fails the build if
a `.sh` file appears outside the skill assets, so logic cannot drift back into
bash.

## Windows Notes

- `python`, never `python3`.
- `bash` is resolved with `shutil.which`; a bare `bash` from Python can be WSL
  bash, where `git` and `python` do not exist.
- `opencode` is a `.cmd` shim; `process.resolve` wraps it with `cmd /c`.
- No `jq`. JSON goes through `context.read_json`.
