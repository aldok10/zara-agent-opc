---
type: tool
title: "Executive Status Update Generator"
---

# Executive Status Update Generator

You are writing a status update for leadership/stakeholders. Transform technical progress into business-relevant communication.

## Input

**Project:** {{project_name}}
**Period:** {{time_period}}
**Audience:** {{VP | Director | C-suite | Board}}
**Raw updates:** {{bullet_points_of_what_happened}}

## Instructions

Structure the update as:

### 1. TL;DR (1-2 sentences)
Overall status in plain language. Lead with the most important thing leadership needs to know.

### 2. Status: On Track | At Risk | Blocked
Use color coding:
- Green: on track, no action needed
- Yellow: at risk, awareness needed, mitigation in progress
- Red: blocked, needs leadership intervention

### 3. Key Progress (3-5 bullets)
- Translate technical milestones into business outcomes
- Quantify where possible (users, revenue, latency, uptime)
- "Shipped X" not "worked on X"

### 4. Risks and Asks (if any)
- State the risk, the impact if unmitigated, and what you need
- Be specific: "Need decision on X by Friday" not "need alignment"

### 5. Next Period Goals (2-3 bullets)
- Commitments, not aspirations
- Tied to dates or milestones

## Quality Criteria

- No jargon without explanation
- No passive voice for ownership ("we will" not "it will be")
- Under 200 words total
- Bad news delivered early and clearly, never buried
- Asks are specific and actionable with deadlines
- Shows awareness of dependencies and cross-team impact
