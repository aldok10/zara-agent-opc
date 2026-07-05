# Conventional Commits

Structured commit message format that enables automated changelog generation.

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

| Type | Purpose | Changelog category | Bump |
|------|---------|-------------------|------|
| `feat` | New feature | Added | MINOR |
| `fix` | Bug fix | Fixed | PATCH |
| `docs` | Documentation only | (omit from changelog) | none |
| `style` | Formatting, whitespace | (omit from changelog) | none |
| `refactor` | Code restructuring | (omit from changelog) | none |
| `perf` | Performance improvement | Changed | PATCH |
| `test` | Adding/fixing tests | (omit from changelog) | none |
| `build` | Build system changes | (omit from changelog) | none |
| `ci` | CI configuration | (omit from changelog) | none |
| `chore` | Maintenance tasks | (omit from changelog) | none |

## Breaking Changes

Two ways to signal a breaking change:

1. Append `!` after type/scope:
```
feat!: remove support for Node.js 16
```

2. Footer with `BREAKING CHANGE:`:
```
feat: add new authentication flow

BREAKING CHANGE: The login endpoint now requires a client_id parameter.
Existing integrations must register for a client_id before upgrading.
```

Both result in a MAJOR version bump.

## Scope

Optional context for what part of the codebase is affected:

```
feat(auth): add OAuth2 PKCE flow
fix(api): return 404 for deleted resources
docs(readme): update installation instructions
```

Scope conventions (define per project):
- Module/package name: `feat(orders):`
- Layer: `fix(api):`, `fix(db):`
- Feature area: `feat(billing):`

## Description Rules

- Imperative mood: "add" not "added" or "adds"
- No capitalization of first letter
- No period at the end
- Max 72 characters
- Complete sentence when read as: "This commit will {description}"

Good:
```
feat(payments): add support for ACH bank transfers
fix(auth): handle expired refresh tokens gracefully
```

Bad:
```
feat: Added new feature.
fix: Fixed the bug
feat: stuff
```

## Body

Optional extended description:

```
fix(pagination): return correct total count for filtered queries

The total count was calculated before applying filters, causing
the pagination metadata to show more pages than actually existed.
This led to empty last pages in the UI.

Fixes #1234
```

- Separate from description by blank line
- Wrap at 72 characters
- Explain what and why, not how (the diff shows how)

## Footers

```
feat(api): add user profile endpoint

Implements the user profile feature per design doc.

Reviewed-by: Jane Smith
Refs: #456
BREAKING CHANGE: The /me endpoint now returns a different schema.
```

Common footers:
- `BREAKING CHANGE: description`
- `Fixes #issue-number`
- `Refs: #issue-number`
- `Reviewed-by: name`
- `Co-authored-by: name <email>`

## Changelog Generation

### Mapping to Keep a Changelog

```
feat:            -> ### Added
fix:             -> ### Fixed
perf:            -> ### Changed
BREAKING CHANGE: -> ### Breaking Changes
feat(deprecated) -> ### Deprecated (convention)
```

### Tool Configuration

git-cliff example (`cliff.toml`):
```toml
[changelog]
header = "# Changelog\n"
body = """
{% for group, commits in commits | group_by(attribute="group") %}
### {{ group | upper_first }}
{% for commit in commits %}
- {{ commit.message | upper_first }} \
{% endfor %}
{% endfor %}
"""

[git]
conventional_commits = true
commit_parsers = [
  { message = "^feat", group = "Added" },
  { message = "^fix", group = "Fixed" },
  { message = "^perf", group = "Changed" },
  { message = "^refactor", skip = true },
  { message = "^doc", skip = true },
  { message = "^style", skip = true },
  { message = "^test", skip = true },
  { message = "^chore", skip = true },
]
```

## Enforcement

### commitlint

Validate commit messages in CI or git hooks:

```yaml
# .commitlintrc.yml
extends: ['@commitlint/config-conventional']
rules:
  type-enum: [2, always, [feat, fix, docs, style, refactor, perf, test, build, ci, chore]]
  subject-max-length: [2, always, 72]
  body-max-line-length: [2, always, 100]
```

### Git hook (commit-msg)

```bash
#!/bin/bash
set -euo pipefail
npx --no -- commitlint --edit "$1"
```

## Squash Merge Strategy

When using squash merges, the PR title becomes the commit message:
- PR title must follow conventional commit format
- PR body becomes the commit body
- Individual commits within the PR do not need to follow the convention

## Revert Commits

```
revert: feat(auth): add OAuth2 PKCE flow

This reverts commit abc123def456.
Reason: OAuth2 provider does not support PKCE for our client type.
```
