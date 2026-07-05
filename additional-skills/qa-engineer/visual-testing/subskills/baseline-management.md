# Baseline Management

## Git-Based Baselines

Store screenshot baselines in the repo alongside tests:
```
tests/
  __screenshots__/
    login-page-chromium-linux.png
    dashboard-chromium-linux.png
```

Branch strategy:
- Baselines live on the branch where the UI change happens
- Merge to main updates the "source of truth" baselines
- Feature branches diverge from main's baselines, update as needed

Merge conflict resolution: always take the incoming branch's baseline if the UI intentionally changed. If unintentional, investigate.

## Cloud-Based Baselines (Chromatic/Percy)

Advantages over git-based:
- No binary files bloating the repo
- Built-in visual diff UI for review
- Automatic baseline management across branches
- No merge conflicts on image files
- History/versioning without git LFS overhead

Trade-off: vendor dependency, cost at scale, requires network in CI.

## Approval Workflow

Define who approves visual changes:
- **Design team**: major layout changes, new components
- **Feature developer**: minor adjustments within existing patterns
- **Auto-approve**: changes on main after PR merge (Chromatic `--auto-accept-changes`)

When to update baselines:
- Intentional design change (feature work)
- Dependency update that affects rendering (font, icon library)
- Browser engine update causing rendering shift

Never auto-update without human review on feature branches.

## Cross-Branch Conflicts

Prevention:
- Keep visual tests scoped to components, not full pages
- Avoid shared global styles that affect many baselines at once
- Update baselines in the same PR as the code change

Resolution:
- Regenerate baselines on the conflicted branch: `npx playwright test --update-snapshots`
- Review regenerated baselines before committing
- If both branches changed the same component: merge code first, then regenerate

## Automation for Intentional Changes

```yaml
# Auto-update baselines when label "update-baselines" is added
on:
  pull_request:
    types: [labeled]
jobs:
  update:
    if: github.event.label.name == 'update-baselines'
    steps:
      - run: npx playwright test --update-snapshots
      - run: git add **/__screenshots__/**
      - run: git commit -m "chore: update visual baselines"
      - run: git push
```

## Storage Considerations

For repos with 100+ baselines:
- **Git LFS**: track `*.png` files to avoid repo bloat
- **LFS config**: `.gitattributes` with `*/__screenshots__/*.png filter=lfs diff=lfs merge=lfs`
- **Alternative**: cloud-based service eliminates storage concern entirely
- **Cleanup**: prune old baselines for deleted tests periodically

## Version Control Best Practices

1. Commit baselines in the same PR as the code change (atomic change)
2. Never commit baselines from a different OS than CI runs on
3. Use `.gitattributes` to mark PNG as binary (prevents diff noise)
4. Review baseline diffs with image-capable diff tools (GitHub, GitLab built-in)
5. Tag baseline snapshots on releases for rollback reference
6. Document baseline generation environment in contributing guide
