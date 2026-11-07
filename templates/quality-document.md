# Quality Document

Module health record. Copy this template per module; one row per dimension.
Grades describe the module as it is now, not as it was intended. Evidence is a
command or a file path, never an adjective.

- Module:
- Path:
- Owner layer: (agent / scripts / mcp / docs)
- Last graded: (date, commit)
- Graded by:

## Grade Scale

| Grade | Meaning |
|---|---|
| A | Contract holds, gate passed, no open defect |
| B | Contract holds, gate passed, known gaps are documented |
| C | Contract partly holds, or a gate is missing or stale |
| D | Contract broken, or no evidence exists |

A module ships only at B or above. Any dimension at D blocks the next feature
that touches this module.

## Dimension Scores

| Dimension | Question | Grade | Evidence | Note |
|---|---|---|---|---|
| Correctness | Does the behavior match the stated contract? | | | |
| Verification | Did the required gates run, with recorded output? | | | |
| Scope discipline | Did the change stay inside its sprint contract? | | | |
| Reliability | Does it hold on a rerun and from a fresh session? | | | |
| Maintainability | Can the next session read and change it without guessing? | | | |

Evidence examples: `make test` output line, `feature_list.json` evidence entry,
a commit SHA, a trace event in `.harness/traces/traces.jsonl`, a file path.

## Summary

- Weakest dimension:
- Overall grade: (lowest dimension grade)
- Next action:
- Blocks a feature: yes / no

## Known Gaps

Gaps that are accepted, with the reason and the trigger that forces a fix.

| Gap | Impact | Accepted because | Revisit when |
|---|---|---|---|
| | | | |

## Change Log

| Date | Commit | Dimension changed | From | To | Why |
|---|---|---|---|---|---|
| | | | | | |
