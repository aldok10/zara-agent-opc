---
type: tool
title: "Incident Timeline Reconstruction Prompt"
---

# Incident Timeline Reconstruction Prompt

## Purpose
Reconstruct a precise incident timeline by correlating logs, alerts, and actions to establish chain of events for post-incident analysis.

## When to Use
- During or after a security incident requiring forensic analysis
- Building timeline for incident report or legal proceedings
- Correlating events across multiple systems during investigation
- Training incident responders on evidence collection

## Prompt Template

```
You are a digital forensics analyst reconstructing an incident timeline.

CONTEXT:
- Incident type: {data_breach|ransomware|unauthorized_access|insider_threat|ddos}
- Time window: {start_datetime to end_datetime UTC}
- Systems involved: {list_affected_systems}
- Log sources available: {cloudtrail|syslog|application_logs|network_flow|auth_logs|waf}
- Evidence preservation: {confirmed_collected|in_progress|not_started}

LOG DATA:
{paste_relevant_log_entries_or_alert_data}

RECONSTRUCT THE TIMELINE:

1. EVENT COLLECTION
   - Extract all relevant events from each log source
   - Normalize timestamps to single timezone (UTC)
   - Tag each event: source, actor, action, target, result
   - Include both malicious and defensive actions

2. CORRELATION
   - Link events across systems (same actor, same session, same IP)
   - Identify causal relationships (event A triggered event B)
   - Map lateral movement (system A → system B → system C)
   - Note time gaps (periods with no visibility)

3. TIMELINE PHASES
   - Initial access: first confirmed malicious activity
   - Persistence: mechanisms established for continued access
   - Privilege escalation: elevation attempts and successes
   - Lateral movement: spread to other systems
   - Data access/exfiltration: what was touched/taken
   - Detection: when defenders became aware
   - Containment: first defensive action
   - Eradication: threat removed

4. CONFIDENCE ASSESSMENT
   - For each event: confirmed (log evidence) vs inferred (gap-filling)
   - For timeline links: strong (same session ID) vs weak (temporal proximity)
   - Known gaps: time periods or systems with no log coverage

5. INDICATORS OF COMPROMISE (IOCs)
   - IPs, domains, hashes observed
   - User agents, tools identified
   - TTPs mapped to MITRE ATT&CK

RULES:
- UTC timestamps only, include timezone source for conversion
- Clearly separate confirmed facts from inferences
- Note what you cannot determine from available evidence
- Preserve chain of custody notes (where evidence came from)
- Flag destructive analysis that would affect evidence integrity
```

## Output Format

```markdown
## Incident Timeline

### Summary
- First known malicious activity: {timestamp}
- Detection: {timestamp}
- Dwell time: {duration}
- Systems confirmed affected: {count}

### Timeline
| Timestamp (UTC) | Source | Actor | Action | Target | Confidence |
|-----------------|--------|-------|--------|--------|------------|

### Attack Chain (MITRE ATT&CK)
| Phase | Technique | Evidence |

### IOCs Extracted
| Type | Value | Context |

### Evidence Gaps
- [Time period or system with no coverage]

### Open Questions
- [What cannot be determined from available evidence]
```
