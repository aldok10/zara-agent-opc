# GitHub Workflows

PR conventions, code review, branch protection, Actions, releases, and the `gh` CLI.

## PR Best Practices

- **Small and focused**: one concern per PR. 200-400 lines diff max. Split large features into stacked PRs.
- **Good description**: what changed, why, how to test. Link issue with `Closes #123`.
- **Draft PRs**: open early for visibility. Mark ready when tests pass and you want review.
- **Self-review first**: read your own diff before requesting reviewers. Catch the easy stuff.
- **Screenshots/recordings**: for UI changes, always include before/after.

PR title format (matches conventional commits): `feat(auth): add OAuth2 PKCE flow`

## Code Review Conventions

Use **conventional comments** prefix to signal intent:

| Prefix | Meaning |
|--------|---------|
| `suggestion:` | Non-blocking improvement idea |
| `issue:` | Must fix before merge |
| `question:` | Need clarification, blocks approval |
| `nit:` | Minor style/naming preference |
| `praise:` | Highlight good work |
| `thought:` | Open-ended design consideration |

Approval flow: at least 1 approval from CODEOWNERS. Dismiss stale reviews on new pushes. Don't approve your own PR.

## CODEOWNERS

File: `.github/CODEOWNERS` (or repo root, or `docs/`).

```
# Syntax: pattern  @owner(s)
*                   @org/engineering
/src/auth/          @org/security-team
/infra/             @org/platform @alice
*.proto             @org/api-team
/docs/              @tech-writers
```

Rules: last matching pattern wins. Owners get auto-requested on PRs touching their paths. Requires "Require review from Code Owners" in branch protection.

## Branch Protection Rules

Settings > Branches > Add rule for `main`:

- **Require PR before merging**: no direct push.
- **Required status checks**: CI must pass (name the workflow jobs).
- **Require review from CODEOWNERS**: enforce ownership.
- **Dismiss stale reviews**: re-review after force-push.
- **Require linear history**: enforces squash or rebase merge (no merge commits).
- **Restrict force-push**: nobody can force-push, even admins (use "Do not allow bypassing").
- **Require signed commits**: only verified commits land on main.

Rulesets (newer): more flexible, can apply to multiple branches/tags, support bypass lists.

## GitHub Actions Integration

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
```

Key patterns:
- **Reusable workflows**: `uses: ./.github/workflows/shared.yml` to DRY repeated jobs.
- **Path filters**: `paths: ['src/**']` to skip CI for docs-only changes.
- **Concurrency**: `concurrency: { group: ${{ github.ref }}, cancel-in-progress: true }` to avoid stacking.
- **Matrix**: test across Node 20/22, OS linux/macos in parallel.

## Environments and Deployment Protection

```yaml
jobs:
  deploy:
    environment:
      name: production
      url: https://app.example.com
```

Configure in Settings > Environments:
- Required reviewers (manual approval gate).
- Wait timer (delay before deploy).
- Branch restrictions (only `main` can deploy to prod).
- Environment secrets (scoped to that environment only).

## Release Automation

```bash
# Create release with auto-generated notes from merged PRs
gh release create v1.2.0 --generate-notes --target main

# Create draft release for review
gh release create v1.2.0 --draft --generate-notes

# Upload artifacts
gh release upload v1.2.0 dist/app-linux dist/app-macos
```

Auto-notes use PR labels to categorize (feature, bugfix, breaking). Configure in `.github/release.yml`.

## GitHub CLI (gh) Essentials

```bash
# PRs
gh pr create --title "feat: add X" --body "Closes #42" --reviewer @alice
gh pr list --state open
gh pr checks                          # status of CI on current branch
gh pr merge --squash --delete-branch

# Issues
gh issue create --title "Bug: X" --label bug
gh issue list --assignee @me

# Repos
gh repo clone org/repo
gh repo fork --clone

# Actions
gh run list --limit 5
gh run view <id> --log-failed         # see why CI failed
gh run rerun <id>

# Misc
gh auth status                        # verify auth
gh api repos/{owner}/{repo}/pulls     # raw API calls
```
