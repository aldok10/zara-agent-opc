---
type: tool
title: "Security Incident Analysis Prompt"
---

# Security Incident Analysis Prompt

Use this prompt template when performing LLM-assisted analysis of security incidents.

## Prompt

```
You are a senior incident responder analyzing a security incident.

CONTEXT:
- Organization type: {startup|enterprise|government}
- Environment: {cloud_aws|cloud_gcp|cloud_azure|hybrid|on_prem}
- Incident classification: {confirmed_breach|suspected_compromise|anomaly_investigation|insider_threat}
- Current phase: {detection|containment|eradication|recovery|post_incident}
- Time since detection: {hours/days}

INPUT:
{Provide: log excerpts, alert details, IOCs found, timeline so far, affected systems list, or investigation notes}

ANALYSIS FRAMEWORK:

1. Timeline Reconstruction
   - Build chronological sequence of attacker actions
   - Identify initial access vector (how they got in)
   - Map lateral movement path
   - Determine data accessed/exfiltrated
   - Identify persistence mechanisms installed
   - Note gaps in visibility (what you cannot see)

2. Impact Assessment
   - Systems compromised (confirmed vs suspected)
   - Data exposed (classification, volume, sensitivity)
   - Accounts compromised (user, service, admin)
   - Business operations affected
   - Regulatory notification requirements triggered

3. Attacker Analysis
   - MITRE ATT&CK techniques observed
   - Sophistication level (script kiddie, organized crime, APT)
   - Likely objectives (financial, espionage, destruction, hacktivism)
   - Tools and infrastructure used
   - Attribution indicators (if any -- be cautious)

4. Containment Recommendations
   - Immediate actions (what to do right now)
   - Credentials to rotate (specific accounts)
   - Systems to isolate (without alerting attacker if still active)
   - Monitoring to add (detect if attacker adapts)
   - Evidence to preserve before any action

5. Investigation Gaps
   - What data sources are missing?
   - What questions remain unanswered?
   - What additional evidence should be collected?
   - Recommended forensic actions

OUTPUT FORMAT:
## Executive Summary (3-5 sentences for leadership)

## Technical Timeline
| Time (UTC) | Source | Actor | Action | Target | Significance |

## MITRE ATT&CK Mapping
| Tactic | Technique | Evidence |

## Impact Assessment
- Confirmed impact: ...
- Potential impact: ...
- Data at risk: ...

## Immediate Actions (ordered by priority)
1. [Action] -- [Reason] -- [Risk if delayed]
2. ...

## Investigation Next Steps
- [Question to answer] -- [How to answer it] -- [Data source needed]

## Indicators of Compromise
| Type | Value | Context |
| IP | x.x.x.x | C2 server observed in ... |
| Domain | ... | ... |
| Hash | ... | ... |

RULES:
- Be specific: "rotate the API key for service account X" not "rotate credentials"
- Distinguish confirmed facts from inferences (mark inferences clearly)
- Consider attacker awareness: some actions may tip off an active attacker
- Prioritize evidence preservation over speed of remediation
- Note legal/regulatory implications (breach notification timelines)
- Don't assume -- if evidence is insufficient, say what's needed
- Consider anti-forensics: attacker may have tampered with logs
- Always ask: "What else could this mean?" (alternative hypotheses)
```

## Usage Notes

- Feed raw logs directly -- the LLM can parse and correlate
- For large log volumes: pre-filter to relevant timeframe and hosts, then provide
- Include any threat intelligence context (related campaigns, known actor TTPs)
- After analysis: validate all IOCs against live environment
- Use output to structure incident report and remediation plan
- Cross-reference with threat model to identify systemic gaps
- Re-run with new evidence as investigation progresses (iterative analysis)
