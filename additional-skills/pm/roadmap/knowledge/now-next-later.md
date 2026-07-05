---
type: fact
title: "Now-Next-Later Roadmapping"
---

# Now-Next-Later Roadmapping

## What It Is

A time-horizon roadmap that communicates strategy without false precision. Instead of dates and Gantt charts, it uses confidence buckets:

```
NOW (committed, in progress)  |  NEXT (planned, high confidence)  |  LATER (exploring, low confidence)
```

## Column Definitions

### NOW
- Currently in development or about to start
- High commitment (team allocated, specs ready)
- Time horizon: this sprint/cycle (1-4 weeks)
- Specificity: features, user stories, concrete deliverables
- Confidence: >90% will happen

### NEXT
- Planned for upcoming cycles
- Dependencies identified, approach outlined
- Time horizon: 1-3 months
- Specificity: outcomes and themes, some feature detail
- Confidence: 60-80% will happen (may shift in priority)

### LATER
- Strategic direction, being explored
- Research/discovery phase
- Time horizon: 3-6+ months
- Specificity: problems to solve, opportunities to pursue
- Confidence: 30-50% (may change significantly)

## Outcome-Based Items

### Wrong: Feature-Based
```
NOW: Build search filters
NEXT: Add saved searches
LATER: Implement search analytics
```

### Right: Outcome-Based
```
NOW: Users find relevant results in <10 seconds (adding filters)
NEXT: Repeat searchers return to results instantly (saved searches)
LATER: Understand search behavior to improve relevance (analytics)
```

### The Outcome Template
```
[User segment] can [achieve outcome] so that [business value]
Measured by: [metric + target]
```

## Stakeholder Communication

### For Executives
- Show NOW column with confidence and progress
- Show NEXT as "planned direction" (not promises)
- Show LATER as "strategic bets we're exploring"
- Highlight: what changed since last review and why

### For Sales/Customer Success
- NOW: "We're building X, available in ~Y weeks"
- NEXT: "We're planning to address [problem], timeline TBD"
- LATER: "We're aware of [need], exploring options"
- Never: specific dates on NEXT/LATER items

### For Engineering Teams
- NOW: detailed specs, acceptance criteria, assignments
- NEXT: rough technical approach, dependency awareness
- LATER: problem space understanding, research tasks

### Update Cadence
| Audience | Frequency | Format |
|---|---|---|
| Exec/Board | Monthly | Async doc + review meeting |
| Sales/CS | Bi-weekly | Shared roadmap board |
| Engineering | Weekly | Sprint/cycle planning |
| All-hands | Monthly | Slide with changes highlighted |

## Flexibility Built In

### Movement Between Columns
- Items naturally flow: LATER → NEXT → NOW
- Items can ALSO flow backward or off the roadmap entirely
- Removal is healthy (means you're learning, not failing)
- Document WHY items moved (builds trust)

### Triggers for Roadmap Changes
- Customer feedback changes priority
- Market shift (competitor move, regulation)
- Technical discovery (harder or easier than expected)
- Business metric movement (crisis or opportunity)

### Change Communication
```
"We moved [X] from NEXT to LATER because [customer research showed Y].
 Instead, we're pulling [Z] into NEXT because [data shows higher impact]."
```

## OKR Alignment

### Mapping
```
Company OKR: "Improve user retention to 60%"
     ↓
NOW: Onboarding redesign (KR: complete onboarding rate +20%)
NEXT: Re-engagement notifications (KR: 7-day return rate +15%)
LATER: Personalized content feed (KR: daily active usage +10%)
```

### Rules
- Every NOW item should connect to a current-quarter KR
- NEXT items should connect to company objectives
- LATER items connect to long-term strategy (annual vision)
- Items without OKR connection: question why they're on the roadmap

## Managing the Board

### Item Format
```
Title: [clear, outcome-focused name]
Why: [problem being solved, evidence of importance]
Who: [user segment affected]
Metric: [how we'll measure success]
Status: [discovery | spec | in-progress | validating | done]
Owner: [PM or team responsible]
```

### Capacity Planning
- NOW column: never exceeds team capacity
- If NOW is overloaded, something must move back to NEXT
- NEXT size: 2-3x NOW (pipeline of ready work)
- LATER: unlimited (it's a backlog of opportunities)

### Pruning (quarterly)
- Remove LATER items that haven't moved in 2 quarters
- If nobody can explain why an item matters, remove it
- Fewer items = clearer strategy signal

## Anti-Patterns

- Putting dates on NEXT/LATER items (defeats the purpose)
- Moving everything to NOW under pressure (overcommit)
- Never moving items to LATER or off the board (no prioritization)
- Treating LATER as "definitely will do eventually" vs "maybe"
- Making roadmap decisions without customer evidence
- Roadmap as output of sales requests without strategic filter
- Not communicating changes (surprises erode trust)
- Using roadmap as commitment device rather than communication tool

## Tools

- **Productboard**: purpose-built, links to customer feedback
- **Linear roadmaps**: integrated with issue tracking
- **Notion/Confluence**: flexible, custom boards
- **Miro**: visual, good for collaborative workshops
- **Plain spreadsheet**: sometimes simplest is best

Choose based on: who needs to see it, how often it changes, how much interactivity is needed.
