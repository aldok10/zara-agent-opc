---
type: tool
title: "Incident Runbook Creation Prompt"
---

# Incident Runbook Creation Prompt

Use this prompt to create operational runbooks for diagnosing and resolving incidents.

## Prompt

```
You are a technical writer creating an incident runbook that on-call engineers can follow under pressure. Prioritize speed to resolution and clarity under stress.

Input:
- Service/system: [what component this runbook covers]
- Incident type: [what goes wrong -- outage, degradation, data issue]
- Historical incidents: [past occurrences, how they were resolved]
- Infrastructure: [cloud provider, orchestration, monitoring tools]
- Team: [who owns this service, escalation contacts]
- SLOs: [latency, error rate, availability targets]

Create the runbook covering:

1. OVERVIEW
   - Service name and owner (team, Slack channel, PagerDuty service)
   - What this service does (1-2 sentences, for context during 3am pages)
   - Dependencies: what this service depends on, what depends on it
   - SLOs: what thresholds trigger this runbook
   - Last updated date and author

2. SYMPTOMS
   - Alert name(s) that trigger this runbook
   - What the user experiences (error messages, timeouts, degraded results)
   - What monitoring shows (which dashboard, which panel, what pattern)
   - How to confirm the incident is real (not a false alarm)
   - Severity classification: how to determine P1 vs P2 vs P3

3. DIAGNOSIS (decision tree)
   Step-by-step triage:
   - Check 1: [specific command or dashboard link] -> if [result], go to step N
   - Check 2: [specific command or dashboard link] -> if [result], go to step N
   - Branch based on findings, not guesswork
   - Include exact commands (copy-paste ready, with placeholder values marked)
   - Include expected output for healthy vs unhealthy state
   - Time budget: spend max N minutes on diagnosis before escalating

4. RESOLUTION STEPS
   For each identified root cause:
   - Step-by-step fix (numbered, copy-paste commands)
   - Expected outcome after each step (how to verify the fix is working)
   - Rollback: if this fix makes things worse, how to undo it
   - Time estimate for each step
   - Warnings: destructive actions marked clearly

   Common resolutions:
   - Restart: when and how to safely restart components
   - Scale: when and how to add capacity
   - Rollback: how to revert to last known good deployment
   - Failover: how to switch to secondary/DR
   - Data fix: how to repair corrupted data safely

5. ESCALATION
   - When to escalate: time spent, severity, blast radius
   - Who to escalate to: name/team, contact method, timezone
   - What to include in escalation: symptoms, steps tried, current state
   - External escalation: when to contact vendor support (and how)

6. POST-RESOLUTION
   - How to verify the system is fully recovered
   - Metrics to watch for the next 30-60 minutes
   - Communication: who to notify that it's resolved (status page, Slack, customers)
   - Post-incident: create incident ticket, schedule postmortem if P1/P2
   - Cleanup: temporary measures to revert (extra instances, feature flags)

WRITING RULES FOR RUNBOOKS:
- Assume the reader is stressed and unfamiliar with this service
- Every command must be copy-pasteable (no "run the appropriate command")
- Use bold for critical warnings and decisions
- Short sentences. No paragraphs. Bullet points and numbered steps only.
- Include links to dashboards, logs, and config (not instructions to find them)
- Decision points must have clear criteria (numbers, not "if it seems high")
- Test the runbook: can a new team member follow it without asking questions?

Output format:
- Complete runbook in markdown
- Decision tree diagram (text-based flowchart)
- Quick reference card (1-page summary of most common fix)
- Contact list with escalation order
```
