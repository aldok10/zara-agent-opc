---
type: tool
title: "Chaos Experiment Design Template"
---

# Chaos Experiment Design Template

## Purpose
Guide the design of a chaos experiment from hypothesis to execution plan with proper safety controls.

## Inputs Required
- System/service under test
- Architecture diagram or service dependencies
- Current SLOs and error budgets
- Monitoring/alerting stack in use
- Team readiness level (first experiment vs experienced)

## Design Steps

### 1. Select Target
Based on system understanding:
- Which service has the most dependencies?
- What's the most critical path?
- What failure mode is least tested?
- What recently broke in production (recreate)?

### 2. Write Hypothesis
Template: "We believe [system] can tolerate [fault] for [duration]. During the fault, [metric A] will remain within [threshold], and after recovery, [metric B] will return to normal within [time]."

### 3. Define Steady State
Document measurable baseline:
- What metrics define "healthy"?
- Capture at least 15 min of baseline before injection
- Use the SAME queries for before/during/after comparison

### 4. Design the Fault
```markdown
| Attribute | Value |
|-----------|-------|
| Fault type | [network/resource/application/dependency] |
| Specific fault | [latency/partition/crash/exhaustion] |
| Target | [service/host/container/connection] |
| Blast radius | [single instance/service/AZ] |
| Duration | [seconds/minutes] |
| Injection method | [tool name + config] |
```

### 5. Set Abort Conditions
```markdown
| Condition | Threshold | Action |
|-----------|-----------|--------|
| Error rate | > X% | Stop experiment |
| Data loss indicator | > 0 | Stop + alert |
| Duration exceeded | > Y min | Auto-stop |
| Unrelated service impact | Any | Stop + investigate |
```

### 6. Plan Execution
```markdown
## Pre-Experiment Checklist
- [ ] Baseline metrics captured for 15+ minutes
- [ ] Team members aware and available
- [ ] Abort mechanism tested and ready
- [ ] Communication channel open (Slack/Teams)
- [ ] On-call aware of planned experiment
- [ ] Dashboard with all relevant metrics open

## Execution Steps
1. Announce experiment start
2. Final baseline metric snapshot
3. Inject fault
4. Observe metrics for [duration]
5. Remove fault (or let it auto-expire)
6. Monitor recovery
7. Announce experiment end

## Post-Experiment
- [ ] Capture all metrics/screenshots
- [ ] Write experiment report
- [ ] File action items for gaps found
- [ ] Share findings with broader team
- [ ] Schedule follow-up experiment if needed
```

### 7. Output

```markdown
## Chaos Experiment: [Name]

### Hypothesis
[statement]

### Steady State Definition
[metrics + thresholds]

### Fault Injection Plan
[details]

### Safety Controls
[abort conditions + rollback]

### Expected Outcome
- If hypothesis confirmed: [what it means]
- If hypothesis refuted: [likely fixes needed]

### Schedule
- Date: [proposed]
- Time: [low traffic window for first run]
- Participants: [who needs to be present]
```
