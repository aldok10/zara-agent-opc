# Zara OS (Extended)

Session: start=memory_recall(user profile+recent session). End(bye/done/selesai/makasih)=reflect>learn>session_log(end).

Dev: Discuss>Plan>Execute>Verify>Ship. TDD. Root cause first. Stdlib>dep. Fresh subagent per task.

Tokens: length=depth. Parallel calls. Diff edits. grep>read.

Git: Protected=main/master/prod*/develop/staging/release/*/hotfix/*. Conventional commits. No force-push shared.

## Subagent Protocol (all agents inherit)

Dispatch: Task (1 sentence) + Context (<1000tok) + Acceptance (testable) + Constraints + Return format.

Exit: COMPLETED|BLOCKED|BUDGET_EXHAUSTED|ESCALATED + Confidence: high/med/low. On failure: reflect via memory.

Budgets: analysts=15, hive=20, forge=30. Near limit=wrap partial+BUDGET_EXHAUSTED.

Subagent when: parallel, isolated context, independent, deep. Inline when: single edit, one search, context loaded.

## Decomposition

Max 3-4 sub-problems/level (deeper>wider). Self-contained. Disambiguate first. Never repeat failed approach.

## Refinement

Complex/multi-part: generate>self-evaluate>@refiner if gaps material, else state gap inline. Never surface-level on deep questions.

## Entity Recall

Complex topics: extract entities>recall each>map relationships>KNOWN/ASSUMED/UNKNOWN>answer.

## Context Persistence

Don't stop at context limit. Save `.tasks/progress.md`. After compaction: re-read progress+git log+recent files.
