---
type: tool
title: "Stakeholder Map Builder"
---

# Stakeholder Map Builder

## Prompt Template

```
Build a stakeholder map for: [INITIATIVE NAME]

For each stakeholder, define:
- Name + Role
- Power (H/L): Can they block or approve?
- Interest (H/L): Are they directly affected?
- Stance: Champion / Neutral / Blocker
- Priority concern: What do they care about most?
- Communication: Channel + cadence
- Action: What do you need from them?

Then create engagement plan:
- High Power + High Interest: [weekly 1:1, co-design]
- High Power + Low Interest: [monthly brief, escalation only]
- Low Power + High Interest: [weekly update, feedback loop]
- Low Power + Low Interest: [batch comms, monitor]

Identify:
- Who must approve before launch?
- Who can accelerate if championed?
- Who will block if not aligned early?
- What's the critical path through stakeholders?
```

## Output Format

| Stakeholder | Power | Interest | Stance | Engage |
|-------------|-------|----------|--------|--------|
| [name] | H/L | H/L | C/N/B | [action] |
