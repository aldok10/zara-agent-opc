---
type: subskill
title: "Review Checklist"
---

# Review Checklist

## Priority Order

Review in this order. Stop at blockers before proceeding.

1. **Security** - vulnerabilities block everything
2. **Correctness** - logic errors, edge cases, data integrity
3. **Performance** - O(n^2) in hot paths, unbounded queries, memory leaks
4. **Architecture** - coupling, abstractions, API design
5. **Testing** - coverage of new behavior, edge cases tested
6. **Readability** - naming, comments, cognitive complexity

## Dimension Checklists

### Security
- [ ] No hardcoded secrets, tokens, or credentials
- [ ] User input validated and sanitized at boundaries
- [ ] SQL uses parameterized queries (no string interpolation)
- [ ] Auth checks present on new endpoints
- [ ] No sensitive data in logs or error messages
- [ ] Dependencies pinned, no known CVEs introduced

### Correctness
- [ ] Edge cases handled: nil/null, empty collections, boundary values
- [ ] Error paths return appropriate errors (not swallowed)
- [ ] Concurrent access safe (race conditions, deadlocks)
- [ ] State transitions valid (no impossible states)
- [ ] Off-by-one errors in loops and slices

### Performance
- [ ] No N+1 queries in data fetching
- [ ] Pagination on list endpoints
- [ ] Indexes exist for new query patterns
- [ ] No unbounded memory growth (streams vs loading all)
- [ ] Cache invalidation correct if caching added

### Architecture
- [ ] Change is in the right layer (no business logic in handlers)
- [ ] No circular dependencies introduced
- [ ] Public API surface minimal (don't expose internals)
- [ ] Follows existing patterns in the codebase

### Testing
- [ ] New behavior has corresponding tests
- [ ] Error/edge cases tested, not just happy path
- [ ] Tests are deterministic (no time/random dependencies)
- [ ] Test names describe behavior, not implementation

### Readability
- [ ] Names reveal intent (no abbreviations without context)
- [ ] Functions do one thing at one abstraction level
- [ ] Complex logic has explanatory comments (why, not what)
- [ ] No dead code or commented-out blocks

## Severity Classification

| Level | Meaning | Action Required |
|-------|---------|-----------------|
| **blocker** | Security hole, data loss, broken functionality | Must fix before merge |
| **suggestion** | Better approach exists, maintainability concern | Should fix, discuss if disagree |
| **nit** | Style, naming, minor preference | Optional, don't block merge |
| **question** | Unclear intent, need context to review | Author responds, may not need change |
| **praise** | Good pattern, clever solution, well-tested | No action, builds team knowledge |

## Context-Specific Additions

### Auth Changes
- [ ] Token expiry and refresh handled
- [ ] Permission checks at both API and data layer
- [ ] Session invalidation on privilege change

### DB Migrations
- [ ] Migration is reversible (has down/rollback)
- [ ] No locking on large tables in production
- [ ] Backward compatible with current code (deploy order safe)

### API Changes
- [ ] Backward compatible or versioned
- [ ] Request/response documented (OpenAPI updated)
- [ ] Rate limiting considered for new endpoints

## Automated vs Manual

**Automate**: formatting, linting, type checking, import ordering, test execution, coverage thresholds.

**Manual**: logic correctness, architecture fit, naming quality, test completeness, security implications, business requirement alignment.

## Time Management

- PRs < 200 lines: 15-25 minutes
- PRs 200-500 lines: 30-45 minutes
- PRs > 500 lines: request split, or budget 60+ minutes
- If review takes > 60 min, the PR is too large
