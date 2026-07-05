---
type: fact
title: "Conventional Commits"
---
# Conventional Commits

A specification for structured commit messages that enable automated tooling: changelogs, version bumps, and release notes.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Rules

- **type**: required. Lowercase.
- **scope**: optional. Noun describing the section of the codebase (lowercase, parenthesized).
- **description**: required. Imperative mood, no period, no capitalization after colon.
- **body**: optional. Free-form. Explain *what* and *why*, not *how*.
- **footer**: optional. Token: value pairs. One per line.

## Allowed Types

| Type | Purpose | Triggers version bump? |
|------|---------|----------------------|
| `feat` | New feature visible to users | MINOR |
| `fix` | Bug fix visible to users | PATCH |
| `docs` | Documentation only | No |
| `style` | Formatting, whitespace, semicolons (no logic) | No |
| `refactor` | Code change that neither fixes a bug nor adds a feature | No |
| `test` | Adding or correcting tests | No |
| `chore` | Maintenance (deps, build config, scripts) | No |
| `perf` | Performance improvement | PATCH |
| `ci` | CI/CD configuration changes | No |
| `build` | Build system or external dependency changes | No |
| `revert` | Reverts a previous commit | Depends on reverted type |

## Breaking Changes

Two ways to signal a breaking change:

### Footer notation

```
feat(api): change response format for /users

BREAKING CHANGE: response now returns `data` wrapper object
```

### Bang notation

```
feat(api)!: change response format for /users
```

Both trigger a MAJOR version bump in semantic release. The footer allows a longer explanation; the bang is a quick signal.

## Scoped Commits for Monorepos

Use package or project names as scopes:

```
feat(auth-service): add OAuth2 PKCE flow
fix(shared-utils): handle null input in parseDate
chore(web-app): upgrade React to 19
```

Conventions per team:

- Scopes match directory names or package.json `name` fields.
- Use `*` or omit scope for cross-cutting changes.
- Define allowed scopes in commitlint config for enforcement.

## Tooling

### commitlint

Validates commit messages against conventional commit rules.

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['api', 'web', 'shared', 'ci']],
    'subject-max-length': [2, 'always', 72],
  },
};
```

### commitizen

Interactive CLI that prompts for type, scope, description, body, and breaking changes.

```json
{
  "config": {
    "commitizen": {
      "path": "@commitizen/cz-conventional-changelog"
    }
  }
}
```

Run with `npx cz` or `git cz` (if installed globally).

### husky + lint-staged

Git hooks to enforce commit messages and lint staged files:

```bash
npx husky init
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
```

### lefthook (alternative to husky)

```yaml
# lefthook.yml
commit-msg:
  commands:
    lint-commit:
      run: npx commitlint --edit {1}
```

## Changelog Generation

### conventional-changelog

```bash
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

Groups commits by type. `feat` goes under "Features", `fix` under "Bug Fixes". Breaking changes get a separate section.

### release-please (Google)

Creates and maintains a release PR. Parses conventional commits to determine next version and generate changelog. Merging the PR triggers the release.

## Semantic Release Automation

Full pipeline: analyze commits > determine version > generate notes > publish > notify.

```json
{
  "release": {
    "branches": ["main"],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/changelog",
      "@semantic-release/npm",
      "@semantic-release/git",
      "@semantic-release/github"
    ]
  }
}
```

### Version determination

- Any `feat` commit since last release: bump MINOR.
- Only `fix`/`perf` commits: bump PATCH.
- Any `BREAKING CHANGE` footer or `!` in type: bump MAJOR.
- No releasable commits: no release.

### Monorepo releases

- **semantic-release-monorepo**: per-package releases, independent versioning.
- **multi-semantic-release**: batch releases across packages.
- **release-please**: native monorepo support with per-package configs.

## Best Practices

1. One logical change per commit. Don't mix refactoring with features.
2. Keep descriptions under 50 characters when possible, max 72.
3. Use the body to explain motivation and context.
4. Reference issues in footer: `Closes #123`, `Refs #456`.
5. Squash fixup commits before merging (keep history clean for changelog).
6. Enforce with CI: commitlint in PR checks catches non-conforming messages.
