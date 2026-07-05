---
name: git-expert
description: "Git mastery: operations, branching, worktrees, commits, repo analysis"
---

# Git Expert

Single entry point for all git work: operations, branching strategy, worktrees, conventional commits, branch finishing/integration, and learning patterns from external repos.

## Scope

- HANDLES: branching, rebasing, conflict resolution, history recovery, CI/CD bot identity, and routing to specialized subskills below.
- DEFERS: PRs to `github`; code review to `code-review`; security analysis to `shield`.

## First Action

Check current branch before ANY commit or push: `git branch --show-current`. Check state before destructive ops: `git status`, `git log --oneline -10`.

## Subskill Routing

Load the matching subskill for specialized work; otherwise handle inline with the sections below.

| When | Load |
|------|------|
| Isolated/parallel workspaces, `.worktrees/`, parallel agents | `subskills/worktrees.md` |
| Writing commit messages (Conventional Commits format) | `subskills/commits.md` |
| Branch strategy, finishing work, merge/PR/discard integration | `subskills/branching.md` |
| Learning patterns from a GitHub repo (GitReverse) | `subskills/learn-from-repo.md` |
| Versioning, tagging, releases, semver, changelog | `subskills/versioning.md` |
| bisect, filter-repo, submodules, hooks, LFS, stash | `subskills/advanced-operations.md` |
| PR, code review, CODEOWNERS, branch protection, GitHub CLI | `subskills/github-workflows.md` |
| GPG signing, secrets, Dependabot, credential management | `subskills/security.md` |

## Protected Branch Guard (mandatory)

Protected (NEVER commit directly): `main`, `master`, `production`, `prod`, `develop`, `development`, `dev`, `staging`, `release/*`, `hotfix/*`, `v[0-9]*`.

If on a protected branch: STOP, create feature branch `git checkout -b <type>/<description>`, then work.

## Constraints

1. Check current state before destructive operations.
2. Small, focused commits with clear messages.
3. Never rewrite history on shared branches unless the whole team agrees.
4. `git reflog` is the safety net; almost nothing is truly lost.
5. New branches: `git push -u origin <branch>`.
6. `--force-with-lease` only on your own feature branches, never protected.
7. Signed commits (GPG or SSH) for all releases and protected branches.

## DO NOT

- NEVER `git push --force` on shared branches (use `--force-with-lease` minimum).
- NEVER commit large binaries (Git LFS or gitignore).
- NEVER store secrets in history (if committed: rotate secret, `git filter-repo` to purge).
- NEVER use very long-lived branches.
- NEVER commit directly to protected branches.
- NEVER run destructive ops without checking `git status`.
- NEVER rebase a branch others are working on.
- NEVER claim "done" without verifying branch state.

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

## AI-Era Context

- Git 2.46+: reftable backend (faster ref operations), pack-refs improvements
- Jujutsu (jj): emerging Git-compatible VCS alternative gaining traction in 2026
- GitHub Copilot Workspace: AI-driven planning from issue to PR (integrate with git workflows)

## Related Skills

| When | Load |
|------|------|
| Creating PR | `github` |
| Code review before merge | `code-review` |
| Security analysis | `shield` |
