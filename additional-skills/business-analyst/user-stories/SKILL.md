---
name: user-stories
description: "User stories: As-a/I-want/So-that, story mapping, slicing, INVEST, story points"
---

# User Stories Skill

## Scope

Write effective user stories using As-a/I-want/So-that format. Apply INVEST criteria, story mapping, vertical slicing, and relative sizing. Produce stories that are negotiable, independently deliverable, and testable.

## First Action

Identify the user role and desired outcome, then write the story in As-a/I-want/So-that format with INVEST criteria validated.

## Constraints

1. Format: "As a [role], I want [capability], so that [business value]" -- all three parts required
2. INVEST criteria: Independent, Negotiable, Valuable, Estimable, Small, Testable
3. Stories represent user value, not technical tasks -- vertical slices through the system
4. Story mapping: arrange stories by user activity (horizontal) and priority (vertical)
5. Slice large stories (epics) into independently deliverable increments
6. Each story deliverable in one sprint -- if not, slice further
7. "So that" clause states business value, not restates the want
8. Personas over generic "user" -- name specific roles with distinct needs
9. Conversation is the requirement; card is a reminder; confirmation is acceptance criteria
10. Story points measure relative complexity/uncertainty, not time
11. Reference stories: team calibrates against known-effort baseline stories
12. Spike stories for research/uncertainty: time-boxed, produce knowledge not features
13. Enable stories (technical) justified by the user stories they enable
14. Story splitting patterns: workflow steps, business rules, data variations, interfaces, operations

## DO NOT

1. Write stories without the "so that" (business value) clause
2. Use "As a developer" for user-facing features -- find the actual user
3. Write technical tasks disguised as user stories
4. Create stories too large for one sprint without splitting
5. Skip INVEST validation before committing stories to a sprint
6. Use story points as time estimates or compare across teams
7. Write acceptance criteria inside the story body -- separate concerns
8. Create dependent story chains that must be delivered in sequence
9. Map stories without involving the team (story mapping is collaborative)

## Route to Subskill

| Signal | Subskill | Path |
|--------|----------|------|
| Epic breakdown, thin slices, incremental delivery | Story Slicing | subskills/story-slicing.md |
| Activity map, backbone, walking skeleton | Story Mapping | subskills/story-mapping.md |
| Relative sizing, planning poker, reference stories | Estimation | subskills/estimation.md |
| Role definition, needs, goals, context | Persona Writing | subskills/persona-writing.md |

## Verification

- Every story has As-a/I-want/So-that with all three parts meaningful
- INVEST criteria pass for each story in sprint backlog
- No story exceeds one sprint of effort (slice if needed)
- "So that" states business value, not technical outcome
- Specific personas used instead of generic "user" where possible
- Stories are vertical slices, not horizontal layers
- Acceptance criteria attached separately (not embedded in story body)

## Knowledge

- knowledge/invest-criteria.md - INVEST validation checklist
- knowledge/splitting-patterns.md - Story splitting techniques
- knowledge/story-mapping.md - Jeff Patton's story mapping
- tools/story-template.md - Story writing template

## AI-Era Context (2026)

- LLMs generate story candidates from product briefs, PRDs, and stakeholder interviews
- AI validates INVEST criteria and suggests splitting strategies for oversized stories
- Story mapping tools (Miro, StoriesOnBoard) integrate AI for gap detection and dependency analysis
- Natural language processing extracts personas and user needs from support tickets and feedback
- AI-assisted refinement sessions pre-generate questions and edge cases for discussion

## Related Skills

- acceptance-criteria (AC verify story completion)
- requirements (stories implement requirements)
- domain-modeling (domain language appears in stories)
