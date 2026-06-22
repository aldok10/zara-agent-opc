---
description: Self-update Zara from remote — pull latest, re-install, report changes
---

# /update — Zara Self-Update

Pulls the latest version from remote (GitLab/GitHub/other), re-installs, and reports what changed.

## Process

### 1. Pre-flight Check

Run these in parallel to gather state:

```bash
# Current state
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_URL=$(git remote get-url origin)
WORKTREE_DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
STASH_COUNT=$(git stash list | wc -l | tr -d ' ')
```

Detect the default branch:

```bash
# Try main first, fallback to master
DEFAULT_BRANCH="main"
if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
  if git rev-parse --verify origin/master >/dev/null 2>&1; then
    DEFAULT_BRANCH="master"
  fi
fi
```

### 2. Fetch Remote

```bash
git fetch origin --quiet
REMOTE_COMMIT=$(git rev-parse origin/$DEFAULT_BRANCH 2>/dev/null || echo "unknown")
BEHIND=$(git rev-list --count HEAD..origin/$DEFAULT_BRANCH 2>/dev/null || echo "0")
```

### 3. Check Status

Check conditions:

| Condition | Action |
|-----------|--------|
| `BEHIND` = 0 and same commit | Report "already up to date." Stop. |
| `BEHIND` = 0 but different commit | Report "diverged from remote. Push or reset." Stop. |
| Working tree dirty + `$ARGUMENTS` doesn't contain `--force` | Report "Uncommitted changes detected." Ask user to commit/stash or use `--force`. |
| On feature branch (not main/master) | Report branch name. "Updates will be rebased onto your branch." Proceed with care. |

### 4. Show What's New

Show the commits that will be pulled:

```bash
git log --oneline --no-decorate HEAD..origin/$DEFAULT_BRANCH
```

If `$ARGUMENTS` contains `--dry-run` or `-n`, stop here with a summary. No changes made.

### 5. Execute Update

Execute the update based on branch state:

**Case A: On default branch (main/master)**

```bash
# Stash if dirty
if [ "$WORKTREE_DIRTY" -gt 0 ]; then
  git stash push -m "zara-update-auto-stash $(date '+%Y-%m-%d %H:%M')"
  echo "Stashed $WORKTREE_DIRTY uncommitted changes."
fi

# Pull
git pull --ff-only origin $DEFAULT_BRANCH

# Pop stash if we stashed
if [ "$WORKTREE_DIRTY" -gt 0 ]; then
  git stash pop 2>/dev/null || echo "Warning: stash conflict. Manual resolution needed: git stash pop"
fi
```

**Case B: On feature branch**

```bash
# Stash if dirty
if [ "$WORKTREE_DIRTY" -gt 0 ]; then
  git stash push -m "zara-update-auto-stash $(date '+%Y-%m-%d %H:%M')"
fi

# Save current position
FEATURE_BRANCH=$CURRENT_BRANCH

# Checkout default branch and pull
git checkout $DEFAULT_BRANCH
git pull --ff-only origin $DEFAULT_BRANCH

# Return to feature branch and rebase
git checkout $FEATURE_BRANCH
git rebase $DEFAULT_BRANCH

# Pop stash
if [ "$WORKTREE_DIRTY" -gt 0 ]; then
  git stash pop 2>/dev/null || echo "Warning: stash conflict. Manual resolution needed."
fi
```

### 6. Re-install

After pulling, re-run the install logic to update:
- Symlinks to `~/.config/opencode/zara/`
- Plugin registration if changed
- Any new commands
- Any new agents

The install logic is the same as `/install` but scoped to "update mode":
- Refresh symlinks
- Re-sync `~/.config/opencode/opencode.json` if `opencode.json` changed
- Note: the global opencode.json may reference files by relative path. If the install structure hasn't changed, this is a no-op.

To detect if opencode.json changed:
```bash
git diff HEAD@{1} -- opencode.json 2>/dev/null | head -20
```

If changed, recommend user runs `/install` to sync global config:
> "opencode.json has changed. Run `/install` to sync global configuration."

### 7. Verify & Report

Get the new state:

```bash
NEW_COMMIT=$(git rev-parse HEAD)
NEW_VERSION=$(cat version.json 2>/dev/null | grep '"version"' | head -1 | sed 's/.*"version": "\(.*\)",*/\1/')
```

Check if successful:

```bash
if [ "$LOCAL_COMMIT" = "$NEW_COMMIT" ]; then
  echo "Update applied but commit unchanged (fast-forward to same point)."
else
  echo "Updated: $(echo $LOCAL_COMMIT | head -c 7)..$(echo $NEW_COMMIT | head -c 7)"
fi
```

### 8. Display Summary

Present a clean result:

```
## Update Complete

**Previous**: 0.2.0 (abc1234)
**Current**:  0.2.1 (def5678)
**Changes**:  25 new commits

**What changed**:
• abc1234 fix: resolve race condition in auth middleware
• def5678 feat: add post-install update check
• ...

**Config sync**: opencode.json unchanged. No re-install needed.
(or: "Run `/install` to sync updated opencode.json to global config.")
```

## Safety Guarantees

| Risk | Protection |
|------|-----------|
| Uncommitted changes lost | Auto-stashed before pull, popped after. Warn if conflict. |
| Feature branch disrupted | Rebases feature branch onto updated default branch. No force push. |
| Update fails midway | `--ff-only` ensures no merge commits. Revert is `git reset --hard ORIG_HEAD`. |
| Wrong remote | Uses the configured remote from `git remote get-url origin`. Never assumes. |

## Git Safety

- Always use `git pull --ff-only` — never `--rebase` or merge commits
- Always stash before pulling, pop after
- Never push anything during update (read-only from remote perspective)
- Preserve stash with identifiable message: `zara-update-auto-stash <timestamp>`

## Arguments

| Flag | Effect |
|------|--------|
| (none) | Normal update with confirmation on dirty worktree |
| `--force` / `-f` | Skip dirty worktree warning, auto-stash |
| `--dry-run` / `-n` | Show what would change, make no changes |
| `--yes` / `-y` | Skip confirmation prompt (for automation) |

## Edge Cases

| Situation | Response |
|-----------|----------|
| No network | Report "can't reach remote. Check connection." Show local state. |
| No remote configured | Report "no git remote configured." Show local version only. |
| Detached HEAD | Report "detached HEAD state." Recommend checking out a branch first. |
| Merge in progress | Report "merge in progress. Complete or abort before updating." |
| Rebase in progress | Report "rebase in progress. Complete or abort before updating." |
| Not a git repo | Report "not a git repository. Can't self-update." |
| Remote requires auth | Report "remote requires authentication. Use `git pull` manually." |
