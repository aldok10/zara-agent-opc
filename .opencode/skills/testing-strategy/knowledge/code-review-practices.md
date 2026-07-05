---
type: fact
title: "Code Review Practices"
---
# Code Review Practices

## Core Principles (Google's Approach)

1. Code review exists to maintain code health over time
2. Reviewers should approve if the change improves overall code health, even if imperfect
3. No "perfect" code -- only "better" code
4. Technical facts and data override personal preferences
5. Style issues defer to the style guide; if not in the guide, accept the author's approach

## Conventional Comments

Format: `<label>: <message>` with optional decorators

Labels:
- `praise:` -- highlight something done well
- `nitpick:` -- small, non-blocking preference
- `suggestion:` -- propose an improvement (non-blocking unless critical)
- `issue:` -- identifies a problem that must be addressed
- `question:` -- seek understanding (not necessarily a change request)
- `thought:` -- share an idea without requiring action

Decorators:
- `(non-blocking)` -- does not block approval
- `(blocking)` -- must be resolved before merge
- `(if-minor)` -- address only if the fix is small

Example:
```
suggestion (non-blocking): Consider extracting this into a helper
function. It appears in three places with minor variations.
```

## Review Checklist

Correctness:
- Does the code do what it claims?
- Edge cases handled (null, empty, boundary values)?
- Error handling: failures caught, resources cleaned up?
- Concurrency: race conditions, deadlocks, shared state?

Security:
- Input validation at boundaries?
- No secrets in code or logs?
- SQL injection, XSS, CSRF prevention?
- AuthN/AuthZ checks present?

Performance:
- N+1 queries?
- Unnecessary allocations in hot paths?
- Appropriate data structures?
- Pagination for large datasets?

Maintainability:
- Clear naming (reveals intent)?
- Appropriate abstraction level (not too much, not too little)?
- Tests cover the new behavior?
- Breaking changes documented?

## Automation

Pre-review automation (catch before human review):
- Linters (Biome, ESLint, Ruff): style and basic correctness
- Formatters (Prettier, Black): eliminate style debates
- Type checkers (tsc, mypy, Pyright): catch type errors
- CODEOWNERS: auto-assign reviewers by path

CI checks that gate merge:
- All tests pass
- Coverage does not decrease
- No new lint violations
- Security scan clean (Semgrep, CodeQL)
- Build succeeds

## PR Size and Cycle Time

Ideal PR:
- Under 400 lines of meaningful changes
- Single logical change (one feature, one bug fix, one refactor)
- Reviewable in one sitting (under 30 minutes)
- Review turnaround under 24 hours

Large changes:
- Split into stacked PRs (each independently reviewable)
- Use feature flags for incomplete features
- Separate refactoring from behavior changes
- Mechanical changes (renames, moves) in dedicated PRs

Metrics to track:
- Time to first review (target: <4 hours during business hours)
- Time to merge (target: <24 hours)
- Review iterations (target: 1-2 rounds)
- PR size distribution (flag outliers)

## Giving and Receiving Feedback

Giving:
- Ask questions before making assumptions about intent
- Distinguish must-fix from nice-to-have (use labels)
- Offer alternatives, not just criticism
- Acknowledge what is done well
- Comment on the code, not the person

Receiving:
- Assume good intent
- Respond to every comment (even if just "Done" or "Acknowledged")
- If you disagree, explain why with reasoning or data
- Large disagreements go to a synchronous discussion
- Thank reviewers for catching issues

Anti-patterns:
- Nitpick storms (dozens of style comments that a linter should catch)
- Drive-by approvals (LGTM without reading)
- Bike-shedding (debating trivial choices while ignoring design issues)
- Holding PRs hostage over personal preferences
