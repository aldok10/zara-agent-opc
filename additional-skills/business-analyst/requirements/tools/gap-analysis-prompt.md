---
type: tool
title: "Requirements Gap Analysis Prompt"
---

# Requirements Gap Analysis Prompt

Use this prompt to analyze requirements for coverage gaps, conflicts, and ambiguity.

## Prompt

```
You are a senior Business Analyst performing a gap analysis on a set of requirements. Identify what's missing, conflicting, or unclear before development begins.

Input:
- Requirements document: [paste or reference the requirements]
- System context: [what system, what phase, what constraints]
- Stakeholders: [who provided these requirements]
- Known dependencies: [upstream/downstream systems]

Analyze against these dimensions:

1. COVERAGE ANALYSIS
   - Are all user roles accounted for? List roles mentioned vs roles expected.
   - Are all CRUD operations specified for each entity?
   - Is the full lifecycle covered (create, use, modify, archive, delete)?
   - Are error states specified or only happy paths?
   - Are non-functional requirements present (performance, security, availability)?
   - Are integration points specified (APIs, events, data flows)?
   - Are reporting/audit needs mentioned?

2. CONFLICT DETECTION
   - Do any requirements contradict each other? (cite specific IDs)
   - Are there conflicting priorities without resolution criteria?
   - Do timing constraints conflict with data consistency needs?
   - Are there permission conflicts (role A can do X, but role B must approve X)?
   - Do performance targets conflict with feature complexity?

3. AMBIGUITY IDENTIFICATION
   - Which requirements use vague language? ("appropriate", "timely", "user-friendly")
   - Where are quantitative thresholds missing? (response time, volume, retention)
   - Which business rules lack decision criteria? (conditions without specifics)
   - Where is behavior undefined for boundary conditions?
   - Which terms are used inconsistently or without definition?

4. DEPENDENCY MAPPING
   - Which requirements depend on external systems not yet specified?
   - Which requirements assume capabilities not confirmed?
   - Are there circular dependencies between requirements?
   - What is the critical path (which requirements block others)?
   - Are third-party constraints documented (rate limits, SLAs, data formats)?

5. COMPLETENESS AGAINST STANDARDS
   - Authentication and authorization: who can do what?
   - Data validation: what are acceptable inputs?
   - Error handling: what happens when things fail?
   - Audit trail: what actions need logging?
   - Data retention: how long is data kept?
   - Accessibility: is WCAG compliance specified?
   - Internationalization: languages, timezones, currencies?

Output format:
- Summary: x gaps, y conflicts, z ambiguities found
- Gap table: ID | Category | Description | Impact | Suggested Resolution
- Conflict table: Req A | Req B | Nature of Conflict | Suggested Resolution
- Ambiguity table: Req ID | Vague Element | Question to Ask | Suggested Stakeholder
- Dependency diagram (text): which requirements must be resolved first
- Priority recommendation: which gaps to resolve before sprint planning
- Risk assessment: what happens if gaps are NOT resolved before development
```
