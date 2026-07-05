---
type: fact
title: "GitHub Collaboration"
---
# GitHub Collaboration

Patterns and tooling for effective team collaboration on GitHub.

## Pull Request Best Practices

### Size

- Target 200-400 lines changed. Smaller PRs get faster, higher-quality reviews.
- If a feature is large, split into stacked PRs (base each on the previous branch).
- Use draft PRs for work-in-progress that needs early feedback.

### Description template

```markdown
## What

Brief description of the change.

## Why

Motivation, link to issue/design doc.

## How

Implementation approach, tradeoffs made.

## Testing

What was tested, how to verify.

## Screenshots (if UI)
```

### Review workflow

1. Open PR with descriptive title (imperative mood, <72 chars).
2. Assign reviewers (or rely on CODEOWNERS auto-assignment).
3. Respond to feedback promptly. Resolve conversations when addressed.
4. Use "Request changes" sparingly -- only for blocking issues.
5. Prefer "Approve with comments" for non-blocking suggestions.

### Merge strategies

| Strategy | When to use |
|----------|-------------|
| Merge commit | Preserve full branch history |
| Squash merge | Clean linear history, messy branch commits |
| Rebase merge | Linear history, each commit is meaningful |

Configure at repo level: Settings > General > Pull Requests.

## CODEOWNERS

File: `.github/CODEOWNERS` (or root or `docs/`).

```
# Syntax: pattern    owner(s)
*                    @org/engineering
/src/auth/           @org/security-team
/infra/              @org/platform @alice
*.proto              @org/api-team
/docs/               @technical-writers
package.json         @org/frontend
```

### Rules

- Last matching pattern wins.
- Owners can be users, teams, or emails.
- Requires branch protection rule "Require review from Code Owners" to enforce.
- Use teams over individuals (resilient to people leaving).

## Branch Protection Rules

Settings > Branches > Branch protection rules.

### Key settings

| Setting | Purpose |
|---------|---------|
| Require pull request reviews | No direct push, minimum N approvals |
| Require status checks | CI must pass before merge |
| Require conversation resolution | All threads resolved before merge |
| Require signed commits | Only GPG/SSH-signed commits accepted |
| Require linear history | No merge commits (rebase/squash only) |
| Include administrators | Rules apply to admins too |
| Restrict pushes | Only specific people/teams can push |
| Allow force pushes | Never for shared branches |

### Rulesets (newer alternative)

Repository > Settings > Rules > Rulesets. More flexible than branch protection:

- Target branches by pattern (glob support).
- Bypass lists for specific actors.
- Organization-level rulesets (apply across repos).
- Tag protection rules.

## GitHub Actions

### Workflow syntax essentials

```yaml
name: CI
on:
  pull_request:
    branches: [main]
    paths-ignore: ['docs/**', '*.md']
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.node-version'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

### Reusable workflows

```yaml
# .github/workflows/reusable-test.yml
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci && npm test
```

Caller:

```yaml
jobs:
  call-tests:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '22'
```

### OIDC for cloud access

No long-lived secrets. Workflow gets a short-lived token:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/deploy
      aws-region: us-east-1
```

## GitHub CLI (gh)

### Essential commands

```bash
gh pr create --title "feat: add caching" --body "Closes #42" --reviewer @alice
gh pr list --state open --assignee @me
gh pr checkout 123
gh pr merge 123 --squash --delete-branch
gh pr diff 123
gh pr checks 123

gh issue create --title "Bug: timeout on /api/users" --label bug
gh issue list --label "priority:high" --state open
gh issue close 42 --reason completed

gh run list --workflow=ci.yml
gh run watch
gh run rerun 12345 --failed

gh release create v1.2.0 --generate-notes --target main
gh release list
```

### Aliases

```bash
gh alias set prc 'pr create --fill'
gh alias set prm 'pr merge --squash --delete-branch'
```

## Environments and Deployment Protection

Settings > Environments.

### Configuration

- **Required reviewers**: specific people must approve deployments.
- **Wait timer**: delay (0-43200 minutes) before deployment proceeds.
- **Deployment branches**: restrict which branches can deploy to this environment.
- **Environment secrets**: scoped to the environment (not accessible from other jobs).
- **Environment variables**: non-sensitive config per environment.

### Usage in workflow

```yaml
jobs:
  deploy-staging:
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - run: deploy --env staging

  deploy-production:
    needs: deploy-staging
    environment:
      name: production
      url: https://app.example.com
    runs-on: ubuntu-latest
    steps:
      - run: deploy --env production
```

## Release Automation

### Auto-generated release notes

```yaml
# .github/release.yml
changelog:
  categories:
    - title: Breaking Changes
      labels: [breaking-change]
    - title: New Features
      labels: [enhancement, feature]
    - title: Bug Fixes
      labels: [bug, fix]
    - title: Maintenance
      labels: [chore, dependencies]
  exclude:
    labels: [skip-changelog]
```

### Automated release workflow

```yaml
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: dist/*
```

### gh release commands

```bash
gh release create v1.2.0 --generate-notes
gh release create v1.2.0 --notes-file RELEASE_NOTES.md
gh release create v1.2.0 dist/*.tar.gz  # attach assets
gh release edit v1.2.0 --draft=false
```
