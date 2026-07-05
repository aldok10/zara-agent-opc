# Stakeholder Views

## Principle

One roadmap, multiple views. Same source of truth, different detail per audience.

## Audience Needs

| Audience | Cares About | Doesn't Need | Format |
|----------|-------------|--------------|--------|
| Executive | Outcomes, confidence, strategic alignment | Task-level detail, dependencies | 1-pager, quarterly |
| Team | Initiatives, dependencies, capacity, blockers | Business justification depth | Detailed board, weekly |
| Customer | Value delivered, direction | Internal priorities, dates | Portal/blog, quarterly |
| Partner | Integration timeline, API changes | Internal capacity | Roadmap share, as-needed |

## Executive View

**Format**: 1-page summary, updated quarterly

**Include**:
- 3-5 strategic themes with confidence level
- Key outcomes expected this quarter
- Progress vs last quarter's bets (green/yellow/red)
- Major risks or asks

**Exclude**: feature names, sprint details, technical debt items

**Template**:
```
## Q[X] Roadmap Summary
### Strategic Themes: [theme] (confidence)
### Expected Outcomes: [metric from → to]
### Last Quarter Results: [outcome achieved/missed]
### Risks & Asks: [blocker needing exec action]
```

## Team View

**Format**: Detailed board (Now/Next/Later), updated weekly

**Include**:
- All initiatives with owners
- Dependencies and blockers
- Capacity allocation
- Discovery work in progress
- Sprint-level breakdown for Now items

**Exclude**: strategic justification narrative (link to it)

## Customer-Facing View

**Format**: Public portal or blog post, updated quarterly

**Include**:
- Value themes (not feature names)
- Directional language: "exploring", "investing in", "coming soon"
- Recently delivered value
- Feedback channels

**Exclude**: dates, internal codenames, confidence levels, killed items

**Rules**:
- Zero dates  -  use "soon/later/exploring"
- Frame as value to customer, not work done by team
- Never promise  -  use "we're investing in" language

## Partner View

**Format**: Shared document, updated as-needed

**Include**:
- Integration-relevant changes with approximate timing
- API deprecations with migration window
- Joint initiatives and coordination needs

**Exclude**: internal priorities, non-integration items

## Generation Rules

1. Start from single source (Now/Next/Later board)
2. Filter by audience needs
3. Translate technical → value language for external views
4. Review with stakeholder before publishing
5. Version and date all views

## Anti-patterns

- Same view for all audiences → either too detailed or too vague
- Customer view with dates → creates expectations, erodes trust
- Executive view with 20 line items → lost in detail
- Team view without dependencies → hidden blockers surface late
