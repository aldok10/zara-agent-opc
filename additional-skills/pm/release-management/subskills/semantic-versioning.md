# Semantic Versioning

## Rules

`MAJOR.MINOR.PATCH`  -  no exceptions for public APIs.

| Change Type | Bump | Example |
|-------------|------|---------|
| Breaking API change | MAJOR | Remove endpoint, rename field, change behavior |
| New feature, backward compatible | MINOR | Add endpoint, add optional field |
| Bug fix, no API change | PATCH | Fix calculation, fix typo in response |

## Conventional Commits Mapping

Note: the mapping (fix→patch, feat→minor, BREAKING→major) comes from the Conventional Commits spec, not the semver spec itself.

| Commit Prefix | Version Effect |
|---------------|---------------|
| `fix:` | PATCH |
| `feat:` | MINOR |
| `feat!:` or `BREAKING CHANGE:` footer | MAJOR |
| `docs:`, `chore:`, `ci:`, `style:` | No bump |
| `perf:` | PATCH |
| `refactor:` | No bump (unless behavior changes) |

## Pre-Release Tags

Format: `1.2.0-beta.1`, `2.0.0-rc.1`. Pre-release versions have lower precedence than release. Use for: early access, release candidates, nightly builds.

## When to Version

**Do version**: Libraries, APIs, shared packages, CLI tools, SDKs.
**Skip versioning**: Internal services with single consumer, infrastructure configs, internal tools with no API contract.

## API Versioning Strategies

| Strategy | When | Example |
|----------|------|---------|
| URL path | REST APIs, clear separation | `/v2/users` |
| Header | Same URL, negotiated | `Accept: application/vnd.api+json;version=2` |
| Query param | Simple, less RESTful | `?api-version=2` |

Prefer URL path for external APIs. Header for internal service-to-service.

## Deprecation Policy

1. Mark deprecated in current MINOR release (deprecation notice in response headers).
2. Document migration path in changelog.
3. Remove in next MAJOR release (minimum 2 MINOR releases of deprecation period).
4. Notify consumers via changelog + direct communication.

## Automated Versioning

Use tools that read conventional commits and auto-bump:
- Determine next version from commit history since last tag.
- Generate changelog from commit messages.
- Create git tag + GitHub release.
- Publish package with new version.

## Edge Cases

- Internal refactor that accidentally changes serialization: MAJOR (behavior changed).
- Adding required field to request: MAJOR (breaks existing callers).
- Adding optional field to response: MINOR (backward compatible).
- Changing error message text: PATCH (unless consumers parse error strings).
- Changing default value: MAJOR if behavior meaningfully differs.

## Verification

- [ ] Version bump matches change type (breaking=major, feature=minor, fix=patch)
- [ ] Changelog generated and reviewed
- [ ] Deprecation notices added before removal
- [ ] Pre-release tags used for unstable releases
- [ ] No breaking changes in MINOR/PATCH releases
