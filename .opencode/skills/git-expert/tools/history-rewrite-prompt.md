# History Rewrite Safety Prompt

You are guiding a git history rewrite operation. These are destructive — proceed with caution.

## Input

The user will provide:
- Goal (remove secret, squash commits, rename author, remove file from history)
- Branch(es) affected
- Whether the branch is shared/pushed
- Scope (single commit, range, entire history)

## Your Task

Guide a safe history rewrite:

### 1. Risk Assessment

Before any operation:
- **Is this branch shared?** If pushed and others have pulled, rewriting creates divergence
- **Is a backup available?** Create one before proceeding
- **Is this reversible?** After force-push + GC, original history is gone
- **Is there a non-destructive alternative?** (revert commit, new commit removing file)

Risk levels:
- Local-only branch: LOW — rewrite freely
- Pushed but solo: MEDIUM — force-push acceptable with `--force-with-lease`
- Shared branch: HIGH — coordinate with team, prefer non-destructive
- Default/protected branch: CRITICAL — use GitHub support or admin override

### 2. Pre-Rewrite Checklist

- [ ] Create backup branch: `git branch backup-{branch}-{date}`
- [ ] Verify clean working tree: `git status`
- [ ] Note current HEAD: `git rev-parse HEAD`
- [ ] Notify collaborators if shared branch
- [ ] Disable branch protection temporarily (if needed)

### 3. Tool Selection

Choose the right tool:
- **Interactive rebase** (`git rebase -i`): squash, reorder, edit messages (< 50 commits)
- **git-filter-repo**: remove files/secrets from entire history (preferred over filter-branch)
- **git commit --amend**: fix most recent commit only
- **git rebase --onto**: move commit range to new base

### 4. Common Operations

**Remove file from entire history:**
```bash
git filter-repo --invert-paths --path <file>
```

**Remove secret from specific commit:**
```bash
git rebase -i <commit>^
# mark commit as 'edit', remove secret, amend, continue
```

**Squash last N commits:**
```bash
git rebase -i HEAD~N
# mark all but first as 'squash'
```

**Change author across history:**
```bash
git filter-repo --commit-callback '
  if commit.author_email == b"old@email.com":
    commit.author_email = b"new@email.com"
    commit.author_name = b"New Name"
'
```

### 5. Post-Rewrite Verification

- [ ] `git log --oneline` — verify commits look correct
- [ ] `git diff backup-branch..HEAD` — should be empty (content unchanged)
- [ ] Test suite passes on rewritten branch
- [ ] Secret/file actually removed: `git log --all -p | grep <pattern>` returns nothing
- [ ] Force push with lease: `git push --force-with-lease origin {branch}`

### 6. Cleanup

- [ ] Collaborators re-clone or `git fetch && git reset --hard origin/{branch}`
- [ ] Delete backup branch after confirmation: `git branch -D backup-{branch}-{date}`
- [ ] If secret was exposed: rotate it regardless (history may be cached)
- [ ] Re-enable branch protection

## Output Format

```markdown
## History Rewrite: [Goal]

### Risk Level: [LOW | MEDIUM | HIGH | CRITICAL]

### Backup
[Backup branch name and HEAD sha]

### Commands
[Exact sequence of commands to execute]

### Verification
[How to confirm the rewrite worked]

### Rollback Plan
[How to undo if something goes wrong]
```
