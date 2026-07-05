---
type: fact
title: "Development Methodologies"
---
# Development Methodologies

## Agile Principles (Not Ceremonies)

### Core Ideas
- Working software over documentation
- Responding to change over following a plan
- Individuals and interactions over processes and tools
- Customer collaboration over contract negotiation

### What Agile Actually Means
- Ship small, get feedback, iterate
- Embrace uncertainty -- don't pretend you know everything upfront
- Self-organizing teams make better decisions
- Reflect and adapt regularly (not just at retros)
- Sustainable pace -- burnout kills velocity long-term

## Scrum

### Structure
- Sprints: fixed timeboxes (1-4 weeks, usually 2)
- Sprint Goal: one sentence describing what the team commits to
- Product Backlog: ordered list of everything to build
- Sprint Backlog: items selected for this sprint

### Ceremonies
- Sprint Planning: select items, define sprint goal (2h max for 2-week sprint)
- Daily Standup: 15 min, focus on blockers not status theater
- Sprint Review: demo to stakeholders, gather feedback
- Retrospective: what to improve, pick 1-2 actions

### Roles
- Product Owner: decides WHAT to build, prioritizes backlog
- Scrum Master: removes blockers, protects the process
- Development Team: decides HOW to build, self-organizing

### When Scrum Works
- Cross-functional teams with shared ownership
- Product development with evolving requirements
- Teams of 5-9 people
- When stakeholders need regular visibility

## Kanban

### Core Principles
- Visualize the workflow (columns on a board)
- Limit Work in Progress (WIP) -- this is the key insight
- Manage flow, not people
- Make policies explicit
- Improve collaboratively using feedback loops

### WIP Limits
- Set a maximum for each column (e.g., "In Progress: 3")
- Forces finishing before starting new work
- Exposes bottlenecks (where work piles up)
- Counter-intuitive: limiting WIP increases throughput

### Flow Metrics
- Lead time: request to delivery (customer perspective)
- Cycle time: start of work to delivery (team perspective)
- Throughput: items completed per time unit
- Age: how long current items have been in progress

### When Kanban Works
- Support/operations teams with unpredictable work
- Continuous flow (no natural sprint boundaries)
- Teams that need flexibility in priorities
- When you want to improve an existing process gradually

## Shape Up (Basecamp)

### Structure
- 6-week cycles (not sprints -- longer for meaningful scope)
- 2-week cooldown between cycles (bugs, exploration, rest)
- Appetite: how much time is this problem WORTH? (not estimate)
- Shaping: senior people define the approach before building

### Key Concepts
- Shaped work: rough solution, defined boundaries, unsolved details
- Betting table: leadership bets on shaped pitches each cycle
- Hill chart: tracks progress from "figuring it out" to "making it happen"
- Circuit breaker: if not done in 6 weeks, it gets cut (no extensions)

### When Shape Up Works
- Small teams (1-3 people per project)
- Products with strong product leadership
- When you want autonomy with accountability
- Teams mature enough to handle ambiguity

## XP (Extreme Programming) Practices

### Core Practices
- Pair programming: two people, one machine, continuous review
- TDD: test first, then implementation, then refactor
- Continuous integration: merge to main multiple times daily
- Collective code ownership: anyone can change any code
- Simple design: YAGNI, no speculative architecture

### Supporting Practices
- Refactoring: continuously improve structure without changing behavior
- Small releases: ship frequently in small increments
- Sustainable pace: 40-hour weeks, no death marches
- On-site customer: product person embedded with the team

## Choosing a Methodology

### Team Maturity
- New teams: Scrum (provides structure and guardrails)
- Experienced teams: Kanban or Shape Up (less ceremony, more trust)
- Disciplined teams: XP practices layer onto anything

### Problem Type
- Exploratory/uncertain: Shape Up (appetite-based, allows pivots)
- Steady delivery: Scrum (predictable cadence)
- Operations/support: Kanban (unpredictable intake)
- High-quality systems: XP (TDD, pairing reduce defects)

### Org Culture
- Top-down orgs: Scrum (roles and ceremonies give structure)
- High-trust orgs: Shape Up or Kanban (less overhead)
- Engineering-first: XP (technical excellence focus)
- Hybrid: take what works from each, drop what doesn't
