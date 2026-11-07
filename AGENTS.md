# Zara Harness

This repository is the OpenCode V2 harness for the Zara agent system. It is a
configuration repo, not an application: agents, commands, skills, instructions,
and a Rust memory MCP server. The model is frozen; only the harness changes.

Start here:

- [Harness design](docs/harness-design.md) — five subsystems and the eight editable components
- [Architecture](docs/architecture.md) — components, data flow, boundaries
- [Verification](docs/verification.md) — the three layers and the evidence rule
- [Memory contract](docs/memory-contract.md) — zmem tools, database, retention
- [Guardrails](docs/guardrails.md) — permissions, denied operations, threat model
- [Quality document](docs/quality-document.md) — module health scores and known gaps
- [Environment](docs/environment.md) — Windows toolchain, WSL bash trap, MCP rebuild
- [Dependencies](docs/dependencies.md) — what the lock is and how to restore it
- [Decisions](.harness/decisions/INDEX.md) — numbered ADRs, indexed by this file
- [Progress](.harness/PROGRESS.md) — session state, verification status, next steps

## Clock In

Before changing anything:

1. `pwd` and confirm the repo root.
2. Read `.harness/PROGRESS.md` for the current verified state and next step.
3. Read `feature_list.json` and pick the highest-priority `planned` feature.
4. Review recent commits with `git log --oneline -5`.
5. `uv sync --project scripts` if `scripts/.venv` is missing, then `uv run --project scripts zara-cli init` (submodule, binary, config, deterministic tests).

If the baseline is red, fix that first. Do not stack new work on a broken state.

## Verification

The repository is consistent when `make check` exits 0.

| Command | Scope | Cost |
|---|---|---|
| `make test` | config references, agent load, deterministic | seconds |
| `make check` | arch rules, config refs, MCP export sync, secrets, MCP health | seconds |
| `make e2e` | real model run, end to end | one model call |
| `make verify-feature F=<id>` | one feature, layered gates | seconds |
| `make clean-check` | clock-out checklist | seconds |

Three layers, in order: L1 static (`make test`), L2 runtime (`make check` — MCP
and config actually load), L3 end to end (`make e2e` — real agent run). Do not
proceed to layer N+1 if layer N fails. Layer 3 is required when a change crosses
component or domain boundaries: agent prompts, MCP surface, shared skills.

## Scope

- WIP=1: only one feature may be `active` at a time.
- State machine: `planned` -> `active` -> `passing`, with `blocked` as a documented side state.
- Pick the highest-priority `planned` feature and finish it before activating another.
- Each feature must be completable in one session. If it spans sessions, split it.
- Never set `state: passing` by hand. Run `make verify-feature F=<id>`; the gate
  writes the state and the evidence. (source: earlier false "done" reports)

## State Files

- `.harness/PROGRESS.md` — verified state, in progress, next steps, blockers.
- `.harness/decisions/INDEX.md` — index of the numbered ADRs in `.harness/decisions/`.
- `feature_list.json` — machine-readable scope and evidence; source of truth.
- `.harness/traces/traces.jsonl` — runtime trace, gitignored.
- `.harness/ledger.jsonl` — Harness2 improvement ledger, tracked.
- Memory: `~/.zara/memory.db` through the `Orchestrator` MCP (zmem-mcp).

## Definition of Done

A feature is done only when all of these are true:

1. The user-visible behavior is implemented.
2. The layered verification actually ran and passed.
3. Evidence is recorded in `feature_list.json` (gate output) and `.harness/PROGRESS.md`.
4. `make clean-check` passes and a fresh session can start from `uv run --project scripts zara-cli init`.

Code written is not evidence. Confidence is not evidence. A passing command is.

## Constraints

- MUST keep the MCP host key `Orchestrator`; every agent prompt references it.
  (why: renaming breaks all agents at once)
- MUST NOT register an OpenCode v1 plugin in `opencode.json`.
  (why: V2 rejects the v1 plugin API and fails config load)
- MUST NOT hardcode absolute drive paths in the repo config; use repo-relative paths.
  (why: the repo is shared across machines; ARCH-004 enforces it)
- MUST update docs in the same commit as the behavior they describe.
  (why: stale docs mislead the next session)
- MUST keep one logical change per commit; the repo is consistent after every commit.
  (source: harness audit L03)
- MUST NOT delete or rewrite a feature to hide unfinished work.
  (source: scope drift incidents)
- MUST stop and record state when context runs low; do not rush a finish.
  (source: rushed sessions left half-applied edits)

## Architecture Boundaries

- `.opencode/agent/` — prompts only; no scripts, no secrets.
- `.opencode/commands/` — templates only; referenced agents must exist.
- `.opencode/skills/` and `additional-skills/` — knowledge and procedures; no runtime code.
- `.opencode/instructions/` — shared rules; agent files inherit them.
- `scripts/` — harness gates; deterministic unless the name is `e2e`.
- `..harness/` — improvement loop; dry-run by default.
- `mcp/zarust-memory/` — git submodule; edit only as a deliberate patch.

`make check-arch` enforces these. Every new error category found in review
becomes a rule in `...harness/arch-rules.json` with WHAT / WHY / FIX text.

## Observability

- Before a feature: fill `templates/sprint-contract.md` (scope, DoD, exclusions).
- During verification: `make session-start` and `make session-end` write trace events.
- After a feature: score it against `templates/evaluator-rubric.md`; every
  dimension must reach B or above before the next feature starts.
- After a session: update `docs/quality-document.md` for the module you touched.

## Cleanup: Two Modes

- Immediate, every session end: remove temp files, stray `*.orig`/`*.rej`/`*.bak`,
  dead debug logs, and any file you created but did not keep. `make clean-check`
  catches the obvious ones.
- Periodic, weekly or before a release: full sweep for structural drift. Stale
  docs, orphaned agent or command files, skills nobody loads, arch rules that no
  longer match the tree, `...harness/ledger.jsonl` lines that were never composed.
  Record what you removed and why in `.harness/PROGRESS.md`.

Immediate cleanup keeps the tree usable; the periodic sweep keeps it honest.

## Clock Out

1. Update `.harness/PROGRESS.md` (current state, next step, blockers).
2. Update `feature_list.json` through the gate, never by hand.
3. Remove debug artifacts and temp files.
4. Run `make clean-check` and `make check`.
5. Commit one logical change with a message that explains why.
6. Leave the restart path: a fresh session runs `uv run --project scripts zara-cli init` and continues.

## Context Budget

Subagent context stays under 1000 tokens: task, paths, acceptance, return format.
Return summaries and diffs, not traces. After compaction, re-read `.harness/PROGRESS.md`
and `git log`, never memory.
