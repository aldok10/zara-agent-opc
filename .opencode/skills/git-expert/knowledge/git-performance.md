# Git Performance

Techniques for working with large repositories: millions of files, deep history, monorepo scale.

## Large Repo Challenges

| Problem | Cause | Impact |
|---------|-------|--------|
| Slow clone | Full history + all blobs | Minutes to hours |
| Slow checkout | Millions of files in working tree | I/O bottleneck |
| Slow status/diff | Scanning entire tree for changes | Developer friction |
| Slow fetch | Many refs, large packfiles | CI/CD slowdown |
| Large .git | Deep history with binary files | Disk pressure |

## Partial Clone

Download object metadata without downloading all blobs. Blobs fetch on demand (lazy).

### Blobless clone (most common)

```bash
git clone --filter=blob:none <url>
```

All commits and trees are fetched. Blobs download only when checked out or diffed. Ideal for: large repos where you don't need the full history of every file.

### Treeless clone

```bash
git clone --filter=tree:0 <url>
```

Only fetches commits initially. Trees and blobs fetch on demand. Faster initial clone but more network requests during `log` or `blame`.

### Size-filtered clone

```bash
git clone --filter=blob:limit=1m <url>
```

Skip blobs larger than 1MB. Useful when large binaries exist but you only need source code.

### Requirements

- Server must support `uploadpack.allowFilter=true` (GitHub, GitLab, Bitbucket Cloud all support it).
- Network required for on-demand fetches.
- Works with sparse-checkout for maximum efficiency.

## Shallow Clone

Truncate history to reduce clone size.

```bash
git clone --depth=1 <url>              # only latest commit
git clone --depth=50 <url>             # last 50 commits
git clone --shallow-since="2024-01-01" <url>
```

### Limitations

- `git log` only shows available history.
- `git blame` stops at the shallow boundary.
- `git merge-base` may fail if common ancestor is beyond depth.
- Some operations require unshallowing: `git fetch --unshallow`.

### Best for

- CI/CD where you only need to build, not analyze history.
- Large repos where clone time matters more than git operations.

## Scalar (Microsoft)

Background maintenance and optimizations for very large repos. Built into Git since 2.38.

### Register a repo

```bash
scalar register                  # enable for current repo
scalar clone <url>               # clone with optimizations enabled
```

### What it does

- Enables filesystem monitor (FSMonitor) for faster `git status`.
- Configures `feature.manyFiles` (split index, untracked cache).
- Runs background maintenance (prefetch, commit-graph, incremental-repack).
- Enables sparse-checkout and partial clone by default.
- Sets `pack.useBitmaps=true` for faster object enumeration.

### VFS for Git (legacy)

Virtual filesystem that projects only accessed files into the working directory. Used by Windows and Office repos (millions of files). Being superseded by Scalar + sparse-checkout for most cases.

## Git Maintenance

Built-in background optimization tasks (Git 2.29+).

```bash
git maintenance start            # enable cron/launchd schedule
git maintenance run              # manual single run
git maintenance stop             # disable schedule
```

### Tasks

| Task | Purpose | Default schedule |
|------|---------|-----------------|
| `commit-graph` | Speed up graph walks (log, merge-base) | Hourly |
| `prefetch` | Background fetch from remotes (no merge) | Hourly |
| `gc` | Pack objects, prune unreachable | Daily |
| `loose-objects` | Pack recent loose objects | Daily |
| `incremental-repack` | Repack without full GC cost | Daily |
| `pack-refs` | Pack loose refs into packed-refs | Never (manual) |

### Manual optimization

```bash
git gc                           # standard garbage collection
git gc --aggressive              # recompute all deltas (slow, rarely needed)
git repack -a -d --depth=50 --window=250  # aggressive repack
git commit-graph write --reachable        # regenerate commit-graph
```

## Commit-Graph

Precomputed data structure that accelerates graph traversal.

```bash
git commit-graph write --reachable
# stored in .git/objects/info/commit-graph
```

Speeds up: `git log`, `git merge-base`, reachability checks, ahead/behind counts. Significant for repos with 100K+ commits.

### Generation numbers

Commit-graph stores topological generation numbers, allowing graph walks to prune unreachable paths without traversing them. This turns O(n) operations into O(log n) for many queries.

## Fetch Negotiation and Bitmaps

### Fetch optimization

Git negotiates with the server to determine which objects the client already has. Improvements:

```bash
git config fetch.negotiationAlgorithm skipping  # faster for large repos
```

The `skipping` algorithm sends fewer have/want rounds by skipping commits in the negotiation.

### Bitmap indexes

`.bitmap` files alongside packfiles enable fast object enumeration:

```bash
git repack -a -d --write-bitmap-index
```

The server uses bitmaps to quickly compute which objects to send during clone/fetch. Reduces server CPU significantly for large repos.

### Multi-pack index (MIDX)

For repos with many packfiles (before full repack):

```bash
git multi-pack-index write
git multi-pack-index verify
```

Provides a single lookup table across all packs. Avoids opening N pack indexes.

## Monorepo-Specific Optimizations

### Sparse-checkout + partial clone combo

```bash
git clone --filter=blob:none --sparse <url>
git sparse-checkout set packages/my-app shared/lib
```

Result: only commits + trees fetched initially, only blobs for your packages downloaded. A 50GB monorepo becomes a 200MB local checkout.

### FSMonitor

OS-level file watching instead of scanning the entire tree for `git status`:

```bash
git config core.fsmonitor true           # built-in (Git 2.37+)
git config core.untrackedcache true      # cache untracked file list
```

Reduces `git status` from seconds to milliseconds in large working trees.

### Split index

For repos with >100K tracked files:

```bash
git config core.splitIndex true
```

Splits the index into a base (shared) and a delta (changed). Reduces index write time.

### Recommendations by repo size

| Files | Commits | Recommended setup |
|-------|---------|-------------------|
| <10K | <50K | Default git, no special config |
| 10K-100K | 50K-500K | commit-graph, fsmonitor, untracked cache |
| 100K-1M | 500K+ | Scalar, sparse-checkout, partial clone |
| 1M+ | 1M+ | Scalar + sparse-checkout + FSMonitor + split index |
