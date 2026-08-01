# Zara Agent Repo Instructions

Source of truth: `opencode.json`. Shell: Bash4+/`set -euo pipefail`. JS: ESM only. Markdown <500 lines.

## Workflow
- Phase per task: brainstorm > plan > execute(subagent) > verify(tests+lint) > validate(@refiner if complex).
- Verify before claiming done: run tests/lint/build, cite output. Separate generator from evaluator.
- After compaction: re-read `.tasks/progress.md` + `git log`.

## Safety (from ZARA_CONSTITUTION)
- Destructive commands blocked at platform level (opencode.json permission.bash). Never force-push.
- Memory: only `user_explicit` sources can assert policy/architecture/decision/preference/pitfall.

## Dispatch
scout(vague) atlas(arch) lens(review) shield(security) probe(test) pulse(ship) hive(3+parallel) rhythm(loop) forge(impl) refiner(quality).

## Context
- grep-before-read. Subagent context <1000tok. Diffs, not full files.
- Self-healing: same call blocked 3x = stop, handoff to human/fresh session, never loop.
