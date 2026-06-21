# Loop Design Patterns

A catalog of reusable loop structures. Pick the pattern that matches your situation.

## Plan-Act-Verify

```
Define plan → Execute step → Verify → Next step (or repair)
```

**Use for**: Feature implementation, multi-file changes, well-understood tasks.
**Stop when**: All planned steps verified. Acceptance criteria met.
**Key**: Plan is a guide, not a contract. Adjust based on observations.

## Hypothesis-Test

```
Form hypothesis → Design test → Execute → Observe → Update hypothesis
```

**Use for**: Debugging, investigation, root cause analysis.
**Stop when**: Hypothesis confirmed by evidence and fix verified.
**Key**: Each iteration must either confirm or eliminate a hypothesis.

## Narrow-and-Expand

```
Start minimal → Prove it works → Expand scope → Verify → Expand more
```

**Use for**: Refactoring, replacing implementations, adding capabilities incrementally.
**Stop when**: Full scope covered and tests pass.
**Key**: Never expand until current scope is verified working.

## Spike-Then-Implement

```
Quick prototype → Learn constraints → Discard spike → Proper implementation
```

**Use for**: Unknown territory, new APIs, unfamiliar frameworks.
**Stop when**: Spike answers the unknowns. Implementation passes tests.
**Key**: The spike is disposable. Don't polish it. Its only job is learning.

## Incremental Migration (Strangler Fig)

```
Identify one path → Migrate it → Verify → Next path → Repeat → Remove old
```

**Use for**: Framework upgrades, database migrations, API version transitions.
**Stop when**: All paths migrated, old system removed.
**Key**: Both old and new coexist during migration. Never big-bang.

## Canary

```
Change one instance → Monitor → Clean? Expand → Problem? Rollback
```

**Use for**: Deployment, risky configuration changes, infrastructure updates.
**Stop when**: Full rollout complete or problem detected and rolled back.
**Key**: Blast radius starts minimal and grows only with evidence of safety.

## Bisect

```
Define search space → Test midpoint → Eliminate half → Repeat
```

**Use for**: Root cause analysis, finding which commit broke things, narrowing failure source.
**Stop when**: Search space is 1 (root cause found).
**Key**: Each iteration halves the problem space. O(log n) convergence.

## Backtrack

```
Try approach → Detect dead end → Revert → Try different approach
```

**Use for**: Exploration, uncertain solutions, creative problem-solving.
**Stop when**: Working approach found or all approaches exhausted.
**Key**: Revert cleanly. Don't carry dead-end code forward. Git stash/branch helps.

## Escalation

```
Inner loop fails → Escalate to outer loop → Still fails → Escalate to human
```

**Use for**: Complex blockers, architectural issues, ambiguous requirements.
**Stop when**: Resolution found at appropriate level.
**Key**: Each escalation level has more context but is slower. Exhaust fast options first.

## Parallel Exploration

```
Try N approaches simultaneously → Evaluate results → Pick winner
```

**Use for**: Uncertain solutions with multiple viable paths. Time-sensitive decisions.
**Stop when**: One approach clearly wins on criteria (correctness, simplicity, performance).
**Key**: Define evaluation criteria before starting. Otherwise you can't pick a winner.
