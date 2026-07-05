# Discovery Frameworks Quick Reference

| Framework | Core Loop | When to Use | Key Artifacts |
|-----------|-----------|-------------|---------------|
| OST | Outcome > Opportunities > Solutions > Experiments | Connecting work to outcomes, avoiding solution-first | Opportunity tree, experiment backlog |
| Lean Startup | Build > Measure > Learn | Early-stage validation, MVP scoping | MVP, pivot/persevere decisions |
| JTBD | Struggling moment > Hiring criteria > Forces | Understanding motivation, switching behavior | Job stories, forces diagram |
| Design Sprint | Map > Sketch > Decide > Prototype > Test | Time-boxed problem solving (5 days) | Prototype, test results |
| Double Diamond | Discover > Define > Develop > Deliver | Ensuring problem-solution fit | Problem statement, solution concepts |

## Selection Guide

| Situation | Use |
|-----------|-----|
| "What should we build next?" | OST |
| "Will this idea work?" | Lean Startup (experiment) |
| "Why do users switch/buy/quit?" | JTBD |
| "Solve this problem in one week" | Design Sprint |
| "Are we solving the right problem?" | Double Diamond (first diamond) |
| "Active discovery cadence" | OST + JTBD interviews weekly |

## Combining Frameworks

- **OST + JTBD**: Interviews surface opportunities, OST structures them
- **OST + Lean Startup**: OST identifies what to test, Lean provides experiment loop
- **Double Diamond + Design Sprint**: DD frames problem, Sprint solves in week
- **JTBD + Lean Startup**: Job stories become hypotheses, experiments validate

## Key Artifacts per Framework

**OST**: Living tree doc, updated weekly. Owner: PM.
**Lean Startup**: Experiment tracker (hypothesis, result, decision). Owner: PM.
**JTBD**: Job map, forces diagram, switch interviews. Owner: PM + Design.
**Design Sprint**: Prototype + 5-user test results. Owner: Design + PM.
**Double Diamond**: Problem brief (diamond 1), solution concepts (diamond 2). Owner: Team.

## 2024-2025 Updates

### AI-Operationalized Discovery

- AI-powered customer conversations (synthetic interviews, chatbot probes) supplement manual research
- Use for: pattern extraction from support tickets, churned-user signals, large-scale qualitative coding
- NOT a replacement for real interviews - augments volume, reduces time-to-first-insight
- Evidence hierarchy: AI conversation insights < real interviews < behavioral data < controlled experiments

### Teresa Torres 2024: "Something > Nothing"

- Start imperfect. Weekly touchpoints > quarterly research sprints
- Bad discovery habits beat no discovery habits - iterate on process
- Minimum viable cadence: 1 customer conversation/week per product trio

### Product Trio as Non-Negotiable

- PM + Design + Eng in discovery together - not sequential handoffs
- Eng in interviews catches feasibility signals early, reduces rework
- Shared context > shared artifacts. Trio alignment eliminates "build the wrong thing" risk
- Anti-pattern: PM does discovery alone, hands off insight deck to team

### Marty Cagan's Four Big Risks (SVPG)

| Risk | Question | Accountable |
|------|----------|-------------|
| Value risk | Will customers buy/use it? | PM |
| Usability risk | Can users figure out how to use it? | Designer |
| Feasibility risk | Can engineers build it with available time/skills/tech? | Lead Engineer |
| Business viability risk | Does it work for the business? | PM |

**Accountability mapping**:
- PM → value + viability risk → accountable for outcomes
- Designer → usability risk → accountable for experience
- Lead Engineer → feasibility risk → accountable for delivery

**Cagan's 3 Principles of Discovery**:
1. Tackle big risks early (especially value and viability)
2. Figure out solutions collaboratively (eng + design + product, side-by-side)
3. Focus on solving problems (not features or roadmaps)
