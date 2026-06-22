---
name: finishing-branch
description: Use when implementation is complete and all tests pass — guides integration decision
triggers:
  - "finish branch"
  - "done with branch"
  - "merge or PR"
  - "what do I do with this branch"
  - "integration decision"
---

# Finishing Branch

Guide the user through integrating completed work from a feature branch.

## Step 1 — Verify Tests

Run the project's test suite. Determine the command from package.json, Makefile, or project conventions.

- If tests **fail**: STOP. Report failures. Fix before proceeding.
- If tests **pass**: Continue to Step 2.

## Step 2 — Present Options

Present exactly these 4 options:

1. **Merge** — Merge back to base branch locally
2. **PR** — Push and create a pull request
3. **Keep** — Leave branch as-is (user handles later)
4. **Discard** — Delete this work entirely

Ask the user to choose.

## Step 3 — Execute Choice

### Option 1: Merge

```
git checkout <base-branch>
git pull origin <base-branch>
git merge <feature-branch>
```

Run tests again on merged result. If tests fail: abort merge, report.
If pass: cleanup worktree, delete feature branch.

### Option 2: PR

```
git push -u origin <feature-branch>
gh pr create --fill
```

Do NOT cleanup worktree — user may need it for PR iteration.
Report the PR URL.

### Option 3: Keep

Report the branch name and worktree location. Do nothing else.

### Option 4: Discard

**CONFIRM FIRST.** List all commits that will be lost:

```
git log --oneline <base-branch>..<feature-branch>
```

Only after explicit confirmation, proceed with cleanup.
Force-delete the branch: `git branch -D <feature-branch>`

## Cleanup Procedure

Only for Merge and Discard. Order matters:

1. `cd` to main repo root (never run worktree remove from inside the worktree)
2. `git worktree remove <worktree-path>`
3. `git worktree prune`

## Quick Reference

| Option  | Merge? | Push? | Keep Worktree? | Cleanup Branch? |
|---------|--------|-------|----------------|-----------------|
| Merge   | Yes    | No    | No             | Yes (delete)    |
| PR      | No     | Yes   | Yes            | No              |
| Keep    | No     | No    | Yes            | No              |
| Discard | No     | No    | No             | Yes (force)     |

## Red Flags

- Never proceed with failing tests
- Never delete without explicit user confirmation
- Never force-push without explicit request
- Never run `git worktree remove` from inside the worktree being removed

## Related Knowledge (load on demand)

- `knowledge_passage(query: "continuous integration merge deployment")` — CI/merge best practices
- `knowledge_passage(query: "shipping is a feature incremental delivery")` — when to ship vs polish

## Related Skills

| When | Load |
|------|------|
| Writing commit messages | `conventional-commits` |
| Git operations needed | `git-expert` |
| Need code review before merge | `code-review` |
| Creating PR on GitHub | `github` |
