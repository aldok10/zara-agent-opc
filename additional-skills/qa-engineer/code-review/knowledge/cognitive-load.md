---
type: fact
title: "Cognitive Load in Code Reviews"
---

# Cognitive Load in Code Reviews

## Why Cognitive Load Matters

High cognitive load in reviews leads to:
- Rubber-stamping (approving without understanding)
- Missed defects in large changesets
- Reviewer fatigue and declining quality over time
- Slower review cycles (context-switching cost)

## PR Size Limits

### Research-Backed Guidelines

| Lines Changed | Review Quality | Time to Review | Defect Detection |
|---|---|---|---|
| <200 | High | <30 min | ~60-70% |
| 200-400 | Moderate | 30-60 min | ~40-50% |
| 400-800 | Low | 60-90 min | ~20-30% |
| >800 | Very low | >90 min | <15% |

### Practical Limits
- Target: <400 lines changed per PR
- Hard limit: 800 lines (split required)
- Exception: generated code, migrations, vendor updates (review differently)
- Measure: lines of logic changed, not total diff (ignore formatting, imports)

### Splitting Strategies
- Separate refactoring from behavior changes
- Infrastructure/config changes in dedicated PRs
- One concern per PR (don't mix bug fix with feature)
- Stacked PRs for large features (base → layer 1 → layer 2)

## Context Switching Cost

### The 23-Minute Problem
Studies show it takes ~23 minutes to regain deep focus after interruption. Code review IS an interruption.

### Mitigation
- Batch review time: dedicated slots (e.g., 10am, 2pm)
- Don't review between deep work sessions
- Review related PRs in sequence (shared context)
- Limit reviews to 3-4 per session maximum
- Take breaks between unrelated reviews

### Reviewer Load Balancing
- Max 5 active review requests per person
- Rotate primary reviewer assignment
- Track review load per sprint (aim for even distribution)
- Auto-assign based on code ownership and current load

## Review Checklists

### Structural Checklist (first pass)
- [ ] PR description explains WHY, not just WHAT
- [ ] Changes match stated scope (no scope creep)
- [ ] Tests added/modified for behavioral changes
- [ ] No unrelated changes mixed in

### Logic Checklist (deep pass)
- [ ] Error handling covers failure modes
- [ ] Edge cases addressed (null, empty, boundary)
- [ ] State mutations are intentional and safe
- [ ] Concurrency/race conditions considered
- [ ] Security implications evaluated (input validation, auth)

### Style Checklist (light pass)
- [ ] Naming is clear and consistent
- [ ] No dead code or commented-out blocks
- [ ] Formatting matches project standards (automate this)
- [ ] Comments explain WHY, code explains WHAT

## Nitpick vs Blocking

### Blocking (request changes)
- Correctness bugs (wrong behavior)
- Security vulnerabilities
- Data loss potential
- Missing error handling for critical paths
- Breaking API contracts
- Missing tests for new behavior

### Nitpick (comment, don't block)
- Style preferences beyond linter rules
- Alternative approaches that aren't clearly better
- Variable naming suggestions
- Minor refactoring opportunities
- Documentation improvements

### Signaling Convention
```
nit: Consider renaming `data` to `userProfile` for clarity

blocking: This query is vulnerable to SQL injection — use parameterized query

question: What happens if `userId` is null here? I see no guard.

suggestion: You could use Array.filter() here instead of the loop, 
but the current approach works fine too.
```

## Reducing Reviewer Cognitive Load

### Author Responsibilities
- Self-review before requesting (catch obvious issues)
- Write descriptive PR title and description
- Add inline comments explaining non-obvious decisions
- Highlight risky areas ("please look closely at X")
- Keep PRs focused on one logical change
- Provide testing evidence (screenshots, test output)

### Automation (remove from human review)
- Formatting → Prettier/gofmt/black (zero discussion)
- Lint rules → ESLint/golangci-lint (objective, automated)
- Type safety → TypeScript/mypy (compiler catches it)
- Dependency checks → Dependabot/Renovate
- Security scanning → Snyk/CodeQL (flag, human triages)
- Test coverage → report in PR (threshold gate)

### Review Tooling
- File-by-file review (don't view entire diff at once)
- Mark files as reviewed (track progress)
- Collapse generated/vendor files by default
- Syntax highlighting in review tool (never review raw diff)

## Anti-Patterns

- "LGTM" without evidence of reading (especially on large PRs)
- Gatekeeping via style opinions not in linter rules
- Review ping-pong (>3 rounds indicates unclear requirements)
- Reviewing while multitasking (half attention = missed bugs)
- Perfectionism blocking progress (good enough > perfect later)
- Using review as teaching moment for 20+ comments (do pairing instead)

## Metrics to Track

- Time-to-first-review (target: <4h during business hours)
- Review rounds before merge (target: ≤2)
- PR size distribution (flag outliers)
- Defects found in review vs production (review effectiveness)
- Reviewer load balance across team
