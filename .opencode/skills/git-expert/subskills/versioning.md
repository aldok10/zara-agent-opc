# Versioning & Tagging

Semantic versioning, git tags, release workflows, and changelog generation.

## Semantic Versioning (SemVer 2.0.0)

Format: `MAJOR.MINOR.PATCH`

| Bump | When | Example |
|------|------|---------|
| MAJOR | Breaking change (removed API, changed behavior) | 1.4.2 -> 2.0.0 |
| MINOR | New feature, backwards-compatible | 1.4.2 -> 1.5.0 |
| PATCH | Bugfix, no API change | 1.4.2 -> 1.4.3 |

### Pre-release & Build Metadata

- Pre-release: hyphen + identifiers: `1.0.0-alpha.1`, `1.0.0-beta.2`, `1.0.0-rc.1`
- Build metadata: plus sign, ignored in precedence: `1.0.0+build.123`
- Precedence: `1.0.0-alpha.1 < 1.0.0-beta.1 < 1.0.0-rc.1 < 1.0.0`
- Numeric identifiers sort numerically; alphanumeric sort lexically
- **0.x.y**: unstable, MINOR may break. No guarantees until `v1.0.0`.

## Git Tagging

Always use annotated tags for releases -- they store tagger, date, and message. Lightweight tags are bare pointers with no metadata.

```bash
git tag -a v1.2.3 -m "Release 1.2.3"  # Annotated (correct for releases)
git tag -s v1.2.3 -m "Release 1.2.3"  # Signed (preferred with GPG/SSH key)
```

### Naming Convention

Use `v` prefix: `v1.2.3`, `v2.0.0-rc.1`. Monorepos: `@scope/pkg@1.2.3` or `pkg-name-v1.2.3`.

### Operations

```bash
git push origin v1.2.3            # Push single tag
git push --tags                    # Push all (use sparingly)
git tag -d v1.2.3                  # Delete local
git push origin --delete v1.2.3   # Delete remote
git tag -v v1.2.3                  # Verify signature
git tag -l "v1.*"                  # List matching
git tag -a v1.2.3 -m "msg" <sha>  # Tag past commit
```

## Release Workflow

### Tag-Triggered CI/CD

```yaml
on:
  push:
    tags: ["v[0-9]+.[0-9]+.[0-9]+"]
```

### Changelog Generation

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline --no-merges
```

Tools: `semantic-release`, `release-please`, `changesets`, `standard-version` (deprecated).

### Release Branches vs Tags

- Tags: sufficient for most projects. Tag main, CI publishes.
- Release branches (`release/1.x`): for parallel major version support or pre-release stabilization.

### Monorepo Versioning

- Independent: per-package version, tagged `pkg-name@1.2.3` (`changesets`, `release-please`)
- Fixed: all packages share one version (`lerna` fixed mode)

## Patterns

| Scenario | Pattern |
|----------|---------|
| Release from main | Tag main, CI builds + publishes |
| Hotfix on old version | Branch from tag, fix, tag new patch |
| Pre-release testing | Tag with `-rc.N`, deploy to staging |
| Monorepo release | Per-package tags: `pkg-name@1.2.3` |
| First stable release | Audit API surface, tag `v1.0.0` |

## DO NOT

- Tag without annotated message (loses context)
- Force-move tags on shared history (`git tag -f` breaks others)
- Skip changelog for non-trivial releases
- Use date-based versions for libraries (SemVer communicates intent)
- Push `--tags` blindly (may push unintended local tags)

## Verification

- `git tag -v v1.2.3` -- verifies signature
- `git describe --tags` -- confirms HEAD relationship to latest tag
- CI triggers correctly on tag push
- Changelog reflects all changes since last tag
