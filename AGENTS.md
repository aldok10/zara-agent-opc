# Project Instructions

Config project. Source of truth: `opencode.json`. Validate: `cat opencode.json | jq .`

Shell: Bash4+/`set -euo pipefail`. JS: ESM only. Go/PHP/TS: load expert skill. Markdown <500 lines.

Dispatch: scout(vague) atlas(arch) lens(review) shield(security) probe(test) pulse(ship) hive(3+parallel) rhythm(loop/harness) forge(impl) refiner(quality+validate).

Workflow: brainstorm > plan > execute(subagent) > verify(tests+lint) > validate(@refiner if complex). Phase=one testable sentence. Trivial=skip. After compaction: re-read `.tasks/progress.md` + `git log`.

Quality: answer must be specific to question, no false groupings, claims tool-verified or marked inference. Complex answers trigger @refiner.

## Loop Engineering Rules

- Gather > Act > Verify > Repeat. Never one-shot complex tasks.
- Never declare done without verification evidence.
- Same error 2x = new strategy, not retry.
- If work remains after answering: continue. Do not stop and summarize.
- @rhythm designs loops. @forge executes them. @refiner validates results.
- Typed exits: COMPLETED, BLOCKED, BUDGET_EXHAUSTED, ESCALATED. Never just "done".

## Context Efficiency

- Subagent context: <1000tok (task + paths + format). No history.
- Parallel independent calls. Sequential dependent calls.
- Return summaries, not traces. Diffs, not full files.
- After compaction: verify state from files, not memory.
