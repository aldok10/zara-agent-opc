---
name: git-worktrees
description: Use when starting feature work that needs isolation from current workspace
triggers:
  - "new feature branch"
  - "isolate work"
  - "worktree"
  - "parallel branch"
  - "parallel development"
  - "multiple branches"
---

# Git Worktrees - Isolated Feature Workspaces

## When to Use

- Starting feature work while keeping current branch clean
- Parallel AI agent sessions (each needs own working directory)
- Reviewing PRs without stashing current work
- Hotfix on production while mid-feature
- Running long builds/tests without blocking dev

## Step 0 - Detect Existing Isolation

```bash
git_dir=$(git rev-parse --git-dir 2>/dev/null)
git_common=$(git rev-parse --git-common-dir 2>/dev/null)
```

| Condition | Action |
|-----------|--------|
| `$git_dir` != `$git_common` | Already in a worktree - skip creation |
| `$git_dir` == `$git_common` | Normal repo - proceed to Step 1 |

Never nest worktrees. If already in one, inform user and stop.

## Step 1 - Create Workspace

Use `.worktrees/` at project root as the worktree directory.

```bash
# Ensure .worktrees/ is gitignored
grep -q '.worktrees' .gitignore 2>/dev/null || echo '.worktrees/' >> .gitignore

# New branch from current HEAD
git worktree add .worktrees/<branch> -b <branch>

# Existing branch
git worktree add .worktrees/<branch> <branch>

# From specific base
git worktree add .worktrees/<branch> -b <branch> origin/main
```

Branch naming follows conventional-commits: `feat/x`, `fix/x`, `chore/x`, `refactor/x`.

## Step 2 - Dependency Setup

Auto-detect and install in new worktree:

| File | Command | Note |
|------|---------|------|
| `package.json` + `pnpm-lock.yaml` | `pnpm install` | Respects lockfile |
| `package.json` + `yarn.lock` | `yarn install` | |
| `package.json` + `package-lock.json` | `npm ci` | Faster than `npm install` |
| `go.mod` | `go mod download` | |
| `Cargo.toml` | `cargo fetch` | Don't build yet |
| `requirements.txt` | `pip install -r requirements.txt` | Use venv |
| `composer.json` | `composer install` | |

Run inside `.worktrees/<branch>/`.

### Shared Build Cache (Optional)

For large projects, symlink shared caches to avoid duplicate downloads:

```bash
# Node (pnpm already shares via store)
# Go (GOMODCACHE is global by default)
# Rust - share target dir:
ln -s ../../target .worktrees/<branch>/target
```

## Step 3 - Verify Clean Baseline

Run test suite in new worktree:

| Result | Action |
|--------|--------|
| Tests pass | Ready - worktree is functional |
| Tests fail | Report failures, ask before proceeding |

## Parallel Agent Pattern

For running multiple AI agents concurrently on the same repo:

```bash
# Create worktrees for each agent task
git worktree add .worktrees/feat-auth -b feat/auth
git worktree add .worktrees/feat-api -b feat/api
git worktree add .worktrees/fix-perf -b fix/perf

# Each agent works in its own directory
# No file conflicts, no index locking, no context contamination
```

Rules for parallel agents:
- Each agent gets exclusive file scope (don't overlap edited files)
- Shared repo objects = instant branch creation (no clone cost)
- Merge sequentially after all complete - not simultaneously
- If agents need to communicate, use mail/file-based coordination

## Lifecycle Management

### List Active Worktrees

```bash
git worktree list
```

### Remove Worktree (After Merge)

```bash
# Clean removal (checks for uncommitted changes)
git worktree remove .worktrees/<branch>

# Force removal (discards changes)
git worktree remove --force .worktrees/<branch>

# Delete branch if merged
git branch -d <branch>
```

### Prune Orphans

Worktrees whose directory was deleted without `git worktree remove`:

```bash
git worktree prune
```

### Bulk Cleanup

```bash
# Remove all worktrees that have been merged to main
for wt in $(git worktree list --porcelain | grep "^worktree" | awk '{print $2}'); do
  branch=$(git -C "$wt" branch --show-current 2>/dev/null)
  if [ -n "$branch" ] && git branch --merged main | grep -q "$branch"; then
    git worktree remove "$wt" 2>/dev/null
    git branch -d "$branch" 2>/dev/null
  fi
done
```

## Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Orphan dev servers in worktrees | Kill processes before removing worktree |
| Same branch checked out twice | Git prevents this - use different branch names |
| Shared lockfiles (package-lock, go.sum) | Each worktree has its own copy - merge conflicts possible |
| `.env` files missing in new worktree | Copy from main: `cp .env .worktrees/<branch>/.env` |
| Large `node_modules` per worktree | Use pnpm (shared store) or symlink |
| Forgotten worktrees eating disk | Regular `git worktree list` + prune |
| Submodules not initialized | Run `git submodule update --init` in new worktree |

## Integration with Other Skills

| After worktree work... | Load skill |
|------------------------|------------|
| Ready to commit | `conventional-commits` |
| Done with feature | `finishing-branch` |
| Need code review | `code-review` |
| Create PR | `github` |

## Quick Reference

```bash
git worktree add <path> -b <branch>     # Create new branch + worktree
git worktree add <path> <branch>         # Checkout existing branch
git worktree list                         # Show all worktrees
git worktree remove <path>               # Remove worktree
git worktree prune                        # Clean orphan references
git worktree move <path> <new-path>      # Relocate worktree
```
