# Harness2 loop

The model is frozen; only the harness changes. This directory holds a small
Propose -> Probe -> Compose loop that tests prompt overlays against the same task
and records the contrast.

A **candidate** is a markdown file in `candidates/`. A **probe** runs the task
twice through the real OpenCode CLI: baseline (no overlay) and candidate (the
overlay attached as a temporary file). Checks score both runs.

## Commands

```bash
# plan only: zero model calls, zero writes (default)
python ...harness/run_improvement.py --dry-run --task harness-ok

# inventory of tasks and candidates
python ...harness/run_improvement.py --list

# regenerate improvement.md from the ledger
python ...harness/run_improvement.py --report

# spend model calls: probe baseline + each candidate, append to the ledger
python ...harness/run_improvement.py --execute --task harness-ok \
  --candidate ...harness/candidates/0001-explicit-verification.md
```

Dry-run is the default. `--execute` is the only mode that calls the model or
writes the ledger.

## Adoption rule

**No contrast, no adoption.** A candidate is adopted only when it passes every
check the baseline fails. If the baseline fails nothing, every candidate is
rejected. The contrast stays in the ledger either way.

## Cost

| Mode | Model calls |
|---|---|
| `--dry-run`, `--list`, `--report` | 0 |
| `--execute` with no candidate | 1 (baseline) |
| `--execute` with N candidates | 1 + N |

A task with `"probe_model": false` makes no model calls; its checks run twice
against an empty transcript, so it can never produce a contrast.

## Ledger schema

`ledger.jsonl` is one JSON object per line:

| field | type | meaning |
|---|---|---|
| `ts` | string | UTC timestamp, ISO 8601 |
| `task` | string | task name |
| `candidate` | string \| null | repo-relative candidate path, null for baseline-only |
| `model` | string | model id, or `cli-default` |
| `baseline_pass` | string[] | check labels the baseline passed |
| `candidate_pass` | string[] \| null | check labels the candidate passed |
| `adopted` | bool | candidate passed every check the baseline failed |
| `duration_s` | number | wall time for the probe |

`improvement.md` is generated from the ledger. Do not edit it by hand.

## Notes

- Checks run through `bash -c` with `HARNESS_OUTPUT` pointing at the transcript.
- `bash` is resolved with `shutil.which`, so bare `bash` does not fall through to
  WSL bash under Windows Python.
- Stdlib only. No dependencies.
