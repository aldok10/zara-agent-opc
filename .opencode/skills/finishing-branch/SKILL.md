---
name: finishing-branch
description: Guide integration after implementation complete and tests pass
triggers:
  - "finish branch"
  - "done with branch"
  - "merge or PR"
  - "what do I do with this branch"
  - "integration decision"
---

# Finishing Branch

Guide the user through integrating completed work from a feature branch.

## Scope

- HANDLES: test verification, integration options (merge/PR/keep/discard), worktree cleanup.
- DEFERS: commit messages to `conventional-commits`; git internals to `git-expert`; review to `code-review`; PRs to `github`.

## First Action

Run the project's test suite (command from package.json/Makefile/conventions). Fail → STOP, report, fix. Pass → present options.

## Constraints

1. Present exactly 4 options: Merge, PR, Keep, Discard.
2. Merge/Discard require cleanup; run `git worktree remove` from main repo root only.
3. Discard: CONFIRM first, listing all commits that will be lost.
4. Re-run tests on merged result; fail → abort merge, report.

## DO NOT

- NEVER proceed with failing tests.
- NEVER delete without explicit user confirmation.
- NEVER force-push without explicit request.
- NEVER run `git worktree remove` from inside the worktree being removed.
- NEVER claim "done" without running tests on merged result.
- NEVER merge to a protected branch directly (use PR).
- NEVER discard work without listing commits lost.

## Options

| Option | Merge? | Push? | Keep Worktree? | Cleanup Branch? |
|--------|--------|-------|----------------|-----------------|
| Merge | Yes | No | No | Yes (delete) |
| PR | No | Yes | Yes | No |
| Keep | No | No | Yes | No |
| Discard | No | No | No | Yes (force) |

- Merge: `git checkout <base> && git pull && git merge <feature>`, re-run tests, cleanup.
- PR: `git push -u origin <feature> && gh pr create --fill`, keep worktree, report URL.
- Keep: report branch + worktree location, do nothing else.
- Discard: `git log --oneline <base>..<feature>` to list losses, confirm, then `git branch -D`.

## Cleanup (Merge and Discard only)

1. `cd` to main repo root.
2. `git worktree remove <path>`.
3. `git worktree prune`.

## Verification

- Tests pass before presenting options.
- Merged result re-tested before declaring merge complete.
- Discard confirmed with commit list shown.

## Related Skills

| When | Load |
|------|------|
| Commit messages | `conventional-commits` |
| Git operations | `git-expert` |
| Review before merge | `code-review` |
| Creating PR | `github` |
