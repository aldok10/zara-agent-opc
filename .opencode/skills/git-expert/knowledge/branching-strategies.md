# Branching Strategies

Choosing a branching model depends on team size, release cadence, deployment model, and risk tolerance. No single model fits all projects.

## Git Flow

Created by Vincent Driessen (2010). Best for: projects with scheduled releases, multiple supported versions.

### Branch structure

| Branch | Purpose | Lifetime |
|--------|---------|----------|
| `main` | Production-ready code, tagged releases | Permanent |
| `develop` | Integration branch for next release | Permanent |
| `feature/*` | New functionality | Until merged to develop |
| `release/*` | Release stabilization (only bugfixes) | Until merged to main + develop |
| `hotfix/*` | Emergency production fixes | Until merged to main + develop |

### Flow

1. Feature branches fork from `develop`, merge back to `develop`.
2. When develop is stable for release, create `release/x.y.z` from develop.
3. Only bugfixes go into the release branch. Merge back to both `main` and `develop`.
4. Hotfixes fork from `main`, merge to both `main` and `develop`.

### When to use

- Multiple versions in production simultaneously
- Long release cycles (weeks/months)
- Strict QA gates between development and production
- Teams >10 where isolation matters

### Downsides

- Merge conflicts between long-lived branches
- Overhead of maintaining develop + main separately
- Slow feedback loops

## GitHub Flow

Simplified model: `main` + short-lived feature branches.

### Rules

1. `main` is always deployable.
2. Create a descriptive branch from `main` for any change.
3. Push commits regularly. Open a PR when ready for review.
4. After review and CI pass, merge to `main`.
5. Deploy immediately after merge (CD pipeline).

### When to use

- Continuous deployment (deploy multiple times daily)
- Small to medium teams (2-15)
- Single version in production
- Strong CI/CD pipeline and test coverage

### Downsides

- No staging area for release candidates
- Requires discipline: every merge must be deployable
- Hard to coordinate large features without feature flags

## Trunk-Based Development

All developers commit to `main` (trunk) directly or via very short-lived branches (< 1 day).

### Key practices

- **Short-lived branches**: max 1-2 days. Merge daily.
- **Feature flags**: hide incomplete work behind toggles. Ship disabled, enable when ready.
- **Branch by abstraction**: for large refactors, introduce an abstraction layer, migrate incrementally.
- **Continuous integration**: everyone integrates to trunk at least daily.
- **Release from trunk**: tag or cut release branches only for stabilization (no back-merging).

### When to use

- High-performing teams with strong CI
- Continuous deployment targets
- Teams practicing pair/mob programming
- When merge conflicts from long-lived branches are killing velocity

### Release branches (variant)

For products that must support multiple versions: cut `release/x.y` from trunk when ready. Cherry-pick fixes backward. Never merge release back to trunk.

## OneFlow

Alternative to Git Flow that uses a single permanent branch (`main`).

### How it works

1. `main` is the single long-lived branch.
2. Feature branches fork from and merge to `main`.
3. Release branches fork from `main` for stabilization.
4. Hotfixes target the release branch, then cherry-pick to `main`.
5. Tags mark releases.

### Difference from Git Flow

- No `develop` branch. Simpler mental model.
- Release branches are ephemeral, not long-lived.
- Works well with feature flags.

## Release Flow (Microsoft)

Used by large-scale projects (Azure DevOps, Office).

1. Work on short-lived `topic/*` branches from `main`.
2. PR review + merge to `main`.
3. When ready to release: create `release/YYYY-MM-DD` from `main`.
4. Cherry-pick hotfixes into release branch.
5. Never merge release back to main. Fixes go to main first, cherry-pick backward.

## Decision Matrix

| Factor | Git Flow | GitHub Flow | Trunk-Based | OneFlow |
|--------|----------|-------------|-------------|---------|
| Release cadence | Weeks/months | Daily | Continuous | Weekly |
| Team size | Large | Small-Medium | Any (with discipline) | Medium |
| Supported versions | Multiple | One | One | One+ |
| CI/CD maturity | Low-Medium | High | Very High | Medium-High |
| Merge conflict risk | High | Low | Very Low | Low |
| Onboarding complexity | High | Low | Low | Medium |

## Monorepo Branching

Monorepos add complexity: a single branch contains multiple deployable units.

### Strategies

- **Nx affected**: `nx affected --target=build --base=main --head=HEAD` builds only changed projects. Branch per feature still works; CI scopes to affected.
- **Turborepo filtering**: `turbo run build --filter=...[origin/main]` runs only changed packages.
- **CODEOWNERS per path**: enforce reviewers per package. Different teams own different paths on the same branch.
- **Release tagging per package**: `@scope/package@1.2.3` tags. Independent versioning on shared trunk.

### Recommendations for monorepos

- Trunk-based or GitHub Flow works best (short branches reduce cross-package conflicts).
- Avoid Git Flow in monorepos (long-lived branches = constant conflicts across packages).
- Use path-based CI triggers to avoid running all tests on every PR.
- Lock files and shared configs (tsconfig, eslint) need extra review gates.
