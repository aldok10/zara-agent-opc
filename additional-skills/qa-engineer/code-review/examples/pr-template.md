---
type: example
title: "PR Review Template"
---

# PR Review Template

## Description
<!-- What does this PR do? Link to ticket/issue. -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Refactoring (no functional changes)
- [ ] Documentation
- [ ] CI/CD changes

## Testing
<!-- How was this tested? Include commands run and results. -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

```bash
# Test evidence (paste actual output):
$ npm test
# ...
```

## Checklist
### Correctness
- [ ] Logic matches acceptance criteria
- [ ] Edge cases handled (null, empty, overflow, concurrent)
- [ ] Error paths handled gracefully

### Security
- [ ] No hardcoded secrets
- [ ] Input validated/sanitized
- [ ] Auth checks present where needed

### Performance
- [ ] No N+1 queries
- [ ] No unbounded collections
- [ ] Expensive operations not in hot paths

### Readability
- [ ] Clear naming (intent over implementation)
- [ ] No dead code
- [ ] Complex logic commented with WHY

## Screenshots (if UI change)
<!-- Before/after screenshots -->

## Deployment Notes
<!-- Anything needed for deployment? Migrations, env vars, feature flags? -->
