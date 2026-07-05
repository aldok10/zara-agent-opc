# SAFe PI Planning

## When to Use

ART size is typically 50-125 people. SAFe doesn't prescribe minimum org size, but an ART needs enough teams (5-12) for cross-team coordination to matter. Multiple teams with dependencies, portfolio-level coordination needed. If fewer: use Scrum/Kanban + lightweight sync.

## Program Increment (PI)

- Duration: 8-12 weeks (typically 5 sprints + 1 IP sprint)
- IP sprint: Innovation & Planning (buffer, hackathon, planning)
- Each PI has PI Objectives (business outcomes, not features)

## 2-Day Event Structure

### Day 1
1. Business context (exec, 30min) — why this PI matters
2. Product vision (PM, 30min) — top 10 features prioritized
3. Architecture vision (architect, 30min) — enablers, tech debt
4. Team breakouts (2h) — draft plans, identify dependencies
5. Draft plan review (2h) — teams present, cross-team sync
6. Management review (1h) — adjust scope, resolve conflicts

### Day 2
1. Planning adjustments (1h) — incorporate Day 1 feedback
2. Team breakouts (2h) — finalize plans, resolve dependencies
3. Final plan review (1h) — each team presents objectives
4. Program board updated — features mapped to iterations + teams
5. Confidence vote — fist of five (1-5)
6. PI objectives committed — with uncommitted objectives separate

## Program Board

Visual map: rows = teams, columns = iterations. Cards = features/enablers.
Strings/lines = dependencies between teams.
Red flags = risks. Track dependency resolution daily.

## Confidence Vote

Fist of five: 1=no confidence, 5=full confidence.
- Average <3: re-plan. Address concerns immediately.
- 3-4: acceptable with identified risks.
- Individual 1-2: that person explains concern, team addresses.

## Capacity Allocation

Typical split:
- 70% new features
- 20% enablers (tech debt, architecture)
- 10% maintenance/bugs

Adjust per PI based on technical health. Never 100% features.

## Uncommitted Objectives

Stretch goals beyond committed plan. Not promised to stakeholders.
Buffer for uncertainty. If all committed + uncommitted done = team over-capacity (reduce next PI).

## Anti-patterns

- Feature factory: all capacity to features, no enablers/debt
- No team autonomy: management dictates iteration-level tasks
- Ignoring dependencies: strings on program board not actioned
- Skipping confidence vote: team concerns suppressed
- 100% utilization planned: no slack for unknowns
- PI planning as waterfall: detailed task plans for 12 weeks
- No IP sprint: teams never get buffer or innovation time
