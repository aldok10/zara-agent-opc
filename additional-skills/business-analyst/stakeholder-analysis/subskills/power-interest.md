# Power-Interest Matrix

Stakeholder classification by power and interest level, engagement strategies, and prioritization.

## When to Load

- Identifying which stakeholders to focus on
- Planning engagement levels for different groups
- Managing competing stakeholder priorities
- Starting a new project or major initiative

## Key Concepts

**Power** -- Ability to influence the project outcome. Sources: decision authority, budget control, technical veto, organizational position, expertise, political influence.

**Interest** -- Level of concern about the project outcome. High interest: directly affected by results. Low interest: tangentially related or unaffected.

**Quadrants** -- High Power/High Interest (manage closely), High Power/Low Interest (keep satisfied), Low Power/High Interest (keep informed), Low Power/Low Interest (monitor).

**Engagement Level** -- Current vs desired: Unaware, Resistant, Neutral, Supportive, Leading. Plan actions to move stakeholders toward desired engagement.

**Dynamic Nature** -- Power and interest change over project phases. A stakeholder low-interest during planning may become high-interest during rollout. Reassess quarterly.

## Patterns

```
# Power-Interest Matrix

                    HIGH INTEREST
                         |
    Keep Satisfied       |     Manage Closely
    (High Power,         |     (High Power,
     Low Interest)       |      High Interest)
                         |
    - Regular updates    |     - Active collaboration
    - No surprises       |     - Frequent 1:1s
    - Address concerns   |     - Co-create solutions
      quickly            |     - Early input on decisions
                         |
HIGH POWER -------- -----+----------------------- LOW POWER
                         |
    Monitor              |     Keep Informed
    (Low Power,          |     (Low Power,
     Low Interest)       |      High Interest)
                         |
    - Minimal effort     |     - Regular communications
    - Watch for shifts   |     - Feedback channels
    - Group updates      |     - Show their input matters
                         |
                    LOW INTEREST
```

```markdown
# Stakeholder Register

| Stakeholder | Power | Interest | Quadrant | Current | Desired | Strategy |
|-------------|-------|----------|----------|---------|---------|----------|
| CTO | High | High | Manage closely | Supportive | Leading | Weekly sync, decision partner |
| Finance VP | High | Low | Keep satisfied | Neutral | Supportive | Monthly ROI updates |
| End users | Low | High | Keep informed | Resistant | Supportive | Beta program, feedback loop |
| Legal team | Med | Low | Monitor | Unaware | Neutral | Notify when compliance-relevant |
| Dev team | Med | High | Keep informed | Neutral | Supportive | Involve in architecture decisions |
```

## Gotchas

- Static analysis: power and interest shift as projects progress -- review monthly
- Ignoring "keep satisfied" quadrant: high-power stakeholders can kill projects when surprised
- Confusing formal authority with actual influence (informal networks matter)
- Treating all stakeholders equally wastes effort on low-power/low-interest group
- Not identifying hidden stakeholders (the CTO's trusted advisor who is not on the org chart)

## Verification

- Every stakeholder has a documented current AND desired engagement level
- High-power/high-interest stakeholders have specific, personalized engagement plans
- Matrix is reviewed and updated at each project phase transition
- No stakeholder in "manage closely" quadrant is more than 2 weeks without contact
- Hidden influencers are identified and positioned correctly
