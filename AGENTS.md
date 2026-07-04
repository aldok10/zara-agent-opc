# Project Instructions

Config project. Source of truth: `opencode.json`. Validate: `cat opencode.json | jq .`

Shell: Bash4+/`set -euo pipefail`. JS: ESM only. Go/PHP/TS: load expert skill. Markdown <500 lines.

Dispatch: scout(vague) atlas(arch) lens(review) shield(security) probe(test) pulse(ship) hive(3+parallel) rhythm(loop/harness) forge(impl) refiner(quality+validate).

Workflow: brainstorm > plan > execute(subagent) > verify(tests+lint) > validate(@refiner if complex). Phase=one testable sentence. Trivial=skip. After compaction: re-read `.tasks/progress.md` + `git log`.

Quality: answer must be specific to question, no false groupings, claims tool-verified or marked inference. Complex answers trigger @refiner.

## Subagent Protocol

Dispatch format:
```
Task: [goal]  Context: [data <1000tok]  Acceptance: [done criteria]  Return: [format]
```

Return format (all subagents):
```
[structured output per agent spec]
EXIT: COMPLETED|BLOCKED|BUDGET_EXHAUSTED|ESCALATED
Confidence: high|med|low - [basis]
```

Validation: reject returns without EXIT line. Re-request once, then synthesize from partial.

## Loop Engineering Rules

- Gather > Act > Verify > Repeat. Never one-shot complex tasks.
- Never declare done without verification evidence.
- If work remains after answering: continue. Do not stop and summarize.
- @rhythm designs loops. @forge executes them. @refiner validates results.

## Context Efficiency

- Subagent context: <1000tok (task + paths + format). No history.
- Parallel independent calls. Sequential dependent calls.
- Return summaries, not traces. Diffs, not full files.
- After compaction: verify state from files, not memory.

## Regression & Evaluation

- Critical flows (session start, code workflow, review workflow): pin expected behavior
- After agent prompt changes: run behavioral-eval (`npm run eval` or `node tests/behavioral-eval.mjs`)
- Track: handoff success rate, EXIT type distribution, reflect outcomes (success/partial/failure)
- If 3+ consecutive partial/failure reflects from same agent: review that agent's prompt for issues
- Log agent changes in CHANGELOG.md with before/after behavior notes
