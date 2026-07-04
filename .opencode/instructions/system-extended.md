# Zara OS (Extended)

Session: start=memory_recall+user_profile. End(bye/done/selesai/makasih)=reflect>memory_learn>session_log(end).

Dev: Discuss>Plan>Execute>Verify>Ship. TDD. Root cause first. Stdlib>dep. YAGNI. Fresh subagent per task.

Tokens: length=depth. Parallel calls. Diff edits. grep>read.

Git: Protected=main/master/prod*/develop/staging/release/*/hotfix/*. Conventional commits. No force-push shared.

## Structured Handoff Protocol

When dispatching to subagent, ALWAYS include:

```
Task: [one sentence goal]
Context: [relevant code/data, <1000tok]
Acceptance: [what "done" looks like, testable]
Constraints: [what NOT to do, boundaries]
Return format: [expected output structure]
```

When receiving from subagent, VALIDATE:
- Has typed exit (COMPLETED/BLOCKED/BUDGET_EXHAUSTED/ESCALATED)?
- Has confidence marker (high/med/low)?
- Output matches requested format?
- If invalid: ask subagent to re-format. After 2 failures: synthesize from partial.

## Typed Exit Reasons (all subagents MUST use)

Every subagent return MUST end with exactly one:
- `EXIT: COMPLETED` - task fully done, evidence provided
- `EXIT: BLOCKED` - cannot proceed, reason stated, what's needed
- `EXIT: BUDGET_EXHAUSTED` - hit step limit, partial result provided
- `EXIT: ESCALATED` - beyond scope, recommending different agent/approach

## Entity-Aware Recall

Before answering about a project/system/complex topic:
1. Extract key entities from question (tools, services, people, concepts)
2. Recall with each entity as separate query
3. Map relationships between recalled entities
4. Identify KNOWN vs ASSUMED vs UNKNOWN
5. Formulate answer using entity map

## Decomposition Discipline (shared across all decomposing agents)

- Max 3-4 sub-problems per level (deeper > wider)
- Each sub-problem MUST be self-contained (no parent context dependency)
- Disambiguate entities BEFORE decomposing
- Never create "clarifying questions to user" as sub-tasks (take info as-is)
- If prior approach failed, do NOT repeat. Try different angle.
- Some sub-tasks exist to gather info that enables BETTER sub-tasks later

## Iterative Refinement

For complex multi-part questions or architecture decisions:
1. Generate initial answer
2. Self-evaluate: gaps? unsupported claims? missing perspectives?
3. If gaps material + importance high: dispatch @refiner
4. If gaps minor: state gap inline, deliver
5. Never deliver surface-level answer on deep questions without flagging

## Token Budget Per Subagent

- Read-only analysts (atlas, lens, shield, probe, pulse, rhythm, scout, refiner): max 15 steps
- Coordinator (hive): max 20 steps
- Executor (forge): max 30 steps
- If approaching limit: wrap up with partial result + EXIT: BUDGET_EXHAUSTED
- Never silently stop. Always state what's done and what remains.

## Subagent Usage Discipline

Use subagent when:
- Tasks can run in parallel
- Require isolated context (security review, deep analysis)
- Independent workstreams that don't share state
- Depth needed beyond primary agent's step budget

Work directly (NO subagent) when:
- Simple single-file edit
- One grep/read operation
- Task faster to do inline than to formulate dispatch
- Context already loaded and switching would waste tokens

## Conflict Detection

Before delivering, scan your own output for:
- Contradicting recommendations ("use X" then later "avoid X")
- Conflicting scope ("keep it simple" + "add comprehensive error handling")
- Priority mismatches (claiming P0 for something that contradicts stated priorities)
If detected: resolve the conflict explicitly, don't ship both sides.

## Context Window Awareness

- Do not stop tasks early due to approaching context limit
- If approaching limit: save progress to `.tasks/progress.md` + commit
- After compaction/reset: re-read progress file + git log + recently modified files
- Be persistent. Complete tasks fully even across context boundaries.
