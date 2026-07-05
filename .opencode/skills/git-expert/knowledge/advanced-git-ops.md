# Advanced Git Operations

Tools and techniques for complex repository management, history manipulation, and large-scale operations.

## git bisect

Binary search through commit history to find the commit that introduced a bug.

### Interactive usage

```bash
git bisect start
git bisect bad                 # current commit is broken
git bisect good v1.5.0         # this tag was working
# git checks out a midpoint -- test it
git bisect good                # or 'bad' depending on result
# repeat until git identifies the first bad commit
git bisect reset               # return to original HEAD
```

### Scripted bisect

Fully automated -- provide a test script that exits 0 (good) or 1 (bad):

```bash
git bisect start HEAD v1.5.0
git bisect run ./test-script.sh
git bisect reset
```

The script can be anything: compile check, test suite, grep for a string:

```bash
git bisect run sh -c 'make && ./run-test specific_test'
```

### Tips

- `git bisect skip`: mark a commit that can't be tested (broken build).
- `git bisect log`: replay the session. Save with `git bisect log > bisect.log`.
- `git bisect replay bisect.log`: resume a previous session.
- Bisect works on any property, not just bugs (performance regression, binary size).

## git filter-repo

Modern replacement for `git filter-branch` (which is deprecated). Requires separate install (`pip install git-filter-repo`).

### Remove a file from all history

```bash
git filter-repo --invert-paths --path secrets.env
```

### Remove a directory

```bash
git filter-repo --invert-paths --path-glob '*.log' --path vendor/
```

### Move a subdirectory to repo root (extract from monorepo)

```bash
git filter-repo --subdirectory-filter libs/auth
```

### Rewrite author information

```bash
git filter-repo --mailmap mailmap.txt
```

Where `mailmap.txt`:
```
New Name <new@email.com> <old@email.com>
```

### Replace text in all files across history

```bash
git filter-repo --replace-text expressions.txt
```

Where `expressions.txt`:
```
old-api-key==>REDACTED
secret-token==>REDACTED
```

### Important notes

- Always work on a fresh clone (`git clone --mirror` then `git filter-repo`).
- Force-push required after rewriting. All collaborators must re-clone.
- GitHub caches old objects -- contact support or delete/recreate repo for full removal.

## Submodules

Embed one git repository inside another at a specific commit.

### Add a submodule

```bash
git submodule add https://github.com/org/lib.git vendor/lib
git commit -m "chore: add lib submodule"
```

### Clone with submodules

```bash
git clone --recurse-submodules <url>
# or after clone:
git submodule update --init --recursive
```

### Update to latest upstream

```bash
git submodule update --remote vendor/lib
git add vendor/lib
git commit -m "chore: bump lib submodule"
```

### Pitfalls

- Detached HEAD inside submodules by default.
- CI must explicitly init submodules (`actions/checkout` with `submodules: recursive`).
- Merge conflicts on submodule pointer are confusing (just a SHA diff in the parent).
- Contributors forget to `git submodule update` after pulling.

### When to use

- Vendoring a dependency you need to pin at exact commits.
- Shared code across repos that has its own release cycle.
- When subtree merge noise is unacceptable.

## Subtree

Alternative to submodules: merge another repo's history into a subdirectory.

### Add a subtree

```bash
git subtree add --prefix=vendor/lib https://github.com/org/lib.git main --squash
```

### Pull updates

```bash
git subtree pull --prefix=vendor/lib https://github.com/org/lib.git main --squash
```

### Push changes back upstream

```bash
git subtree push --prefix=vendor/lib https://github.com/org/lib.git feature-branch
```

### Subtree vs Submodule

| Aspect | Subtree | Submodule |
|--------|---------|-----------|
| Clone complexity | None (code is inline) | Must init/update |
| History | Merged into parent | Separate repo |
| Contributing back | `subtree push` | Work in submodule dir |
| CI setup | Nothing extra | Must recurse |
| Updating | `subtree pull` | `submodule update --remote` |

Prefer subtree when consumers shouldn't need to know about the dependency. Prefer submodule when the dependency is large and independently versioned.

## Git Hooks

Scripts triggered by git events. Located in `.git/hooks/` (local, not committed) or managed via tooling.

### Common hooks

| Hook | Trigger | Use case |
|------|---------|----------|
| `pre-commit` | Before commit is created | Lint, format, type-check staged files |
| `commit-msg` | After message is written | Validate conventional commit format |
| `pre-push` | Before push to remote | Run tests, check for secrets |
| `prepare-commit-msg` | Before editor opens | Add ticket number from branch name |
| `post-merge` | After merge/pull | Auto-install deps if lockfile changed |
| `post-checkout` | After checkout/switch | Rebuild if significant files changed |

### husky (Node projects)

```bash
npx husky init
echo 'npx lint-staged' > .husky/pre-commit
echo 'npx commitlint --edit "$1"' > .husky/commit-msg
```

### lefthook (any project, Go-based)

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx}"
      run: npx eslint {staged_files}
    format:
      glob: "*.{ts,tsx,json}"
      run: npx prettier --check {staged_files}

pre-push:
  commands:
    test:
      run: npm test
```

### Bypassing hooks

```bash
git commit --no-verify  # skip pre-commit and commit-msg
git push --no-verify    # skip pre-push
```

Only bypass when you have a legitimate reason (emergency hotfix). Never make `--no-verify` a habit.

## Git LFS (Large File Storage)

Store large binary files (images, models, datasets) outside the git object store.

### Setup

```bash
git lfs install                          # one-time per machine
git lfs track "*.psd"                    # creates .gitattributes entry
git lfs track "models/**"
git add .gitattributes
git commit -m "chore: track PSD and models with LFS"
```

### Migrate existing files to LFS

```bash
git lfs migrate import --include="*.bin" --everything
```

### Check LFS status

```bash
git lfs ls-files                         # list tracked files
git lfs status                           # pending uploads
git lfs env                              # config and endpoint info
```

### Storage backends

- GitHub LFS: included with repo, bandwidth/storage quotas per plan.
- Self-hosted: any server implementing the LFS batch API (e.g., lfs-s3, gitea).
- Azure DevOps: built-in LFS support, no separate billing.

### Pitfalls

- LFS files don't diff well (binary).
- Clone is not fully offline -- LFS fetches from remote on checkout.
- CI must install LFS and run `git lfs pull`.
- `git lfs prune` to clean local cache.

## Sparse Checkout

Check out only part of a repository. Combined with partial clone for maximum efficiency.

### Setup (cone mode, Git 2.25+)

```bash
git clone --filter=blob:none --sparse <url>
git sparse-checkout init --cone
git sparse-checkout set src/my-package tests/my-package
```

### Add/remove paths

```bash
git sparse-checkout add docs/
git sparse-checkout list
git sparse-checkout disable   # restore full checkout
```

### Non-cone mode (pattern-based)

```bash
git sparse-checkout init
git sparse-checkout set '!/*' '/README.md' '/src/auth/**'
```

### Monorepo workflow

Combine with partial clone to work on one package in a 10GB monorepo:

```bash
git clone --filter=blob:none --sparse https://github.com/org/monorepo.git
git sparse-checkout set packages/my-app shared/utils
```

Only blobs for your packages are downloaded. Rest exists as pointers until needed.
