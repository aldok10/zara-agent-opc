---
name: verification-before-completion
description: Use when about to claim work is complete or fixed — requires running verification commands before making success claims
triggers:
  - about to say "done", "fixed", "working", "complete"
  - before committing changes
  - after implementing a fix or feature
---

# Verification Before Completion

## The Iron Law

NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.

Never say "done" based on what you think will happen. Say "done" based on what you observed happen.

## The Gate Function

Every completion claim must pass through this gate:

1. **IDENTIFY** — What command proves the claim?
2. **RUN** — Execute the full command fresh (not cached, not from memory)
3. **READ** — Full output + exit code
4. **VERIFY** — Output confirms claim (not "looks right" — actually confirms)
5. **CLAIM** — Only now state the result

If any step fails, you are not done. Go back to implementation.

## Common Failures

| Claim | Required Evidence | NOT Sufficient |
|-------|-------------------|----------------|
| "Tests pass" | Test output showing 0 failures | "should pass", "I fixed the test" |
| "Build succeeds" | Build command exit 0 | "linter passed", "no syntax errors" |
| "Bug fixed" | Original symptom test passes | "code changed", "logic looks correct" |
| "Feature works" | Relevant test or demo output | "implemented per spec" |
| "Type errors resolved" | Typecheck exit 0 | "removed the offending line" |
| "Lint clean" | Lint command exit 0, no warnings | "fixed the flagged issue" |

## Red Flags — Stop and Verify

You are about to violate the iron law if you catch yourself:

- Using "should", "probably", "seems to", "likely works"
- Expressing satisfaction before running verification
- About to commit without running tests/build
- Trusting your own success reports without evidence
- Saying "I'm confident" without command output backing it

## Rationalization Prevention

| You're Thinking | What To Do Instead |
|-----------------|-------------------|
| "Should work now" | RUN IT |
| "I'm confident this fixes it" | Confidence is not evidence. RUN IT |
| "Just this once I'll skip" | No exceptions. RUN IT |
| "The change is trivial" | Trivial changes break things. RUN IT |
| "I already ran it earlier" | Earlier is not now. RUN IT AGAIN |

## Key Patterns

**Tests:**
```
run test command → see "X passed, 0 failed" in output → THEN claim "tests pass"
```

**Build:**
```
run build command → see exit code 0 → THEN claim "build succeeds"
```

**Bug fix:**
```
run reproduction steps → see correct behavior → THEN claim "bug fixed"
```

**Requirements:**
```
re-read the plan → make checklist → verify each item has evidence → THEN claim "complete"
```

## Integration

This skill activates automatically at the boundary between implementation and communication. The moment you're about to tell the user something works — pause — and run the gate function.

## Bottom Line

Run the command. Read the output. THEN claim the result.

Non-negotiable.

## Related Knowledge (load on demand)

- `knowledge_load(section: "testing")` — when verifying test strategies
- `knowledge_search("observability")` — when verifying monitoring/logging

## Related Skills

| When | Load |
|------|------|
| Work verified, ready to integrate | `finishing-branch` |
| Need code review | `code-review` |
