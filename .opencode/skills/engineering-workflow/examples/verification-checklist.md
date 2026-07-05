# Verification Checklist (Definition of Done)

Use this checklist before marking any task as complete.

## Code Quality

- [ ] Code compiles/builds without warnings
- [ ] No linter errors (`npm run lint` / `ruff check` / equivalent)
- [ ] Type checking passes (`npm run typecheck` / `mypy` / equivalent)
- [ ] No hardcoded secrets, credentials, or environment-specific values
- [ ] Error handling covers expected failure modes
- [ ] No TODO/FIXME left without a linked tracking issue

## Testing

- [ ] Unit tests cover new logic (happy path + edge cases)
- [ ] Integration tests cover service boundaries
- [ ] Tests pass locally and in CI
- [ ] Test names describe behavior, not implementation
- [ ] No flaky tests introduced (run 3x if uncertain)

## Documentation

- [ ] Public APIs have doc comments
- [ ] README updated if setup steps changed
- [ ] ADR written if significant architectural decision made
- [ ] Changelog entry added for user-facing changes

## Observability

- [ ] Key operations have structured logging
- [ ] Errors include context for debugging (request ID, user ID, input)
- [ ] Metrics emitted for SLI-relevant paths
- [ ] Alerts configured for new failure modes

## Security

- [ ] Input validation on all external data
- [ ] Authentication/authorization checks in place
- [ ] No SQL injection, XSS, or SSRF vectors
- [ ] Dependencies scanned for known vulnerabilities

## Deployment

- [ ] Database migrations are backward-compatible
- [ ] Feature flag wraps risky changes
- [ ] Rollback plan documented
- [ ] Load tested if on critical path (target: 2x current peak)
