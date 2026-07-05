---
name: incident-forensics
description: "Security incident response and digital forensics: DFIR, log analysis, chain of custody, threat hunting"
---

# Incident Response & Forensics

Detect, contain, investigate, and recover from security incidents with evidence-preserving methodology.

## Scope

Incident detection and triage, containment and eradication, digital forensics and evidence collection, log analysis and correlation, threat hunting, chain of custody, root cause analysis, post-incident review, IOC extraction, MITRE ATT&CK mapping.

## First Action

Assess severity and blast radius -- contain active threats before investigating. Preserve volatile evidence (memory, connections, processes) before it disappears.

## Constraints

1. Containment before investigation -- stop the bleeding first
2. Volatile evidence collected in order: memory > network state > processes > disk
3. Chain of custody maintained -- hashes, timestamps, collector identity
4. Evidence collected from copies -- never modify originals
5. Findings mapped to MITRE ATT&CK techniques
6. Timeline reconstruction from multiple log sources with clock skew correction
7. IOCs extracted and shared within 4 hours of confirmed incident
8. Communication on out-of-band channels during active incident
9. Scope determination: assume lateral movement until proven otherwise
10. Root cause identified -- not just proximate cause
11. Post-incident review within 5 business days, blameless
12. Remediation verified before declaring incident resolved
13. Lessons learned feed back into detection rules

## DO NOT

- Reboot compromised systems before memory capture
- Alert the attacker by running scans on compromised hosts
- Use compromised credentials or systems for investigation
- Delete logs during investigation
- Skip containment to preserve "business continuity"
- Communicate incident details on potentially compromised channels
- Declare resolved without verifying eradication
- Modify evidence without documenting the change
- Assume single entry point without verification
- Blame individuals in postmortems -- focus on systemic improvements
- Skip review for minor incidents -- all incidents have lessons

## Route to Subskill

| Signal | Target |
|--------|--------|
| Vulnerability that caused breach | appsec |
| Cloud resource compromise | cloud-security |
| Compromised credentials | identity-access |
| Post-incident hardening | secure-code |
| Threat model update needed | threat-modeling |
| Regulatory notification | compliance |

## Verification

- [ ] Incident severity classified and stakeholders notified per SLA
- [ ] Containment actions documented with timestamps
- [ ] Evidence collected with chain of custody intact
- [ ] Timeline reconstructed from correlated log sources
- [ ] MITRE ATT&CK techniques identified
- [ ] IOCs extracted and detection rules created
- [ ] Root cause identified and remediated
- [ ] Post-incident review completed with action items
- [ ] Tabletop exercises conducted quarterly
- [ ] Log retention meets 90-day minimum across all sources

## Knowledge

- NIST SP 800-61r3 (Incident Response)
- MITRE ATT&CK Enterprise Matrix
- SANS DFIR methodology and Incident Handler's Handbook
- FIRST CSIRT Services Framework
- Volatility / AVML for memory forensics
- Sigma rules for detection
- ELK/Splunk query patterns
- Splunk, Elastic SIEM, Velociraptor, TheHive, YARA, osquery
- Tabletop Exercises for team readiness (quarterly cadence)
- IOC Sharing via STIX/TAXII for community defense
- Malware Analysis: static/dynamic analysis, sandboxing, IOC extraction
- Incident Communication: stakeholder updates, regulatory notification

## AI-Era Context (2026)

- AI-powered attacks: prompt injection for exfiltration, model poisoning, automated phishing at scale
- AI assists DFIR: automated timeline correlation, anomaly detection, IOC enrichment
- Cloud-native forensics: container ephemeral -- capture before pod restart
- eBPF-based runtime detection provides kernel-level visibility without agents
- LLM-generated malware evades signature-based detection -- behavioral analysis required

## Related Skills

- cloud-security
- identity-access
- threat-modeling
- appsec
