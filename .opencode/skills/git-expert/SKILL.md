---
name: git-expert
description: "Git mastery: operations, branching, worktrees, commits, repo analysis. Use when branching, merging, rebasing, committing, opening a PR, using worktrees, or recovering from a bad git state."
---

# Git Expert

Single entry point for all git work: operations, branching strategy, worktrees, conventional commits, branch finishing/integration, and learning patterns from external repos.

## Scope

- HANDLES: branching, rebasing, conflict resolution, history recovery, CI/CD bot identity, and routing to specialized subskills below.
- DEFERS: PRs to `subskills/github-workflows.md`; code review to `@lens`; security analysis to `@shield`.

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

## OpenSpec Changes

- Reference the change id in the commit subject scope so history maps to the plan: `feat(add-auth): ...` for change `add-auth`. One commit per task in `tasks.md`.
- Never commit a flipped `- [ ]` -> `- [x]` checkbox without the code that satisfies it in the same commit. A checked task with no diff is a false completion signal.
- Planning artifacts under `openspec/changes/<name>/` are committed, not gitignored. The plan is reviewable history.
- Archiving is a git-visible move: `/opsx-archive` relocates the change to `openspec/changes/archive/YYYY-MM-DD-<name>/` and updates main specs. Commit that as its own change, separate from feature code.
- Before merging, all tasks complete and `openspec validate --all --json` green. An unarchived change with every task done is unfinished delivery.
- Files written by `openspec update` are generated: `.opencode/skills/openspec-*/` and `.opencode/commands/opsx-*.md`. Do not hand-edit them in a commit, they get overwritten.

## Verification

- `git branch --show-current` confirms not on protected branch before commit.
- `git status` clean or intended state before/after operations.
- `openspec validate --all --json` green before merging a change.

## AI-Era Context (2026)

**Git Performance & New Features**:
- **reftable backend**: 10-100x faster ref operations, fixes case-insensitive FS and macOS unicode issues. Still OPT-IN (`git init --ref-format=reftable` or `git config --local core.refStorage reftable` in existing repos); `files` remains the default.
- **Partial clone**: `git clone --filter=blob:none` fetches commit history but delays blob downloads. Ideal for large repos (monorepos, ML model repos).
- **Sparse checkout**: `git sparse-checkout set <path>` limits working tree to specific paths. Pair with partial clone for massive repos.
- **Git 2.43+**: improved diff algorithms, better merge conflict markers, faster `git status` on large repos.

**Alternative VCS**:
- **Jujutsu (jj)**: emerging Git-compatible VCS with better UX (automatic local branching, simpler rebase, better conflict resolution). Gaining traction in 2026, especially for complex workflows.
- Interop: `jj git export` syncs to Git, so teams can adopt incrementally.

**AI-Augmented Git**:
- **GitHub Copilot Workspace**: AI-driven planning from issue → plan → code → PR. Integrates with git workflows, auto-generates commits.
- **AI commit messages**: gpt-commit, aicommits tools generate conventional commits from diffs. Review before accepting — AI often misses context.
- **PR review assistants**: GitHub Copilot, CodeRabbit, Bito AI review PRs. Still need human review for logic/security.

**Monorepo & Large Repo**:
- Scalar (Microsoft): optimizes Git for monorepos (background fetching, commit-graph maintenance, sparse checkout defaults).
- Git LFS 3.5+: improved batch transfers, better caching. Use for models, datasets, binary assets >5MB.

## Related Skills

| When | Load |
|------|------|
| Creating PR | `subskills/github-workflows.md` |
| Code review before merge | `@lens` |
| Security analysis | `@shield` |
