# Agile Frameworks Reference

## Scrum Guide 2020 Key Points

| Element | Definition |
|---------|-----------|
| Sprint | Fixed timebox (1-4 weeks), consistent length |
| Sprint Goal | Single objective, negotiable scope within goal |
| Product Goal | Long-term objective for the product |
| Increment | Usable, meets DoD, potentially releasable |
| Accountabilities | PO (value), SM (effectiveness), Devs (quality) |
| Self-managing | Team decides who/how/what within sprint |

**Changes from 2017**: Removed "roles" (now accountabilities). Added Product Goal. Simplified language. Lean thinking explicit.

**Scrum Guide 2020 removed**: three Daily Scrum questions, servant-leader term, IT-specific language, Development Team as separate entity. **Added**: "accountabilities" instead of "roles", Sprint Planning three topics (Why/What/How).

## Kanban

### Kanban Guide 2025 (Vacanti et al.)  -  3 Practices

1. Defining and Visualizing the Workflow
2. Actively Managing Items in a Workflow
3. Improving the Workflow

### Anderson's Kanban Method  -  6 Practices

Visualize, Limit WIP, Manage Flow, Make Policies Explicit, Implement Feedback Loops, Improve Collaboratively.

The Guide's 3 practices subsume Anderson's 6.

### Kanban Principles (Anderson)

| Principle | Rule |
|-----------|------|
| Start with what you do now | No big-bang transformation |
| Agree to pursue incremental change | Evolutionary, not revolutionary |
| Respect current roles/titles | Don't reorganize |
| Encourage leadership at every level | Not top-down |

## SAFe Overview (Essential)

| Level | Contains |
|-------|----------|
| Portfolio | Value Streams, Lean Budgets, Strategic Themes |
| Large Solution | Solution Train, Suppliers, Capabilities |
| Program (ART) | Teams, PI Planning, System Demos, I&A |
| Team | Scrum/Kanban/XP, Iteration Planning |

**Cadence**: PI = 8-12 weeks. Iterations = 2 weeks. IP Sprint = last iteration.

## Scrumban Rules

- Keep: retrospectives, reviews, visualization, WIP limits
- Drop: sprint commitment (replace with SLE), estimation (replace with cycle time)
- Add: on-demand planning trigger, classes of service, explicit policies
- Measure: cycle time, throughput, WIP age (not velocity)

## Framework Selection

| Criteria | Scrum | Kanban | Scrumban | SAFe |
|----------|-------|--------|----------|------|
| Team size | 5-9 | Any | 5-9 | 50+ |
| Work type | Project | Flow/ops | Mixed | Portfolio |
| Predictability | Sprint-based | SLE-based | SLE-based | PI-based |
| Cadence | Fixed | None | Optional | Fixed |
| Planning | Sprint start | On-demand | Threshold | PI event |
| Change tolerance | Low (mid-sprint) | High | High | Medium |

## 2025 Context: AI + Remote Era

**AI-Powered Sprint Planning**:
- LLMs assist backlog refinement, acceptance criteria drafting, story splitting
- AI coding agents accelerate implementation → shorter cycle times → smaller sprints viable
- Risk: "done faster" ≠ "done right"  -  AI code carries higher defect density, needs review gates

**Scrum + AI Coding Agents**:
- Sprints shift from "build" to "specify + verify"  -  more time in refinement/review, less in coding
- Definition of Done must include AI-code review pass + integration testing
- Velocity inflates artificially  -  switch to throughput + escaped defects as primary metrics
- Sprint capacity model: human reviews become bottleneck, not implementation

**Remote/Hybrid Ceremony Adaptations**:
- Async standup (written, <15min window) + sync weekly planning
- Digital boards as single source of truth (not meeting notes)
- Retro formats: 4Ls async → sync discussion on top themes
- PI Planning: hybrid with pre-work async, decisions sync

**DORA 2024 Findings**:
- Unstable priorities = #1 predictor of team burnout (above workload)
- Teams with stable priorities: 50% less burnout, 2x throughput
- Implication: protect sprint goals aggressively, push back on mid-sprint scope injection
- High-performing teams combine trunk-based dev + small batch + fast feedback

## Alternative Frameworks

| Framework | When to Use | Key Concepts |
|-----------|-------------|--------------|
| Shape Up (Basecamp) | Product teams wanting fixed-time budgets, no backlog | 6-week cycles, appetite, shaping, betting table, hill charts, cooldown |
| Dual-Track Agile | Teams running discovery + delivery in parallel | Discovery 1-2 sprints ahead, validated items feed delivery backlog |
| GIST (Itamar Gilad) | Lightweight alternative to heavy roadmap process | Goals, Ideas, Steps, Tasks; ideas validated through experiments |
| Working Backwards (Amazon) | New product/feature definition | Start with press release + FAQ, work backwards to requirements |
