---
type: fact
title: "Changelog Automation"
---

# Changelog Automation

Generating changelogs from commit history with minimal manual effort.

## Conventional Commits

Structured commit messages that enable automated changelog generation:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types and Changelog Mapping

| Type | Changelog Section | SemVer Impact |
|------|------------------|---------------|
| feat | Features | minor |
| fix | Bug Fixes | patch |
| perf | Performance | patch |
| docs | (hidden or Documentation) | none |
| chore | (hidden) | none |
| refactor | (hidden or Code Refactoring) | none |
| BREAKING CHANGE | Breaking Changes | major |

### Examples

```
feat(auth): add OAuth2 PKCE flow support

Implements RFC 7636 for public clients. Replaces implicit flow
which is now deprecated.

Closes #234
```

```
fix(api): return 404 instead of 500 for missing resources

BREAKING CHANGE: previously returned 500 with error body,
now returns standard 404 response.
```

### Enforcement

- **commitlint**: validates commit messages in CI or git hooks
- **commitizen**: interactive CLI for crafting compliant messages
- **husky + lint-staged**: pre-commit hook runs commitlint locally

## semantic-release

Fully automated version management and changelog generation:

### How It Works

1. Analyzes commits since last release
2. Determines next version (major/minor/patch) from commit types
3. Generates changelog entry
4. Updates package version
5. Creates git tag
6. Publishes to registry (npm, PyPI, etc.)
7. Creates GitHub/GitLab release

### Configuration (.releaserc.json)

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", {
      "changelogFile": "CHANGELOG.md"
    }],
    "@semantic-release/npm",
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version}"
    }],
    "@semantic-release/github"
  ]
}
```

### Strengths

- Zero manual intervention after setup
- Enforces SemVer correctness
- Integrates with CI/CD pipelines (runs on merge to main)

### Limitations

- Requires strict conventional commits (team discipline)
- Monorepo support needs extra plugins
- Opinionated workflow (not all teams want fully automated releases)

## git-cliff

Configurable changelog generator with template engine:

### Key Features

- Regex-based commit parsing (not limited to conventional commits)
- Jinja2-like template engine for output format
- Supports any commit convention via configuration
- Monorepo support with path-based filtering
- Prepends to existing changelog (preserves manual edits)

### Configuration (cliff.toml)

```toml
[changelog]
header = "# Changelog\n"
body = """
{% for group, commits in commits | group_by(attribute="group") %}
## {{ group }}
{% for commit in commits %}
- {{ commit.message | upper_first }} ({{ commit.id | truncate(length=7, end="") }})\
{% endfor %}
{% endfor %}
"""
trim = true

[git]
conventional_commits = true
filter_unconventional = true
commit_parsers = [
    { message = "^feat", group = "Features" },
    { message = "^fix", group = "Bug Fixes" },
    { message = "^perf", group = "Performance" },
    { message = "^doc", group = "Documentation" },
    { message = "^refactor", group = "Refactoring" },
    { body = ".*security", group = "Security" },
]
```

### Usage

```bash
# Generate changelog for unreleased commits
git cliff --unreleased --prepend CHANGELOG.md

# Generate between tags
git cliff v1.0.0..v2.0.0

# Generate full changelog
git cliff -o CHANGELOG.md
```

## Keep a Changelog

Manual changelog format standard (keepachangelog.com):

### Format

```markdown
# Changelog

## [Unreleased]

### Added
- New payment provider integration

### Changed
- Upgraded database driver to v3

### Fixed
- Race condition in queue consumer

## [1.2.0] - 2024-01-15

### Added
- Webhook retry with exponential backoff
```

### Categories

- **Added**: new features
- **Changed**: changes in existing functionality
- **Deprecated**: features that will be removed
- **Removed**: features removed in this release
- **Fixed**: bug fixes
- **Security**: vulnerability patches

### When to Use (vs Automated)

- Libraries with public API contracts (human-curated notes matter)
- Projects without strict commit conventions
- When changelog entries need context beyond commit messages
- Hybrid: auto-generate draft, human reviews and edits before release

## CI Integration Patterns

### GitHub Actions Example

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Monorepo Strategy

| Tool | Monorepo Approach |
|------|-------------------|
| semantic-release | `semantic-release-monorepo` plugin per package |
| git-cliff | `--include-path` flag filters by directory |
| changesets | Dedicated monorepo tool: per-package change files |
| release-please | Google's tool: per-package manifests |

## Decision Matrix

| Factor | semantic-release | git-cliff | Keep a Changelog | changesets |
|--------|-----------------|-----------|-------------------|------------|
| Automation level | Full | Generation only | Manual | Semi-auto |
| Commit convention required | Yes | Configurable | No | No |
| Monorepo | Plugin needed | Built-in | Manual | Built-in |
| Customizable output | Limited | High (templates) | Full control | Moderate |
| SemVer enforcement | Automatic | Manual | Manual | Automatic |
| Best for | Libraries, APIs | Custom workflows | Small projects | Monorepos |
