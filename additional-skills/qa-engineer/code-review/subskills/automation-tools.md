---
type: subskill
title: "Review Automation Tools"
---

# Review Automation Tools

## danger.js

Automate PR hygiene checks in CI:

```javascript
// dangerfile.js
if (danger.github.pr.additions + danger.github.pr.deletions > 500) {
  warn("PR exceeds 500 lines. Consider splitting.");
}

const hasTests = danger.git.modified_files.some(f => f.includes("test"));
const hasSrc = danger.git.modified_files.some(f => f.includes("src/"));
if (hasSrc && !hasTests) {
  warn("Source changed without test updates.");
}

if (!danger.github.pr.body || danger.github.pr.body.length < 50) {
  fail("PR description is too short. Explain what and why.");
}
```

## CODEOWNERS

Auto-assign reviewers by path ownership:

```
# .github/CODEOWNERS
/src/auth/          @security-team
/src/api/           @backend-team
/src/ui/            @frontend-team
/infrastructure/    @platform-team
*.sql               @dba-team
```

Rules: last matching pattern wins. Teams get notified. Require approval from owners for protected paths.

## Required Checks (Branch Protection)

Configure before human review begins:
- CI pipeline green (build + test + lint)
- Coverage threshold not decreased
- No security vulnerabilities (Snyk/Dependabot)
- PR description filled (danger.js or GitHub Action)
- At least 1 approval from CODEOWNERS

## PR Templates

```markdown
<!-- .github/pull_request_template.md -->
## What
<!-- One sentence: what does this PR do? -->

## Why
<!-- Link to issue/ticket. Business context. -->

## How
<!-- Key implementation decisions. -->

## Testing
<!-- How was this tested? What's not covered? -->

## Rollback
<!-- How to revert if this breaks production. -->
```

## Lint-Staged + Commitlint

Prevent issues before they reach review:

```json
// package.json
{ "lint-staged": { "*.ts": ["eslint --fix", "prettier --write"] } }
```

```yaml
# commitlint.config.js - enforce conventional commits
rules:
  type-enum: [feat, fix, docs, refactor, test, chore]
  subject-max-length: 72
```

## Custom GitHub Actions

```yaml
# .github/workflows/pr-checks.yml
on: pull_request
jobs:
  size-label:
    runs-on: ubuntu-latest
    steps:
      - uses: codelytv/pr-size-labeler@v1
        with:
          xs_max_size: 10
          s_max_size: 100
          m_max_size: 500
          l_max_size: 1000
```

## Reviewbot (Automated Nit-Picking)

Use tools like `reviewdog` to post lint/type errors as inline PR comments:
- Runs linters on diff only (not entire codebase)
- Posts findings as review comments at exact lines
- Reduces human reviewer fatigue on style issues
- Configure severity: error blocks merge, warning is advisory
