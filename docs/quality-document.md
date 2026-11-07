# Quality Document

Module health record for the whole harness. One row per module; one column per
dimension. Grades describe the repo as it is now, not as intended. Evidence is a
command or a file path, never an adjective.

- Module: all harness modules (repo scorecard)
- Path: repository root
- Owner layer: agent / scripts / mcp / docs
- Last graded: 2026-11-07, session 003, branch `v1.x.x` (CLI refactor uncommitted)
- Graded by: Zara, commands run directly in Git Bash after the `zara-cli` refactor.

## Grade Scale

| Grade | Meaning |
|---|---|
| A | Contract holds, gate passed, no open defect |
| B | Contract holds, gate passed, known gaps are documented |
| C | Contract partly holds, or a gate is missing or stale, or the dimension is unverified |
| D | Contract broken, or no evidence exists |

A module ships only at B or above. Any dimension at D blocks the next feature
that touches this module.

## Dimension Scores

| Module | Correctness | Verification | Scope | Reliability | Maintainability | Grade | Evidence |
|---|---|---|---|---|---|---|---|
| instructions (`AGENTS.md`, `.opencode/instructions/`) | A | A | B | B | A | B | `zara-cli config validate` → `[PASS] config references: 25 checked`; `AGENTS.md` is 140 lines, inside the 50-200 band |
| agents (`.opencode/agent/`) | B | B | B | B | A | B | `zara-cli test` → `agent template: 13 prompts`, `agent load: 14/14 present`; no gate reads prompt intent |
| commands (`.opencode/commands/`) | B | B | B | B | B | B | `zara-cli config validate` resolves every template and command agent; 20 files, 7 registered |
| skills (`.opencode/skills/`, `additional-skills/`) | C | C | C | C | B | C | 15 + 12 directories; no rule reads skill procedure text |
| state (`feature_list.json`, `PROGRESS.md`, `DECISIONS.md`) | A | A | B | B | A | B | `zara-cli vcr` → `VCR = 11/11 = 1.00`; `zara-cli feature check` → 5/5; every passing feature carries gate-written evidence |
| verification gates (`scripts/`, `Makefile`) | A | A | A | A | A | A | `zara-cli test` 3/3, `check` 23/23, `verify --all` 11/11, `clean-check` 24/24, `e2e` `ZARA-OK` |
| guardrails (`opencode.json` permissions, `...harness/arch-rules.json`) | A | A | B | B | A | B | `zara-cli arch` → `[PASS]` for all 15 rules; permissions stay pattern-based, not semantic |
| memory MCP (`mcp/zarust-memory`) | B | B | B | B | B | B | `zmem-mcp.exe --check` → `zara-mcp 0.1.0`, 9 tools, `fts5: true`; ARCH-010 pin check passes |
| improvement loop (`..harness/`) | C | D | C | C | B | D | `...harness/ledger.jsonl` is 0 bytes; `...harness/improvement.md` → `Probes: 0` |
| docs (`docs/`, `templates/`) | A | A | B | B | A | B | `zara-cli audit` → `73 / 73`, critical `7 / 7`, recommended `66 / 66` |

### Why most modules stop at B

`Scope` is `B` everywhere outside the gates: `feature_list.json` describes the
harness build-out (H01-H11), not a per-module contract. A change to `docs/` or a
skill has no acceptance criteria of its own, so scope discipline is asserted by
review, not by a command.

`Verification` is `B` for the prompt layers because no gate reads intent. A
contradictory prompt passes L1 and L2 unchanged; only a model probe or a human
rubric catches it.

### Why the improvement loop is D

The loop has code, two tasks, and two candidates, but `...harness/ledger.jsonl` is
empty and `...harness/improvement.md` records zero probes. The adoption rule ("no
contrast, no adoption") has never executed, so the Verification dimension has no
evidence at all. D blocks any feature that touches `..harness/`.

## Evidence Log

Output lines below were produced in session 003, verbatim.

| Command | Output |
|---|---|
| `zara-cli test` | `3/3 checks passed` |
| `zara-cli check` | `23/23 checks passed` |
| `zara-cli arch` | `15/15 checks passed` |
| `zara-cli verify --all` | `every feature verified (11)` |
| `zara-cli clean-check` | `24/24 checks passed` |
| `zara-cli e2e` | `[PASS] e2e ZARA-OK` |
| `zara-cli vcr` | `VCR = 11/11 = 1.00` |
| `zara-cli audit` | `Total: 73 / 73`, `Critical: 7 / 7`, `Recommended: 66 / 66` |
| `zmem-mcp.exe --check` | `zara-mcp 0.1.0` / 9 tools / `fts5: true` |
| `git submodule status -- mcp/zarust-memory` | `e640886c7ba749aaee92eb526066f0f8526eb818` |
| `uv sync --project scripts` / `uv lock --check --project scripts` | `scripts/.venv` created, `scripts/uv.lock` in sync |

Unverified in this pass: any real MCP tool call through an agent turn, and every
`..harness/` probe path that costs a model call.

## Summary

- Weakest dimension: Verification in `..harness/` (D), then Scope outside the gates (B)
- Overall grade: B repo-wide; D for the improvement loop
- Next action: run one `--execute` probe, record the contrast in
  `...harness/improvement.md`, then re-grade the loop
- Blocks a feature: yes — `..harness/` is blocked by D

## Known Gaps

| Gap | Impact | Accepted because | Revisit when |
|---|---|---|---|
| No automated prompt-quality check | A contradictory or vague prompt passes L1 and L2 unchanged | No command can read intent; only a model probe or a human rubric can | A second prompt change lands without an e2e probe, or two prompts give conflicting orders |
| L3 is one nondeterministic model call | `zara-cli e2e` proves one string on one prompt; a pass is weak evidence | Cost and variance; the model is frozen | More than one agent or prompt is under test in a session |
| Vendored audit is Claude-centric | `uv run --project scripts zara-cli audit` asks for `.claude/settings.json` | The script is vendored from the course, not owned here; `.mcp.json` is generated to satisfy its tool-scoping check | The audit is forked, replaced, or becomes a gate |
| Subagent quota can block verification | L3 and `--execute` probes may fail to run, leaving a feature unverifiable | Free-tier model quota on this host | Verification must be reproducible offline |
| No gate reads skill content | A stale procedure inside a skill passes every gate | Skills are markdown; there is no runner | A skill procedure is cited as evidence of done |
| Improvement ledger is empty | The adoption rule is untested; candidates are unproven | Zero probes have been run | The first `--execute` probe |
| `git push origin +branch` is not denied | Force push through a refspec bypasses the pattern list | `permission.bash` is pattern-based, not semantic | Permission rules gain a semantic layer |

## How to update

After a session, update only the module you touched. One row, one evidence line.

1. Open the row for the module you changed. Do not touch other rows.
2. Re-run the command in its Evidence cell. Paste the output line verbatim; do
   not summarize or paraphrase it.
3. Change only the dimensions that command proves. A dimension you did not run
   keeps its current grade. If you could not run it, write `unverified` and name
   the command that would test it.
4. Grade = lowest dimension. Never raise a grade from reading code or docs.
5. Append a Change Log row: date, commit, dimension, from, to, why.
6. Close a Known Gap by deleting its row when the trigger fires and the fix
   lands; add a new row when a gap is accepted.

## Change Log

| Date | Commit | Dimension | From | To | Why |
|---|---|---|---|---|---|
| 2026-11-07 | uncommitted | all | none | C | First grading pass; 10 modules scored from direct command output |
| 2026-11-07 | uncommitted | improvement loop / Verification | none | D | `...harness/ledger.jsonl` empty, zero probes recorded |
| 2026-11-07 | uncommitted | gates, state, docs, instructions | C | A/B | Every gate ran and passed after the `zara-cli` refactor; 11/11 features carry gate-written evidence; audit 73/73 |
| 2026-11-07 | uncommitted | verification gates | A | A | Audit ported to Python; no shell script left; same 73/73, 7/7, 66/66 |
