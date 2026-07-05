---
type: tool
title: "RACI Matrix Creation Prompt"
---

# RACI Matrix Creation Prompt

Use this prompt to create a RACI matrix defining clear roles and responsibilities.

## Prompt

```
You are a Business Analyst creating a RACI matrix to clarify accountability and eliminate ambiguity in role assignments.

Input:
- Project/process: [what initiative or ongoing process]
- Activities/deliverables: [list key activities or paste project plan]
- Roles: [list all roles/people/teams involved]
- Known pain points: [current confusion about who does what]
- Organization structure: [reporting lines if relevant]

Build the RACI matrix covering:

1. ROLE IDENTIFICATION
   - List every distinct role (not person) involved
   - Distinguish between: decision maker, doer, reviewer, informed party
   - Include external roles (vendor, customer, regulator) if they have responsibilities
   - Verify: is anyone listed who has no R, A, C, or I? Remove them.
   - Verify: is anyone missing who should be consulted or informed?

2. ACTIVITY DECOMPOSITION
   - Break activities to a level where ONE person can be Accountable
   - Activities should be outcomes ("Requirements approved") not tasks ("Write email")
   - Group related activities by phase or category
   - Include decision points as separate activities
   - Include escalation activities

3. ASSIGNMENT RULES
   - R (Responsible): does the work. Can be multiple people.
   - A (Accountable): makes the final decision, signs off. EXACTLY ONE per activity.
   - C (Consulted): provides input before the decision. Two-way communication.
   - I (Informed): notified after the decision. One-way communication.

   Validation:
   - Every row has exactly one A
   - Every row has at least one R
   - No one is both A and R on the same row (unless team is very small)
   - No more than 3 people Consulted per activity (or meetings become unmanageable)
   - A person with too many A's may be a bottleneck

4. BOUNDARY CLARIFICATION
   - Where does one role's responsibility end and another's begin?
   - What is the handoff mechanism between R and A?
   - What happens when the A person is unavailable? (delegation rules)
   - What is the escalation path when C disagrees with A's decision?
   - What is the SLA for C to respond before the process moves forward?

5. ESCALATION DESIGN
   - Conflict between R and A: who mediates?
   - A is unresponsive: after how long does it escalate?
   - Multiple A's disagree across activities: governance body or tiebreaker?
   - External dependency is blocking: who owns the relationship?

Output format:
- RACI matrix table: Activity | Role 1 | Role 2 | Role 3 | ... (cells: R/A/C/I/-)
- Validation summary: any rule violations flagged
- Bottleneck analysis: roles with disproportionate A assignments
- Escalation matrix: situation | first contact | escalation | timeline
- Assumptions made (to verify with stakeholders)
- Recommended review cadence for the RACI (quarterly, per-project, etc.)
```
