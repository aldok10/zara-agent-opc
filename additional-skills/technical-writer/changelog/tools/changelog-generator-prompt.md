# Changelog Generator

You are generating a changelog entry from a list of commits or pull requests.

## Input

You will receive one or more of:
- Git commit messages (conventional commit format preferred)
- Pull request titles and descriptions
- Version number for the release
- Previous version for diff link generation

## Process

1. Parse each commit/PR to extract type, scope, and description
2. Group by changelog category (Added, Changed, Deprecated, Removed, Fixed, Security)
3. Rewrite each entry as a human-readable sentence (not a commit message)
4. Identify breaking changes and create a dedicated subsection
5. Generate version header with date and diff link

## Mapping Rules

| Commit prefix | Changelog category |
|---------------|-------------------|
| `feat:` | Added |
| `fix:` | Fixed |
| `perf:` | Changed |
| `BREAKING CHANGE:` | Breaking Changes (subsection) |
| `deprecate:` or marked deprecated | Deprecated |
| `security:` or CVE reference | Security |
| `docs:`, `style:`, `refactor:`, `test:`, `ci:`, `chore:` | Skip (not user-facing) |

## Rewriting Rules

Transform commit messages into changelog entries:

Commit: `feat(tasks): add bulk import endpoint for CSV files`
Entry: "Added bulk CSV import endpoint for tasks (`POST /tasks/import`)"

Commit: `fix(pagination): handle empty cursor parameter`
Entry: "Fixed pagination error when cursor parameter is empty string"

Commit: `feat!: change authentication to require client ID`
Entry (in Breaking Changes): "Authentication now requires `X-Client-ID` header. Register at the developer portal to obtain a client ID."

Rules:
- Start with past tense verb (Added, Fixed, Changed, Removed)
- Include the affected feature/endpoint
- Be specific about what changed (not "fixed a bug")
- For breaking changes: include migration instruction
- Remove scope prefixes -- they become context in the sentence
- Skip internal details (file names, function names, refactoring)

## Output Format

```markdown
## [{version}] - {YYYY-MM-DD}

### Breaking Changes
- {entry with migration instruction}

### Added
- {feature entry}

### Changed
- {behavior change entry}

### Deprecated
- {deprecation with removal timeline}

### Removed
- {removed feature entry}

### Fixed
- {bug fix entry}

### Security
- {security fix with CVE if applicable}

[{version}]: https://github.com/{org}/{repo}/compare/{previous_version}...{version}
```

## Quality Checks

Before delivering:
- Every entry is a complete sentence understandable without reading the commit
- Breaking changes have migration instructions
- No internal/developer-only changes included
- No duplicate entries (same change from multiple commits)
- Categories are in correct order: Breaking > Added > Changed > Deprecated > Removed > Fixed > Security
- Empty categories are omitted
- Version links are correct

## Edge Cases

- Revert commits: check if the original feature was in this release (omit both) or previous (add to Fixed/Removed)
- Multiple commits for one feature: combine into a single entry
- Unclear if user-facing: ask for clarification or omit with note
- No conventional commit format: infer type from message content, mark confidence
