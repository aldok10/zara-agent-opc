---
name: verification-before-completion
description: Run verification commands before claiming done
triggers:
  - about to say "done", "fixed", "working", "complete"
  - before committing changes
  - after implementing a fix or feature
---

# Verification Before Completion

NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE. Say "done" based on what you observed, not what you think will happen.

## Scope

- HANDLES: completion gate, evidence requirements, minimal-diff check, confidence check, failure recovery.
- DEFERS: integration to `finishing-branch`; review to `code-review`.

## First Action

Identify the exact command that proves the claim, then run it fresh (not cached, not from memory).

## The Gate (every completion claim)

1. IDENTIFY - what command proves the claim?
2. RUN - execute fresh, full command.
3. READ - full output + exit code.
4. VERIFY - output confirms claim (not "looks right").
5. CLAIM - only now state the result.

Any step fails, you are not done. Back to implementation.

## Constraints

1. Run the command. Read the output. Then claim. Non-negotiable.
2. Walk the diff line by line: every changed line justifiable by the task.
3. No "while I'm here" changes; note out-of-scope fixes as follow-ups.
4. Three similar lines beats a premature abstraction (extract at the fourth).
5. Bug fix = only the fix; refactoring gets its own commit.

## DO NOT

- Use "should", "probably", "seems to", "likely works" as evidence.
- Express satisfaction before running verification.
- Commit without running tests/build.
- Trust your own success reports without command output.
- Fix a correct test just to make it pass. Never suppress errors.

## Evidence Required

| Claim | Evidence | NOT sufficient |
|-------|----------|----------------|
| "Tests pass" | Output: 0 failures | "should pass", "I fixed it" |
| "Build succeeds" | Exit 0 | "no syntax errors" |
| "Bug fixed" | Original symptom test passes | "logic looks correct" |
| "Feature works" | Test/demo output | "implemented per spec" |
| "Type errors resolved" | Typecheck exit 0 | "removed the line" |
| "Lint clean" | Lint exit 0, no warnings | "fixed the flagged issue" |

## Rationalizations (all → RUN IT)

"Should work now" · "I'm confident" (confidence ≠ evidence) · "Just this once" · "Trivial change" (trivial breaks things) · "I ran it earlier" (earlier ≠ now).

## Failure Recovery

1. First failure: fix the specific error, re-run.
2. Second (same area): step back, re-read failing code AND test. Is the test correct? Is the approach sound?
3. Third: STOP, you're in a loop. State what you tried, what failed, believed root cause. Try a fundamentally different approach or escalate.

## Confidence Check (complex/ambiguous only)

1. Re-read the original requirement: does output answer what was asked?
2. List unstated assumptions: would the answer change if one was wrong?
3. Confidence <70%? Say so: "I'm ~60% confident because X is unclear."

Skip for trivial tasks.

## Verification

- Command output + exit code shown before any completion claim.
- Diff contains only task-justified changes.

## Related Skills

| When | Load |
|------|------|
| Verified, ready to integrate | `finishing-branch` |
| Need code review | `code-review` |
