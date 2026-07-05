---
type: subskill
title: "Scrum Ceremonies"
---

# Scrum Ceremonies

## Sprint Planning

**Timebox**: maximum of eight hours for a one-month Sprint. For shorter Sprints, usually shorter (4h max for 2-week sprint).

**Three Topics** (Scrum Guide 2020):
1. **Topic One: WHY** is this Sprint valuable? → The whole Scrum Team collaborates to define a Sprint Goal
2. **Topic Two: WHAT** can be Done this Sprint? → Developers select Product Backlog Items for the Sprint
3. **Topic Three: HOW** will the chosen work get done? → Developers plan the work needed to create an Increment

**Anti-patterns**: PO dictates tasks | no sprint goal | 100% capacity | unrefined stories pulled in | no DoD check.

## Daily Scrum

**Timebox**: 15 minutes. No exceptions.

**Structure**: Developers choose their own structure (three-question format removed in Scrum Guide 2020). Walk the board right-to-left is a common practice, not prescribed.
- Focus on progress toward Sprint Goal
- Surface impediments (resolve immediately or assign owner)
- What needs collaboration today?

**Anti-patterns**: Status reports to SM | exceeds 15min | problem-solving in Daily Scrum | absent team members ignored | mandating a fixed format.

## Sprint Review

**Timebox**: 1h per sprint week.

**Structure**:
1. Demo working software (not slides)
2. Stakeholders ask questions, give feedback
3. PO updates backlog based on feedback
4. Review sprint goal achievement (met/partially/missed)

Note: Sprint Review is "a working session, not just a presentation" (Scrum Guide 2020).

**Anti-patterns**: No stakeholders present | demo of incomplete work | no backlog adaptation | PM presents instead of team.

## Retrospective

**Timebox**: max 1.5 hours for a 2-week sprint (proportional to 3h for a 4-week sprint, per Scrum Guide).

**Structure**:
1. Set stage (safety check)
2. Gather data (metrics + feelings)
3. Generate insights (root causes)
4. Decide actions (max 3, assigned, time-bound)
5. Close (review previous retro actions first)

**Anti-patterns**: Skip under pressure | no action items | actions not tracked | blame individuals | same format every time | SM dominates.

## Refinement

Note: Refinement is NOT a formal Scrum event. It has no prescribed timebox or ceremony. The Scrum Guide only says it's "an ongoing activity."

**Timebox**: 10% of sprint capacity (ongoing, not single event).

**Rules**:
- Refine 2 sprints ahead max (common practice, not prescribed by Scrum Guide)
- Each story needs acceptance criteria before sprint planning
- Decompose anything estimated >5 days of work
- Technical spikes timeboxed to 1-2 days
- Team asks "how will we test this?" for every story

**Anti-patterns**: Refining 5+ sprints ahead | PO writes stories alone | no acceptance criteria | giant stories enter sprint | design-by-committee in refinement.

## DoD Enforcement

Definition of Done applies to EVERY increment. Non-negotiable items:
- Code reviewed and merged
- Tests passing (unit + integration)
- No known defects introduced
- Documentation updated (if user-facing)
- Deployable to production (even if not deployed)

Incomplete DoD = work not done = doesn't count toward velocity.
