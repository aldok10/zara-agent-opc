---
type: fact
title: "Git Internals"
---
# Git Internals

How git actually works under the hood. Useful for debugging weird states, understanding why commands behave the way they do, and recovering from disasters.

## Object Model

Git is a content-addressable filesystem. Everything is stored as objects in `.git/objects/`.

### Four object types

| Type | Stores | Created by |
|------|--------|-----------|
| **blob** | File contents (no filename, no permissions) | `git add` |
| **tree** | Directory listing: mode + filename + pointer to blob/tree | `git commit` (implicitly) |
| **commit** | Tree pointer + parent(s) + author + committer + message | `git commit` |
| **tag** | Pointer to commit + tagger + message + optional GPG sig | `git tag -a` |

A commit does NOT store diffs. It stores a snapshot (tree) of the entire project. Diffs are computed on the fly by comparing trees.

### Inspect objects

```bash
git cat-file -t <sha>       # type (blob/tree/commit/tag)
git cat-file -p <sha>       # pretty-print contents
git ls-tree HEAD             # show tree at HEAD
git ls-tree -r HEAD          # recursive (all files)
```

## SHA-1 and SHA-256

Every object is identified by the SHA-1 hash of its contents (type + size + data). This gives deduplication (identical files = one blob) and integrity checking.

SHA-256 transition: Git 2.29+ has experimental support. Full switch expected in a future major version. Interop between SHA-1 and SHA-256 repos is not yet practical. For now, SHA-1 with collision detection (SHA-1DC) is the default.

## Refs (References)

Branches and tags are just files containing a SHA:

```
.git/refs/heads/main        # branch: points to latest commit
.git/refs/tags/v1.0.0       # lightweight tag: points to commit
.git/refs/remotes/origin/main  # remote-tracking branch
.git/HEAD                   # currently checked-out ref (or detached SHA)
```

A branch is a movable pointer. When you commit, the branch moves forward. That's it.

**HEAD**: usually contains `ref: refs/heads/<branch>`. Detached HEAD means it contains a raw SHA instead.

**Packed refs**: for performance, many refs get packed into `.git/packed-refs` (one file, one line per ref).

## DAG (Directed Acyclic Graph)

Commits form a DAG through their parent pointers. Each commit points back to one parent (or two for merges, zero for root commit). This structure is why:

- You can't create cycles (acyclic).
- History is immutable (changing any commit changes its SHA, which changes all descendants).
- Branches are just labels on nodes in the graph.

Understanding the DAG clarifies the difference between merge and rebase:
- **Merge** adds a new node with two parents (preserves both histories).
- **Rebase** copies commits to a new location in the graph (linear history, new SHAs).

## Packfiles and Garbage Collection

### Loose objects

Initially, each object is stored as a single zlib-compressed file in `.git/objects/ab/cdef1234...`.

### Packfiles

`git gc` (or automatic triggers) packs loose objects into `.git/objects/pack/*.pack` with an index (`.idx`). Packfiles use delta compression -- similar objects are stored as a base + diff. This is why git repos are small despite storing full snapshots.

```bash
git count-objects -vH        # see loose vs packed objects, size
git gc                       # manual pack + prune
git gc --aggressive          # recompute deltas (slow, rarely needed)
```

### Pruning

Unreachable objects (no ref points to them, directly or through parents) are pruned after the grace period (default: 2 weeks). `git reflog expire` + `git gc` cleans them.

## Reflog (Local Safety Net)

Every ref change (commit, reset, checkout, rebase, merge, pull) is logged in `.git/logs/`:

```bash
git reflog                   # show HEAD movements
git reflog show main         # show branch movements
git reflog expire --expire=90.days.ago --all  # default expiry
```

**90-day default**: reachable entries expire after 90 days, unreachable after 30 days. Reflog is LOCAL only -- not pushed, not shared.

Recovery via reflog:

```bash
git reflog
# find the SHA before the mistake
git reset --hard <sha>       # nuclear: resets working tree
git checkout -b recovery <sha>  # safer: branch from old state
```

## How Merge Works

### Fast-forward

If the target branch hasn't diverged, git just moves the pointer forward. No new commit. Use `--no-ff` to force a merge commit (preserves branch history).

### Three-way merge

When branches have diverged:
1. Find the **merge base** (common ancestor): `git merge-base main feature`
2. Compare base-to-main and base-to-feature.
3. If both changed the same lines differently: CONFLICT.
4. Otherwise: auto-merge, create merge commit with two parents.

**Recursive strategy** (default for 2 parents): if there are multiple merge bases (criss-cross history), it merges the merge bases first recursively. Since Git 2.33, `ort` (Ostensibly Recursive's Twin) replaced recursive as default -- same logic, faster implementation.

## How Rebase Works

`git rebase main` while on `feature`:

1. Find common ancestor of `feature` and `main`.
2. Save all commits from ancestor to `feature` tip as patches.
3. Reset `feature` to point at `main` tip.
4. Replay (cherry-pick) each saved patch onto the new base.
5. Each replayed commit gets a NEW SHA (different parent = different hash).

This is why rebasing rewrites history. The old commits still exist (reachable via reflog) until GC prunes them.

**Interactive rebase** (`-i`): before replaying, lets you reorder, squash, edit, or drop commits. The instruction sheet (`pick`, `squash`, `fixup`, `edit`, `drop`) drives the replay.

## Practical Internals Commands

```bash
# See what a branch actually is
cat .git/refs/heads/main

# Verify repository integrity
git fsck --full

# Find all objects referencing a path
git log --all --full-history -- path/to/file

# Show object storage stats
git count-objects -vH

# Trace what git does internally
GIT_TRACE=1 git status

# Create an object manually (plumbing)
echo "hello" | git hash-object -w --stdin
```

## Key Takeaways

1. Commits are snapshots, not diffs. Diffs are computed.
2. Branches are movable pointers to commits. Cheap to create/delete.
3. Nothing is lost until GC runs -- reflog is your undo stack.
4. Rebase creates new commits (new SHAs). Never rebase shared history.
5. The DAG is immutable: changing one commit changes every descendant.
6. `git gc` is usually automatic; manual runs are rarely needed.
