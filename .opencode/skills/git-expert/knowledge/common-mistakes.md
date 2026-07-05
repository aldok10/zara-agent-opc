---
type: fact
title: "Git Common Mistakes - Production Lessons"
---

## Force Push & History Rewriting

| Mistake | Impact | Fix |
|---------|--------|-----|
| git push --force on shared branches | Overwrites teammates' commits, lost work | --force-with-lease, branch protection |
| Rebasing already-pushed commits | Duplicated commits, conflicts on every pull | Only rebase local/unpushed commits |
| Amending pushed commits | Forces teammates to reconcile diverged refs | New fixup commit instead |
| git reset --hard on shared branch | Data loss for team | git revert for public undo |

## Committing Secrets

| Mistake | Impact | Fix |
|---------|--------|-----|
| Committing API keys/tokens/.env | Secrets persist in history forever | Pre-commit hooks (gitleaks), .gitignore |
| Assuming git rm removes from history | Secret remains in prior commits | git filter-repo + rotate credential |
| Pushing to public repo without review | Accidental exposure of private keys | git diff --staged before commit |

## Merge vs Rebase Confusion

| Mistake | Impact | Fix |
|---------|--------|-----|
| Rebasing long-lived diverged branch | Repeated conflict resolution per commit | git rerere; prefer merge for long-diverged |
| Mixing strategies inconsistently | Duplicate commits, unpredictable conflicts | Team-wide documented strategy |
| Merge commit pollution | History cluttered, hard to bisect | git pull --rebase; pull.rebase=true |

## Detached HEAD & Data Loss

| Mistake | Impact | Fix |
|---------|--------|-----|
| Commits in detached HEAD without branching | Unreachable after switch, garbage collected | git checkout -b immediately |
| git clean -fd without checking | Permanently deletes untracked files | git clean -n (dry run) first |

## Submodule Pitfalls

| Mistake | Impact | Fix |
|---------|--------|-----|
| Forgetting submodule update after clone | Empty dirs, build fails | clone --recurse-submodules; hooks |
| Committing pointer without pushing submodule | Dangling reference | Push submodule first |

## Large Files & Bloat

| Mistake | Impact | Fix |
|---------|--------|-----|
| Committing large binaries | Repo size balloons permanently | Git LFS; .gitignore artifacts |
| Committing node_modules/vendor | Massive size, merge conflicts | .gitignore from day one |

## .gitignore Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Adding .gitignore after files tracked | Files continue tracked | git rm --cached then commit |
| Incomplete .gitignore | .DS_Store, .idea pollute repo | Global gitignore for OS/IDE |

## Branch Management

| Mistake | Impact | Fix |
|---------|--------|-----|
| No naming convention | Can't identify purpose, automation breaks | Enforce feature/fix/release/ prefixes |
| Long-lived stale branches | Drift becomes unmergeable | Regular cleanup, auto-delete after merge |
| Working directly on main | Bypasses review, breaks CI | Branch protection rules |

## Workflow

| Mistake | Impact | Fix |
|---------|--------|-----|
| git add . without reviewing | Debug logs, temp files committed | git add -p; git diff --staged |
| Giant monolithic commits | Can't bisect, can't revert selectively | One logical change per commit |
| Cherry-pick without tracking | Same change applied twice during merge | Use -x flag; prefer merge |
