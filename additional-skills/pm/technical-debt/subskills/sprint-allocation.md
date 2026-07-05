# Sprint Allocation

## Budget Rule

Reserve 15-20% of sprint capacity for debt reduction. This is a floor, not a target.
- 10-person team, 2-week sprint = 15-20 story points dedicated to debt
- Track as separate swimlane or tagged items—never hidden in feature work

## Protecting the Allocation

1. **Make it visible**: Debt items appear on sprint board with distinct label/color
2. **Commit publicly**: State allocation in sprint planning, record in notes
3. **Escalate raids**: If PM/stakeholder tries to claim debt capacity, escalate to engineering lead
4. **Show ROI**: Monthly report: debt items closed, throughput impact, incidents prevented

## Framing for PMs/Stakeholders

Say: "We're investing in delivery speed." Never: "We need to refactor."
- "This 3-point debt item saves us 2 points/sprint in workarounds"
- "Fixing this removes a recurring incident source"
- "This unblocks parallel feature work next quarter"

## What Counts as Debt Work

Included: refactoring, dependency upgrades, test gap closure, documentation of undocumented systems, IaC migration, removing dead code, architectural boundary enforcement.

NOT included: feature work (even if it improves code), gold-plating, exploratory spikes (track separately), tooling improvements (separate budget).

## Sprint Planning Integration

1. Pull top-scored debt items from register (see prioritization-matrix)
2. Assign to volunteers or rotate ownership
3. Size like any other ticket
4. Fill allocation from top of prioritized list
5. Carry over unfinished debt items (don't silently drop)

## Reporting Format

Weekly: debt points completed / allocated (e.g., "8/10 debt points delivered")
Monthly: cumulative debt retired, throughput trend, debt ratio trend
Quarterly: full debt review (see examples/debt-review.md)

## Anti-patterns

- **Raiding**: Taking debt capacity when features are behind. Fix: hard boundary, escalate.
- **Invisible work**: Doing debt work inside feature tickets. Fix: separate tracking.
- **Gold-plating**: Over-engineering disguised as debt. Fix: scope to minimum viable fix.
- **Debt dumping**: Assigning all debt to one person. Fix: rotate ownership.

## Verification

- [ ] 15-20% allocation visible in sprint plan
- [ ] Debt items tracked separately from feature work
- [ ] Monthly report generated with throughput correlation
- [ ] No allocation raids in last 3 sprints
