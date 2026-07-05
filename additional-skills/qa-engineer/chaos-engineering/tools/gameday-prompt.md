---
type: tool
title: "Gameday Planning Prompt"
---

# Gameday Planning Prompt

## Purpose
Create a structured gameday plan with scenarios, roles, communication protocols, and success criteria for controlled failure injection exercises.

## When to Use
- Planning a team chaos engineering exercise
- Preparing for production resilience validation
- Onboarding teams to failure injection practices
- Testing disaster recovery procedures

## Prompt Template

```
You are a chaos engineering lead planning a gameday exercise.

CONTEXT:
- System: {service_name_and_description}
- Environment: {staging|production_canary|production}
- Duration: {2h|4h|full_day}
- Team size: {number_of_participants}
- Previous gamedays: {none|list_of_past_themes}
- Blast radius tolerance: {single_pod|single_AZ|multi_service}

DESIGN THE GAMEDAY:

1. SCENARIO SELECTION (pick 3-5 graded by severity)
   - Start mild, escalate complexity
   - Each scenario: hypothesis, injection method, expected behavior, abort criteria
   - At least one scenario team has NOT rehearsed before

2. ROLES AND RESPONSIBILITIES
   - Gameday lead: coordinates, controls pace
   - Operator: executes injections
   - Observer: monitors dashboards, takes notes
   - Communicator: simulates on-call response
   - Safety officer: authorized to halt exercise

3. COMMUNICATION PLAN
   - Pre-gameday: stakeholder notification, opt-out window
   - During: dedicated channel, status updates every {15|30} min
   - Abort signal: clear word/command to stop all injections
   - Post-exercise: immediate debrief slot

4. SAFETY CONTROLS
   - Rollback procedure for each injection
   - Customer impact threshold that triggers abort
   - Time-bound: all injections have max duration
   - Feature flags or kill switches verified before start

5. SUCCESS CRITERIA
   - For each scenario: what "pass" looks like
   - Metrics to capture: detection time, recovery time, blast radius
   - Documentation requirements during exercise

RULES:
- Never inject in production without explicit approval and rollback plan
- All participants must know the abort procedure
- Record everything: timestamps, decisions, surprises
- Gameday is learning, not blame  -  capture findings, not faults
```

## Output Format

```markdown
## Gameday Plan: {Title}

### Overview
- Date/Time: | Duration: | Environment:
- Objective:

### Scenarios
| # | Name | Hypothesis | Injection | Expected | Abort If |
|---|------|-----------|-----------|----------|----------|

### Roles
| Role | Person | Responsibilities |

### Timeline
| Time | Activity |

### Safety Controls
- Abort command:
- Rollback procedures:
- Impact thresholds:

### Debrief Template
- What surprised us?
- What worked as expected?
- What needs fixing? (action items with owners)
```
