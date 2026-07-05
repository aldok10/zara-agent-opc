---
name: requirements
description: "Requirements engineering: functional/non-functional, MoSCoW, traceability, stakeholder needs"
---

# Requirements Engineering Skill

## Scope

Elicit, analyze, specify, validate, and manage requirements. Cover functional and non-functional requirements, prioritization (MoSCoW), traceability from business need to delivery artifact, and stakeholder validation.

## First Action

Identify the business problem being solved, then classify requirement type (business, stakeholder, solution, transition) and elicitation technique needed.

## Constraints

1. Follow BABOK knowledge areas: planning, elicitation, analysis, traceability, design, evaluation
2. Multiple elicitation techniques per requirement set: interviews, workshops, observation, prototyping, document analysis
3. Classify requirements: business (why), stakeholder (who needs what), solution (functional + non-functional), transition (migration)
4. Traceability matrix mandatory: business need -> requirement -> test case -> delivery artifact
5. MoSCoW prioritization agreed with stakeholders: Must, Should, Could, Won't this iteration
6. NFRs explicit and measurable: performance (p99 < 200ms), availability (99.9%), security (OWASP top 10)
7. Every requirement has: unique ID, owner, priority, status, acceptance criteria
8. Requirements validated with stakeholders before development; sign-off documented
9. Change management: impact analysis required before modifying baselined requirements
10. Conflict resolution: when stakeholders disagree, document both positions and escalation path
11. Requirement states: draft -> reviewed -> approved -> implemented -> verified
12. Functional requirements describe system behavior; NFRs describe quality attributes
13. Assumptions and dependencies documented alongside requirements
14. Requirements reviews catch 60%+ of defects -- invest time here

## DO NOT

1. Write requirements without understanding the business problem they solve
2. Leave NFRs implicit or unmeasurable ("the system should be fast")
3. Skip traceability; orphaned requirements signal scope creep or missing coverage
4. Mix solution design into requirements (describe what, not how)
5. Assume silence means agreement -- explicitly confirm with each stakeholder group
6. Gold-plate: add requirements beyond what the business problem demands
7. Use ambiguous language: "user-friendly", "fast", "flexible", "etc."
8. Baseline requirements without stakeholder sign-off
9. Ignore transition requirements (data migration, training, cutover)

## Route to Subskill

| Signal | Subskill | Path |
|--------|----------|------|
| Interview guides, workshops, observation | Elicitation | subskills/elicitation.md |
| Conflict resolution, gap analysis, impact | Analysis | subskills/analysis.md |
| Quality attributes, performance, security | NFR Specification | subskills/nfr.md |
| Matrix maintenance, coverage, change impact | Traceability | subskills/traceability.md |

## Verification

- Every requirement has unique ID, priority, owner, and acceptance criteria
- Traceability matrix shows no orphaned requirements or untested items
- NFRs have measurable targets with verification method specified
- Stakeholder sign-off documented before sprint planning
- No ambiguous or unmeasurable language in approved requirements
- Change impact analysis present for all post-baseline modifications

## Knowledge

- knowledge/babok-reference.md - BABOK 6 knowledge areas
- knowledge/nfr-catalog.md - Non-functional requirement patterns
- knowledge/elicitation-techniques.md - Technique selection guide
- tools/traceability-template.md - Traceability matrix template

## AI-Era Context (2026)

- LLMs draft requirements from meeting transcripts and stakeholder conversations
- AI-assisted traceability links requirements to code, tests, and documentation automatically
- NLP tools detect ambiguity, incompleteness, and conflicts in requirement sets
- Requirements-as-code: version-controlled, diff-able, linked to implementation
- AI generates NFR test scenarios from quality attribute specifications

## Related Skills

- stakeholder-analysis (stakeholders own and validate requirements)
- acceptance-criteria (AC verify requirement satisfaction)
- user-stories (stories implement requirements)
