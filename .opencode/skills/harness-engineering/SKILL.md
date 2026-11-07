---
name: harness-engineering
description: "Load when installing or repairing this repo's harness, adding a verification gate, tuning an agent prompt, or auditing a repo against the five subsystems and eight editable components."
---

# Harness Engineering

The model is frozen. Only the environment around it changes.

## Scope

- HANDLES: harness install and repair, gate design, agent prompt tuning, subsystem audit, state and scope discipline.
- DEFERS: feature code to `@forge`; architecture to `@atlas`; test design to `@probe`; threat model to `@shield`.

## When to Load

- Installing or repairing the harness in a repo.
- Adding, changing, or debugging a verification gate.
- Tuning an agent prompt, subagent budget, or skill.
- Auditing a repo against the five subsystems.
- A session needs the clock-in / clock-out contract.

## When Not to Load

- Writing product code. Use the language expert skill.
- Debugging a specific failure. Use `systematic-debugging` first, then come back.
- Designing features. Use `engineering-workflow`.

## Five Subsystems

| Subsystem | Job | Repo file |
|---|---|---|
| Instructions | startup path, rules, definition of done | `AGENTS.md`, `docs/` |
| State | what is done, what is next, why | `PROGRESS.md`, `DECISIONS.md`, `feature_list.json` |
| Verification | only passing commands count | `Makefile`, `scripts/verify_feature.py`, `...harness/arch-rules.json` |
| Scope | one feature at a time, explicit done | `feature_list.json`, `templates/sprint-contract.md` |
| Lifecycle | initialize, verify, clean exit | `uv run --project scripts zara-cli init`, `zara-cli clean-check`, `templates/session-handoff.md` |

One subsystem per change. Mixed edits cannot be attributed.

## Eight Editable Components (Harness2)

| Component | Where it lives here | Change it when |
|---|---|---|
| System prompt | `.opencode/instructions/system.md`, `system-extended.md`, `.opencode/agent/*.md` | behavior rules or role framing drift |
| Guardrails | `opencode.json` `permission`, `...harness/arch-rules.json`, `AGENTS.md` constraints | a failure must become impossible |
| Memory | `mcp/zarust-memory` (zmem-mcp), `~/.zara/memory.db`, `PROGRESS.md`, `DECISIONS.md` | recall is wrong or evidence is lost |
| Tool guidance | `AGENTS.md` MCP reference, `.opencode/skills/` | a tool is used incorrectly |
| Subagents | `.opencode/agent/*.md`, registered in `opencode.json` | delegation or budgets are wrong |
| Skills | `.opencode/skills/`, `additional-skills/` | a procedure repeats |
| Scripts | `scripts/`, `Makefile`, `uv run --project scripts zara-cli init` | a check is manual or flaky |
| Plugins | none by design | never; V2 rejects the v1 plugin API |

The improvement loop lives in `..harness/` once H07 lands; its evidence is
`...harness/ledger.jsonl`. No contrast, no adoption.

## Workflow

1. **Clock in.** `uv run --project scripts zara-cli init`. Read `PROGRESS.md` and `feature_list.json`. Red baseline stops here.
2. **Pick one planned feature.** The `active` one, else the lowest-number `planned`. WIP=1.
3. **Run the gate.** `make verify-feature F=<id>`.
4. **Fix on failure** with WHAT / WHY / FIX. WHAT is the failing layer. WHY is its `cmd`. FIX is its `repair` text. Rerun the gate. Never patch the state file.
5. **Record evidence.** The gate appends the evidence line; copy the summary into `PROGRESS.md`.
6. **Clock out.** `make check`, `make clean-check`, one commit, restart path intact.

Layer order is fixed: L1 `make test`, L2 `make check`, L3 `make e2e`. Do not run
L2 while L1 is red. L3 is required when the change crosses agent prompts, the MCP
surface, or shared skills.

## Commands

```bash
uv run --project scripts zara-cli init       # clock in: setup, tests, next feature
make test                             # L1 deterministic config and agent load
make check                            # L2 arch rules, config, MCP health
make e2e                              # L3 real agent run, one model call
make verify-feature F=<id>            # one feature, layered gate, writes evidence
make vcr                              # passing / activated feature ratio
make check-arch                       # architecture rules only
make clean-check                      # clock-out checklist
uv run --project scripts zara-cli audit      # five-subsystem audit (L03-L12)
```

`make audit` runs the same audit. `make setup`, `make session-start`, and
`make session-end` cover environment and trace events.

## Hard Rules

1. One active feature. Two `active` is a gate failure, not a judgment call.
2. State changes only through the gate. `make verify-feature F=<id>` writes status and evidence together.
3. No hand-edited passing state. A passing flag without a gate run is a false report.
4. Docs change in the same commit as the behavior they describe.
5. One logical change per commit; the repo is consistent after every commit.
6. Every new error category becomes a rule in `...harness/arch-rules.json` with WHAT / WHY / FIX.

## Verify Your Own Work

Run the skill's checklist once: `checklist.md`. Failure modes to avoid:
`anti-patterns.md`. Run `/harness <id>` for the loop end to end.
