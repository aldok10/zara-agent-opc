# Advanced Git Operations

Power tools for debugging, history rewriting, large files, and monorepo workflows.

## git bisect (Binary Search for Bugs)

Find the exact commit that introduced a bug:

```bash
git bisect start
git bisect bad              # current commit is broken
git bisect good <sha>       # last known working commit
# git checks out middle commit; you test, then mark:
git bisect good  # or  git bisect bad
# repeat until it identifies the culprit
git bisect reset            # return to original HEAD
```

Automate with a test script: `git bisect run ./test.sh` (exit 0 = good, non-zero = bad).

## git filter-repo (Rewrite History)

Preferred over `filter-branch` (deprecated). Install: `pip install git-filter-repo`.

```bash
# Remove a file from entire history (leaked secret, large binary)
git filter-repo --invert-paths --path secrets.env

# Remove a directory
git filter-repo --invert-paths --path vendor/

# Rename author across all commits
git filter-repo --mailmap mailmap.txt
```

After filter-repo: force-push all branches + tell collaborators to re-clone. Old SHAs are invalidated.

## Submodules vs Subtree

| | Submodules | Subtree |
|--|-----------|---------|
| Model | Pointer to external repo at pinned SHA | Full copy merged into tree |
| Clone | Requires `--recurse-submodules` | Works out of the box |
| Update | `git submodule update --remote` | `git subtree pull --prefix=lib remote branch` |
| Best for | Shared libraries with independent release cycles | Vendoring or infrequent sync |

Submodule gotchas: detached HEAD inside submodule, forgotten `--recurse` on clone, stale pins.
Subtree gotchas: noisy merge commits, harder to push changes back upstream.

## git hooks

Client-side hooks live in `.git/hooks/` (not tracked). Use a manager for team consistency.

| Hook | Fires | Common use |
|------|-------|-----------|
| pre-commit | Before commit created | Lint, format, type-check |
| commit-msg | After message written | Enforce conventional commits |
| pre-push | Before push sent | Run tests, block force-push to protected |
| prepare-commit-msg | Before editor opens | Inject ticket number from branch name |

Managers: **lefthook** (fast, yaml config) or **husky** (Node ecosystem). Both commit config to repo.

```yaml
# .lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      run: npm run lint -- --fix && git add {staged_files}
    types:
      run: npx tsc --noEmit
```

## git lfs (Large File Storage)

Track large/binary files without bloating the repo:

```bash
git lfs install                     # one-time per machine
git lfs track "*.psd"               # adds to .gitattributes
git add .gitattributes
git add design.psd && git commit
```

Patterns: `*.psd`, `*.zip`, `models/**/*.bin`, `assets/videos/*`.
Check what's tracked: `git lfs ls-files`. Migrate existing: `git lfs migrate import --include="*.bin"`.

## Sparse Checkout (Monorepo Partial Clone)

Clone only what you need from a large monorepo:

```bash
git clone --filter=blob:none --sparse <url>
cd repo
git sparse-checkout set services/auth libs/shared
# only those dirs are materialized on disk
```

Add more later: `git sparse-checkout add services/api`. List active: `git sparse-checkout list`.

## Forensics (blame, log -p)

```bash
git blame -L 42,60 src/auth.ts       # who wrote lines 42-60
git blame -w -M -C src/auth.ts       # ignore whitespace, detect moves/copies
git log -p -- src/auth.ts             # full patch history of one file
git log --all -S "functionName"       # find when a string was added/removed (pickaxe)
git log --all -G "regex"              # grep diffs for pattern
git shortlog -sn --no-merges         # contributor stats
```

## git stash

Save work without committing:

```bash
git stash                            # stash tracked changes
git stash -u                         # include untracked files
git stash push -m "wip: auth" -- src/auth.ts  # stash specific files with message
git stash list                       # see all stashes
git stash pop                        # apply + remove most recent
git stash apply stash@{2}            # apply specific, keep in list
git stash drop stash@{0}             # remove specific
git stash clear                      # nuke all stashes
```

Prefer branches for anything lasting more than a few minutes. Stash is for quick context switches.
