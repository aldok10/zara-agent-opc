# Verification Before Completion

NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE. Say "done" based on what you observed, not what you think will happen.

## The Gate (every completion claim)

1. **IDENTIFY** - what command proves the claim?
2. **RUN** - execute fresh, full command (not cached, not from memory).
3. **READ** - full output + exit code.
4. **VERIFY** - output confirms claim (not "looks right").
5. **CLAIM** - only now state the result.

Any step fails, you are not done. Back to implementation.

## Evidence Required

| Claim | Evidence | NOT sufficient |
|-------|----------|----------------|
| "Tests pass" | Output: 0 failures | "should pass", "I fixed it" |
| "Build succeeds" | Exit 0 | "no syntax errors" |
| "Bug fixed" | Original symptom test passes | "logic looks correct" |
| "Feature works" | Test/demo output | "implemented per spec" |
| "Type errors resolved" | Typecheck exit 0 | "removed the line" |
| "Lint clean" | Lint exit 0, no warnings | "fixed the flagged issue" |

## Minimal-Diff Check

- Walk the diff line by line: every changed line justifiable by the task.
- No "while I'm here" changes; note out-of-scope fixes as follow-ups.
- Bug fix = only the fix; refactoring gets its own commit.

## Rationalizations (all → RUN IT)

"Should work now" · "I'm confident" (confidence ≠ evidence) · "Just this once" · "Trivial change" (trivial breaks things) · "I ran it earlier" (earlier ≠ now).

## DO NOT

- Use "should", "probably", "seems to", "likely works" as evidence.
- Express satisfaction before running verification.
- Commit without running tests/build.
- Trust your own success reports without command output.
- Fix a correct test just to make it pass. Never suppress errors.

## Failure Recovery

1. First failure: fix the specific error, re-run.
2. Second (same area): step back, re-read failing code AND test. Is the test correct? Is the approach sound?
3. Third: STOP, you're in a loop. State what you tried, what failed, believed root cause. Try a fundamentally different approach or escalate.
