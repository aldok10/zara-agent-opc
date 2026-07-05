---
type: subskill
title: "Worktrees"
---

# Worktrees

Isolated feature workspaces via git worktrees. One repo, multiple working directories.

## Scope

- HANDLES: worktree creation, dependency setup, parallel agent isolation, lifecycle/cleanup.
- DEFERS: commit messages to `subskills/commits.md`; integration to `subskills/branching.md`.

## First Action

Detect existing isolation before creating anything:

```bash
git_dir=$(git rev-parse --git-dir 2>/dev/null)
git_common=$(git rev-parse --git-common-dir 2>/dev/null)
```

| Condition | Action |
|-----------|--------|
| `$git_dir` != `$git_common` | Already in a worktree - skip creation, inform user, stop |
| `$git_dir` == `$git_common` | Normal repo - proceed |

## When to Use

Feature work keeping current branch clean · parallel AI agent sessions · reviewing PRs without stashing · hotfix mid-feature · long builds without blocking dev.

## Constraints

1. Never nest worktrees.
2. Use `.worktrees/` at project root; ensure it's gitignored.
3. Branch naming per conventional commits: `feat/x`, `fix/x`, `chore/x`, `refactor/x`.
4. Parallel agents: exclusive file scope each, merge sequentially not simultaneously.
5. Run `git worktree remove` from main repo root, never from inside the worktree.

## DO NOT

- Nest worktrees.
- Check out the same branch in two worktrees (git blocks this).
- Merge parallel-agent branches simultaneously.
- Forget `.env` files (copy from main).
- Leave orphan dev servers running before removing a worktree.

## Workflow

1. Create: `git worktree add .worktrees/<branch> -b <branch>` (or `<branch>` for existing, `-b <branch> origin/main` from base).
2. Install deps by manifest: `pnpm install` / `yarn install` / `npm ci` / `go mod download` / `cargo fetch` / `pip install -r requirements.txt` / `composer install`.
3. Verify clean baseline: run test suite. Pass = ready; fail = report, ask before proceeding.

## Parallel Agent Pattern

```bash
git worktree add .worktrees/feat-auth -b feat/auth
git worktree add .worktrees/feat-api -b feat/api
```
Each agent works in its own dir. No file conflicts, no index locking, no context contamination. Merge sequentially after all complete.

## Lifecycle

```bash
git worktree list                       # show all
git worktree remove .worktrees/<branch> # clean removal (--force to discard)
git branch -d <branch>                  # delete if merged
git worktree prune                      # clean orphan refs
```

## Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Orphan dev servers | Kill processes before removing |
| Shared lockfiles | Each worktree has own copy, expect conflicts |
| Missing `.env` | `cp .env .worktrees/<branch>/.env` |
| Large `node_modules` per tree | Use pnpm (shared store) or symlink |
| Forgotten worktrees eating disk | Regular `git worktree list` + prune |
| Submodules uninitialized | `git submodule update --init` in new worktree |

## Verification

- `git worktree list` shows the expected tree.
- Test suite passes in the new worktree before starting work.
