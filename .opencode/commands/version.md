---
description: Show current Zara version, git state, and check for updates from remote
---

# /version — Zara Version & Update Check

Shows current version info, git state, and optionally checks remote for updates.

Run these steps in sequence:

## 1. Read Local Version

Read `version.json` from the project root to get the current version metadata.

If file doesn't exist, report "unknown" and recommend creating it.

## 2. Get Git State

Run in parallel:

```bash
git rev-parse HEAD                        # current commit SHA
git rev-parse --abbrev-ref HEAD           # current branch name
git rev-list --count HEAD..origin/main    # commits behind remote (if remote ref exists)
git rev-list --count origin/main..HEAD    # commits ahead of remote
```

If `origin/main` doesn't exist locally (no fetch yet), note that remote hasn't been fetched.

## 3. Fetch Remote (Optional, Flag-Controlled)

By default, `/version` does a **lightweight check** without network calls.

If `$ARGUMENTS` contains `--check` or `-c`, do a full remote check:
1. `git fetch origin --quiet` (fetch latest refs)
2. `git rev-list --count HEAD..origin/main` (behind count)
3. `git log --oneline --no-decorate HEAD..origin/main 2>/dev/null | head -20` (what's new)

## 4. Detect Remote Provider

Parse `git remote get-url origin` to detect the platform:

| URL pattern | Provider |
|-------------|----------|
| `github.com/...` | GitHub |
| `gitlab.com/...` | GitLab |
| others | Self-hosted / Other |

Extract the repo path (e.g., `aldo_k/zara-agent-opc`).

If using `--check`, build a remote comparison URL:
- GitHub: `https://github.com/<path>/compare/<local>...<remote>`
- GitLab: `https://gitlab.com/<path>/-/compare/<local>...<remote>`

## 5. Display Result

Present a clean summary like:

```
## Zara v0.2.0

**Local**:    0.2.0 (abc1234)
**Branch**:   main
**Remote**:   origin/main (def5678)

**Status**: 25 commits behind. Update available.
**Remote**: gitlab.com/aldo_k/zara-agent-opc

**What's new** (recent commits behind):
• abc1234 fix: resolve race condition in auth middleware
• def5678 feat: add post-install update check
• ...

Run `/update` to pull the latest version.
```

If up-to-date:

```
## Zara v0.2.0

**Local**:    0.2.0 (abc1234)
**Branch**:   main

**Status**: ✅ Up to date with origin/main
```

If ahead of remote (local commits not pushed):

```
**Status**: ⚠️ 2 commits ahead of remote. Push first.
```

## Principles

- **Lightweight by default.** No network call unless `--check` flag is used. Just show local state.
- **Clear action.** If behind, tell them to run `/update`. If ahead, tell them to push.
- **Provider-agnostic.** Works with GitHub, GitLab, or any git remote. The remote URL is parsed for display, not API calls.
- **No API keys.** Uses git protocol, not REST APIs. No authentication needed for read-only checks.
