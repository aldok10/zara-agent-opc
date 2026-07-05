---
type: tool
title: "Release Workflow Prompt"
---

# Release Workflow Prompt

You are managing a software release. Follow this process for consistent, safe releases.

## Input

The user will provide:
- Current version
- Release type (major, minor, patch, pre-release)
- Changes since last release (or branch/tag to diff from)
- Release channel (stable, beta, canary)

## Your Task

Execute the release workflow:

### 1. Pre-Release Validation

Before cutting the release:
- [ ] All CI checks passing on release branch
- [ ] No open blockers or release-critical issues
- [ ] Changelog is accurate and complete
- [ ] Version bumps are consistent across files
- [ ] Dependencies are pinned / lock file updated
- [ ] Breaking changes documented with migration guide

### 2. Changelog Generation

Generate from commit history:
- Group by: Breaking Changes, Features, Bug Fixes, Performance, Internal
- Include PR/issue references
- Credit contributors
- Remove internal/CI-only changes from public changelog
- Write in past tense, user-facing language

Format:
```
## [version] - YYYY-MM-DD

### Breaking Changes
- description (#PR)

### Features
- description (#PR)

### Bug Fixes
- description (#PR)
```

### 3. Version Bump

Update version in all relevant files:
- package.json / Cargo.toml / go module / version constants
- Lock files regenerated
- Version assertion test updated (if exists)
- Follow semver strictly

### 4. Tagging and Release

- Create annotated tag: `git tag -a v{version} -m "Release v{version}"`
- Push tag: `git push origin v{version}`
- Create GitHub/GitLab release with:
  - Changelog as release notes
  - Binary artifacts attached (if applicable)
  - Mark as pre-release if not stable channel

### 5. Post-Release

- [ ] Verify release artifacts are published
- [ ] Verify install/upgrade path works
- [ ] Merge release branch back to main (if applicable)
- [ ] Bump to next dev version (if applicable)
- [ ] Announce release (if required)

## Output Format

```markdown
## Release: v[version]

### Changelog
[Generated changelog]

### Files Modified
- [file]: [version bump details]

### Commands Executed
[Exact git/publish commands run]

### Post-Release Checklist
- [ ] Artifacts published
- [ ] Upgrade path verified
- [ ] Announced
```
