# Verification

Three layers. Each layer is a command. Run them in order.

## Layers

| Layer | Command | Script | What it proves | What it does not prove | Cost |
|---|---|---|---|---|---|
| L1 | `make test` | `zara-cli test` | Config references resolve (agents, command templates, instructions, MCP binary path) and the 13 configured agents load with a non-empty system prompt. | Prompt quality. Instruction conflicts. Whether an agent obeys its prompt. MCP health. | Seconds. No model call. |
| L2 | `make check` | `zara-cli check` | Architecture rules pass, config references resolve, the MCP binary loads (`--check`), and OpenCode accepts the config (`opencode debug config`). | Model behavior. End-to-end wiring through a real turn. | Seconds. No model call. |
| L3 | `make e2e` | `zara-cli e2e` | One real model call through agent `zara` returns `ZARA-OK`. | Determinism. Coverage. Anything beyond one prompt and one string. | One model call. 30-60 s typical, 180 s timeout. |

L1 internals: `uv run --project scripts zara-cli config validate` then `opencode debug agents`,
parsed as JSON. The agent list is checked against a fixed set of 13 names; a
missing agent or an empty `system` field fails the gate.

L2 internals, in order: `uv run --project scripts zara-cli arch`,
`uv run --project scripts zara-cli config validate`, `uv run --project scripts zara-cli config export-mcp --check`,
the secrets scan, `uv --version`, the venv interpreter, `uv lock --check --project scripts`,
`mcp/zarust-memory/target/release/zmem-mcp.exe --check`,
`opencode debug config`. Every step must exit 0.

L3 internals: `opencode run --agent zara --format json "Reply with exactly
ZARA-OK and nothing else."` The gate fails on non-zero exit, on timeout, or when
`ZARA-OK` is absent from stdout+stderr.

## Ordering rule

Never run layer N+1 when layer N fails.

- L1 fails: fix the reference or the agent load. Do not run L2 or L3.
- L2 fails: fix the rule, config, or MCP. Do not run L3.
- L3 is required when a change crosses component or domain boundaries: agent
  prompts, the MCP surface, shared skills.

Source: `AGENTS.md` (Verification section) and feature H03 layers in
`feature_list.json`.

## Evidence rule

- Only a passing command is evidence. Confidence is not evidence. Code written
  is not evidence.
- Feature state changes only through `make verify-feature F=<id>`.
  `scripts/verify_feature.py` reads the feature's `layers` from
  `feature_list.json`, runs them in order, stops at the first failure with
  WHAT/WHY/FIX, and on success writes `status: "passing"` plus an evidence line
  `verified <timestamp> at <sha> via <labels>`.
- Never set `state` by hand. `feature_list.json` carries
  `passing_requires_evidence: true` and `do_not_skip_verification: true`.
- `make vcr` (`uv run --project scripts zara-cli vcr`) reports `passing / (passing +
  active)` and enforces WIP=1 and a note on every blocked feature.
- `make clean-check` (`zara-cli clean-check`) runs `make test`, parses
  `feature_list.json`, rejects any feature left `active`, rejects stray
  `.orig` / `.rej` / `.bak` / `debug-*.log` files, and re-runs `make check-arch`.

## Current state on this host

Checked by running the commands directly, not through `make`:

| Command | Result |
|---|---|
| `uv run --project scripts zara-cli config validate` | `[PASS] config references: 25 checked` |
| `opencode debug agents` | 22 agents listed; the 13 repo agents present with non-empty prompts |
| `mcp/zarust-memory/target/release/zmem-mcp.exe --check` | 9 tools listed, `fts5: true` |
| `opencode debug config` | exit 0, loads the global config |
| `uv run --project scripts zara-cli arch` | `[PASS]` for all 15 rules |
| `uv run --project scripts zara-cli test` / `check` / `e2e` | `3/3`, `23/23`, `ZARA-OK` |

## Historical gate failures (fixed)

| Rule | Cause | Fix |
|---|---|---|
| ARCH-001 | A prompt still called `Orchestrator_memory(action:"episode"`. | Replaced with `Orchestrator_reflect`. |
| ARCH-002 | A prompt asked for `layer:"knowledge"` on memory recall. | Replaced with `Orchestrator_knowledge`. |
| ARCH-005 | Command rules ran through `bash -lc`; the login shell lost `python`. | `scripts/zara_cli/process.py` resolves Git Bash with `shutil.which` and uses `-c`. |
| ARCH-010 | Same PATH trap, `git` missing. | Same fix. |

The lesson is encoded, not remembered: shelling out from Python must resolve the
interpreter explicitly. `zara-cli` never calls a login shell.

## Failure handling

- Gates print `[FAIL] <name>`. Arch and feature gates also print WHAT / WHY /
  FIX (`scripts/zara_cli/checks/arch.py`, `scripts/zara_cli/commands/verify.py`).
- Convention: one repair attempt, then stop and record. `.opencode/instructions/
  system.md` encodes the stop rule: identical failure twice means stuck, switch
  approach; three distinct failures mean STOP and escalate. No script enforces a
  retry count.
- Record the state in `PROGRESS.md`. Do not flip feature state by hand.

## Limits of the layers

- L1 cannot see prompt quality, instruction drift, or whether an agent follows
  its prompt. It only proves that references resolve and prompts are non-empty.
- L2 cannot see model behavior. It proves that rules, config, and the MCP binary
  load. A prompt that tells an agent to call a nonexistent tool passes L2.
- L3 costs one model call, is nondeterministic, and checks one string on one
  prompt. A pass is weak evidence of general behavior.
