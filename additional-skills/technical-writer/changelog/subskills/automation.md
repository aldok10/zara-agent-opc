# Changelog Automation

Conventional commits, release-please, semantic-release -- automating version bumps and changelog generation.

## When to Load

- Setting up automated release workflows
- Choosing between release-please and semantic-release
- Configuring conventional commit enforcement
- Integrating changelog generation into CI/CD

## Key Concepts

**Conventional Commits** -- Structured commit format: `type(scope): description`. Types: feat (MINOR), fix (PATCH), feat! or BREAKING CHANGE footer (MAJOR). Machine-parseable for automation.

**release-please** -- Google's tool. Creates/updates a release PR with changelog and version bump. Merging the PR triggers the release. Supports monorepos. Works with GitHub Actions.

**semantic-release** -- Fully automated. Analyzes commits, determines version, generates changelog, publishes package, creates GitHub release. No manual PR step. Plugin-based.

**Commit Linting** -- commitlint + husky enforce conventional commit format at commit time. CI can also validate PR titles (squash-merge workflows use PR title as commit message).

## Patterns

```json
// commitlint.config.js equivalent
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "scope-enum": [2, "always", ["api", "auth", "db", "ui"]],
    "body-max-line-length": [0, "always", 200]
  }
}
```

```yaml
# release-please GitHub Action
name: release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
          changelog-types: |
            [
              {"type": "feat", "section": "Features"},
              {"type": "fix", "section": "Bug Fixes"},
              {"type": "perf", "section": "Performance"},
              {"type": "deps", "section": "Dependencies"}
            ]
```

```yaml
# semantic-release config (.releaserc.yml)
branches: [main]
plugins:
  - "@semantic-release/commit-analyzer"
  - "@semantic-release/release-notes-generator"
  - "@semantic-release/changelog"
  - "@semantic-release/npm"
  - "@semantic-release/github"
  - "@semantic-release/git"
```

## Gotchas

- Squash-merge workflows: commit messages are lost -- use PR title as the conventional commit
- release-please needs consistent branch protection; force-pushes break its tracking
- semantic-release requires CI to have publish permissions (npm token, GitHub token)
- Monorepo support differs: release-please has native support, semantic-release needs plugins
- `chore:` commits are excluded from changelog by default -- use `fix:` or `feat:` for visible changes

## Verification

- Make a `feat:` commit and verify it appears in the generated changelog under correct section
- Make a `fix!:` commit and verify MAJOR version bump is triggered
- Verify commit lint rejects malformed commit messages locally and in CI
- Confirm release PR contains accurate changelog diff before merging
- Test the full flow in a staging repo before enabling on production
