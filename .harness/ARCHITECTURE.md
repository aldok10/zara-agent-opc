# Architecture

## Flow

```
task + candidate  ->  dry-run (plan, 0 calls)
                  ->  execute: baseline probe -> checks -> candidate probe -> checks
                  ->  ledger.jsonl append -> improvement.md regenerate
```

The model is frozen. The only thing a probe changes is the prompt: the candidate
body is written to a temp file and attached with `opencode run --file`.

## File responsibilities

| Path | Responsibility |
|---|---|
| `run_improvement.py` | the whole loop: load, plan, probe, score, ledger, report |
| `tasks/*.json` | task definition: `name`, `prompt`, `checks`, optional `model_note`, `probe_model` |
| `candidates/*.md` | a prompt overlay; the file body is the delta attached to the prompt |
| `ledger.jsonl` | append-only record of every probe contrast |
| `improvement.md` | generated report from the ledger |
| `README.md` | purpose, commands, adoption rule, cost, ledger schema |
| `ARCHITECTURE.md` | this file |
| (no local manifest) | the root `scripts/pyproject.toml` and `scripts/uv.lock` cover this loop; run it with `uv run python ...harness/run_improvement.py` |

## Boundaries

- A candidate **only** adds a prompt overlay. It never edits repo files, never
  patches source, and never carries executable content. The runner treats it as
  text and writes it to a temp path outside the repo.
- A task's checks are the only judge. They run through `bash -c` in the repo root
  with `HARNESS_OUTPUT` set to the transcript path.
- `--dry-run` makes zero model calls and zero writes. It prints the exact argv
  that `--execute` would run.
- `--execute` is the only writer: it appends to `ledger.jsonl` and regenerates
  `improvement.md`.
- Overlays live in the system temp directory (`harness-overlays/`), not in the
  repo, so a probe leaves no untracked files behind.

## Scoring

A check passes when its command exits 0. `baseline_pass` and `candidate_pass`
are the passing labels. Adoption is `failed_by_baseline` non-empty and a subset
of `candidate_pass`. Everything else is rejected.
