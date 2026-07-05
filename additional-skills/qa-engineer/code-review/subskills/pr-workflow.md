---
type: subskill
title: "PR Workflow"
---

# PR Workflow

## Stacked PRs

Chain dependent PRs to keep each one small and reviewable.

**Pattern**: feature/base -> feature/step-1 -> feature/step-2

**Tools**:
- **Graphite**: `gt create`, `gt submit` - manages stack, rebases cascade
- **git-town**: `git town hack`, `git town sync` - branch relationship tracking
- **ghstack**: Meta's tool for stacking on GitHub

**Rules**:
- Each PR in stack is independently reviewable
- Bottom of stack merges first, triggers rebase up
- Never stack more than 4 deep (review fatigue)
- Mark dependencies in PR description

## Draft PRs

Use when:
- Work in progress, seeking early design feedback
- Running CI to validate approach before full implementation
- Signaling intent: "I'm working on this, don't duplicate"
- Sharing context with team before it's review-ready

Convert to ready when: tests pass, self-review done, description complete.

## Review Assignment

| Strategy | When to Use |
|----------|-------------|
| CODEOWNERS | Default. Path-based expertise matching |
| Round-robin | Spread load evenly across team |
| Expertise-based | Complex changes need domain expert |
| Author's choice | Cross-cutting changes, specific context needed |

Avoid: assigning > 2 reviewers (diffusion of responsibility). One primary, one optional.

## Merge Strategies

| Strategy | Use When | Result |
|----------|----------|--------|
| **Squash** | Feature branch, messy commits | Clean single commit on main |
| **Merge commit** | Preserving branch history matters | Merge commit + all branch commits |
| **Rebase** | Linear history preferred, clean commits | Replayed commits, no merge commit |

**Default recommendation**: Squash for feature branches, merge commit for release branches.

## Auto-Merge

Enable when ALL conditions met:
- CI passes (all required checks green)
- Required approvals obtained
- No unresolved conversations
- Branch is up to date with base

Safety gates:
- Never auto-merge to production branches
- Require re-approval if force-pushed after approval
- Disable for PRs touching auth, payments, or infrastructure

## Conflict Resolution

- Rebase onto target branch early and often
- Conflicts in generated files (lock files): regenerate, don't manual merge
- Conflicts in schema/migrations: coordinate with team, don't guess
- If conflict is complex: pair with the conflicting author

## Branch Protection Rules

Minimum for main/production:
- Require PR (no direct push)
- Require 1+ approval
- Require CI green
- Require branch up to date before merge
- Require signed commits (optional but recommended)
- Dismiss stale approvals on new push
- Restrict force-push and deletion
