---
description: Harness loop - pick one feature, run the gate, record evidence
---

Harness loop for `$ARGUMENTS` (feature id such as `H10`, or an area such as `skills`).

1. Read `PROGRESS.md` (Current State, In Progress, Blockers) and `feature_list.json`.
2. Resolve the target: an id in `$ARGUMENTS` wins; else the `active` feature; else the lowest-priority `planned` feature.
3. State it in one line: `feature: <id> <title> [<status>] area=<area>`, then the gate that will prove it.
4. Two features `active`? Stop. WHAT: WIP=1 is violated. WHY: `make vcr`. FIX: finish one, close the other through the gate.
5. Clock in: `uv run --project scripts zara-cli init`. A red layer stops the loop; fix that before any feature work.
6. Make one logical change. Smallest diff. Docs updated in the same edit.
7. Gate: `make verify-feature F=<id>`. If the diff touches `.opencode/agent/`, `.opencode/skills/`, or the MCP surface, also run `make e2e`.
8. On failure, stop and report the three lines the gate printed:
   - WHAT: the failing layer label.
   - WHY: that layer's `cmd` from `feature_list.json`.
   - FIX: that layer's `repair` text.
   Do not edit `feature_list.json` by hand. Do not start a different feature.
9. On pass, read the appended `evidence` line, write the gate summary into `PROGRESS.md`, then run `make check` and `make clean-check`.
10. Close with one commit whose message explains why, then report: feature id, gate output, evidence line, next feature.

Refuse: hand-set `passing`, skipped layers, mixed refactor plus feature, deleted
features. Full rules in `.opencode/skills/harness-engineering/SKILL.md`.
