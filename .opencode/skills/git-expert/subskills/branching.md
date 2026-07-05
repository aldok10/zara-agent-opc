# Branching & Integration

Branch strategy selection plus finishing completed work: merge, PR, keep, or discard.

## Scope

- HANDLES: strategy choice, test verification, integration options, worktree cleanup.
- DEFERS: commit messages to `subskills/commits.md`; PRs to `github`; review to `code-review`.

## Branching Strategies

- Trunk-based: short-lived branches, merge to `main` frequently. Best for CI/CD-heavy.
- Git Flow: `main`/`develop`/`feature/*`/`release/*`/`hotfix/*`. Best for versioned releases.
- GitHub Flow: branch from `main`, PR, merge after review. Simple default.

## Finishing a Branch  --  First Action

Run the project's test suite (command from package.json/Makefile/conventions). Fail → STOP, report, fix. Pass → present options.

## Integration Options (present exactly 4)

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

## Cleanup (Merge and Discard only)

1. `cd` to main repo root.
2. `git worktree remove <path>`.
3. `git worktree prune`.

## Verification

- Tests pass before presenting options.
- Merged result re-tested before declaring merge complete.
- Discard confirmed with commit list shown.
