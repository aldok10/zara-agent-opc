---
type: subskill
title: "Release Trains"
---

# Release Trains

## When to Use

- 3+ teams shipping to same product.
- Regulatory/compliance requires coordinated releases.
- Shared infrastructure changes need synchronized deployment.

**Not needed**: Single team, continuous deployment, independent microservices.

## Train Schedule

| Cadence | Best For | Code Freeze |
|---------|----------|-------------|
| Weekly | Fast-moving, small teams | 1 day before |
| Bi-weekly | Most product teams | 2 days before |
| Monthly | Enterprise, regulated | 1 week before |

## Process

### Week 1 (Development)
- Teams merge to trunk behind feature flags.
- Release captain confirms scope with each team.

### Cut Date (e.g., Wednesday Week 2)
- Release branch cut from trunk.
- Only cherry-picks after this point. No new features.
- Cherry-pick criteria: P0/P1 bugs only, with release captain approval.

### Code Freeze (e.g., Thursday Week 2)
- No changes except critical hotfixes.
- Full regression suite runs.
- Release notes compiled from conventional commits.

### Release Day (e.g., Monday Week 3)
- Canary deploy: 1% > 5% > 25% > 100%.
- Release captain monitors metrics at each stage.
- Go/no-go decision at each stage gate.

## Release Captain

- Rotates weekly/bi-weekly across senior engineers.
- Responsibilities: cut branch, approve cherry-picks, monitor deploy, communicate status.
- Authority: can halt release, reject cherry-picks, escalate blockers.
- Handoff: captain briefs next captain on any in-flight issues.

## Cherry-Pick Policy

1. Only P0/P1 bugs qualify after code freeze.
2. Must have test coverage for the fix.
3. Release captain approves each cherry-pick.
4. Cherry-pick applied to release branch AND trunk (no drift).
5. Max 3 cherry-picks per release. More = release is unstable, delay it.

## Hotfix Process

1. Branch from release tag (not trunk).
2. Fix + test on hotfix branch.
3. Deploy hotfix through canary stages (accelerated: 1% > 25% > 100%).
4. Cherry-pick fix forward to trunk immediately.
5. Bump PATCH version.

## Cross-Team Coordination

- Release scope locked 1 week before cut date.
- Each team designates a release contact (not necessarily captain).
- Blockers raised in daily release standup (5 min, async-first).
- Dependencies between teams resolved before cut date or deferred.

## Verification

- [ ] Release captain assigned and briefed
- [ ] Cut date and freeze date on team calendars
- [ ] Cherry-pick policy communicated to all teams
- [ ] Release notes generated before deploy
- [ ] Canary stages monitored with go/no-go gates
- [ ] Hotfix process documented and tested quarterly
