# Subskill: Code Review

> Activate when: PR review, code review, review checklist, conventional comments, stacked PR, review metrics, CODEOWNERS
>
> Actionable feedback. Nit != blocker. Automated before human. Small PRs. Rotate reviewers.

## Golden Rules

1. PRs under 400 lines (split larger changes into stacked PRs)
2. 2+ reviewers for critical paths (auth, payments, data)
3. Review response time under 4h during business hours
4. Prefix comments: `nit:`, `suggestion:`, `issue:`, `question:`, `praise:`
5. Automated checks pass BEFORE human review (don't waste reviewer time)
6. Self-review diff before requesting others
7. Approve with comments = "fix these, no re-review needed"
8. Request changes = "must address before merge"
9. Link to relevant docs/ADRs in comments

## Conventional Comments

```
suggestion: Consider using a Map here for O(1) lookups.
issue (blocking): This SQL query is vulnerable to injection -- use parameterized queries.
nit (non-blocking): Prefer `const` over `let` since this isn't reassigned.
question: What happens if this API returns a 429? I don't see retry logic.
thought: This might be cleaner as a state machine, but not blocking.
praise: Great test coverage on the edge cases here!
```

## Review Checklist

### Correctness
- [ ] Logic matches requirements/acceptance criteria
- [ ] Edge cases handled (null, empty, overflow, concurrent access)
- [ ] Error paths handled (what if this fails?)
- [ ] No off-by-one errors in loops/pagination

### Security
- [ ] No hardcoded secrets or credentials
- [ ] Input validated and sanitized
- [ ] Auth/authz checks present where needed
- [ ] No SQL injection, XSS, CSRF vulnerabilities
- [ ] Sensitive data not logged

### Performance
- [ ] No N+1 queries
- [ ] Appropriate indexing for new queries
- [ ] No unbounded collections (pagination, limits)
- [ ] Expensive operations not in hot paths

### Testing
- [ ] New code has tests (unit + integration where appropriate)
- [ ] Tests verify behavior, not implementation
- [ ] Edge cases covered in tests
- [ ] No flaky patterns (sleep, shared state, ordering)

### Readability
- [ ] Clear naming (intent, not implementation)
- [ ] No dead code or commented-out code
- [ ] Functions focused (single responsibility)
- [ ] Complex logic documented with WHY comments

## Stacked PRs Pattern

```
main
 └── feature/auth-base (models, interfaces) -- PR #1 (200 lines)
      └── feature/auth-api (endpoints) -- PR #2 (300 lines)
           └── feature/auth-ui (frontend) -- PR #3 (250 lines)
```

**Benefits:** Each PR reviewable in <30 min, independent merge, clearer context.
**Tools:** Graphite, git-town, ghstack

## Automation

| Tool | Purpose |
|------|---------|
| CODEOWNERS | Auto-assign reviewers by path |
| danger.js | PR size warnings, missing tests, changelog |
| Reviewbot | Automated nit-picking (style, imports) |
| Required checks | CI green before review allowed |
| PR templates | Structured description (what, why, testing) |

## Metrics to Track

- **Review time**: first response <4h, total cycle <24h
- **PR size**: avg lines changed (target: <300)
- **Revision cycles**: times back to author (target: <2)
- **Reviewer distribution**: bus factor (no single bottleneck)
- **Defect density**: issues found per 100 lines reviewed

## Anti-Patterns

- Rubber-stamp approvals (accountability)
- Blocking on style covered by linter (automate it)
- Rewriting code in review (suggest, don't prescribe)
- PRs open >3 days without action
- Reviewing >400 lines in one sitting (diminishing attention)
- Gatekeeping instead of coaching

## AI-Era Context (2026)

AI automates style, lint, and formatting comments -- freeing human reviewers to focus on logic, architecture, and intent. Conventional comments (suggestion/issue/nitpick labels) provide structured feedback that AI can also generate. AI detects common patterns: missing error handling, untested branches, and security anti-patterns. However, architectural coherence, naming quality, and design trade-off evaluation remain human responsibilities. The risk: reviewers rubber-stamp because "AI already checked it" -- AI catches patterns, not design flaws.

## Knowledge

- `subskills/review-checklist.md` -- review checklist by concern area
- `subskills/pr-workflow.md` -- PR lifecycle and stacked PRs
- `subskills/automation-tools.md` -- review automation tooling
- `subskills/metrics.md` -- review cycle metrics and targets

## Delegates To

- **security-testing** for security-focused review
- **testing-strategy** for test quality assessment
- **git-expert** for stacked PR workflow mechanics
