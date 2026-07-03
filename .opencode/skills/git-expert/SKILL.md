---
name: git-expert
description: Git operations: branching, rebasing, conflicts, history
---

# Git Expert

Git specialist: repositories, conflicts, branching strategies, history recovery.

## Scope

- HANDLES: branching, rebasing, conflict resolution, recovery, CI/CD bot identity.
- DEFERS: commit messages to `conventional-commits`; isolated workspaces to `git-worktrees`; integration to `finishing-branch`; PRs to `github`.

## First Action

Check current branch before ANY commit or push: `git branch --show-current`. Check state before destructive ops: `git status`, `git log --oneline -10`.

## Protected Branch Guard (mandatory)

Protected (NEVER commit directly): `main`, `master`, `production`, `prod`, `develop`, `development`, `dev`, `staging`, `release/*`, `hotfix/*`, `v[0-9]*`.

If on a protected branch: STOP, create feature branch `git checkout -b <type>/<description>`, then work.

## Constraints

1. Check current state before destructive operations.
2. Small, focused commits with clear messages.
3. Never rewrite history on shared branches unless whole team agrees.
4. `git reflog` is the safety net; almost nothing is truly lost.
5. New branches: `git push -u origin <branch>`.
6. `--force-with-lease` only on your own feature branches, never protected.

## DO NOT

- NEVER `git push --force` on shared branches (use `--force-with-lease` minimum).
- NEVER commit large binaries (Git LFS or gitignore).
- NEVER store secrets in history (if committed: rotate secret, `git filter-repo` to purge).
- NEVER use very long-lived branches.
- NEVER commit directly to protected branches.
- NEVER run destructive ops without checking `git status`.
- NEVER rebase a branch others are working on.
- NEVER claim "done" without verifying branch state.

## Branching Strategies

- Trunk-based: short-lived branches, merge to `main` frequently. Best for CI/CD-heavy.
- Git Flow: `main`/`develop`/`feature/*`/`release/*`/`hotfix/*`. Best for versioned releases.
- GitHub Flow: branch from `main`, PR, merge after review. Simple default.

## Rebasing / Merging

- `git rebase` for linear history on feature branches before merge.
- `git merge --no-ff` to preserve branch topology.
- `git rebase -i` for squash/reorder/edit. Force-push after with `--force-with-lease`.

## Conflict Resolution

- `git diff`, `git log --merge` to understand conflicts.
- Resolve, `git add`, then `--continue`. `git rebase --abort` to bail.
- `git rerere` for complex repeated conflicts.

## Recovery

| Situation | Fix |
|-----------|-----|
| Committed to wrong branch | `git stash`, checkout correct, `git stash pop` |
| Undo last commit | `git reset --soft HEAD~1` (keeps changes staged) |
| Deleted branch | `git reflog`, `git checkout -b <name> <sha>` |
| Recover file from history | `git restore --source=<commit> -- path` |

## CI/CD Bot Identity

- GitLab: Project Access Token (Maintainer, api + write_repository), store as masked CI var. `CI_JOB_TOKEN` can't push to protected branches; use PAT. Detached HEAD: `HEAD:refs/heads/main` refspec. Strip existing auth before injecting token.
- GitHub: built-in `GITHUB_TOKEN` = `github-actions[bot]`. Custom bot: GitHub App. Encrypt secrets with `pynacl` SealedBox.
- Mirroring: loop prevention via actor/commit-message checks.

## Verification

- `git branch --show-current` confirms not on protected branch before commit.
- `git status` clean or intended state before/after operations.

## Related Skills

| When | Load |
|------|------|
| Commit messages | `conventional-commits` |
| Isolated workspace | `git-worktrees` |
| Branch ready to integrate | `finishing-branch` |
| Creating PR | `github` |
