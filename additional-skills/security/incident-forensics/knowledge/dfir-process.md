# DFIR Process

Digital forensics and incident response methodology: evidence collection, chain of custody, and investigation workflow.

## DFIR Lifecycle

```
┌──────────┐   ┌───────────┐   ┌──────────────┐   ┌────────────┐   ┌──────────┐
│Preparation│──►│Identification│──►│ Containment  │──►│ Eradication│──►│ Recovery │
└──────────┘   └───────────┘   └──────────────┘   └────────────┘   └──────────┘
                                                                          │
                                                                    ┌─────▼──────┐
                                                                    │  Lessons   │
                                                                    │  Learned   │
                                                                    └────────────┘
```

## Phase 1: Preparation

### Before an Incident
- Incident response plan documented and tested (tabletop exercises quarterly)
- DFIR toolkit prepared (forensic workstation, acquisition tools, write blockers)
- Logging infrastructure verified (centralized, tamper-evident, adequate retention)
- Evidence storage: encrypted, access-controlled, chain-of-custody-ready
- Communication channels: out-of-band (not dependent on potentially compromised systems)
- Legal/compliance contacts identified (when to involve counsel, law enforcement)
- Retainer with forensics firm for overflow capacity

### DFIR Toolkit (2026)
- Acquisition: FTK Imager, dc3dd, AWS EBS snapshots, GCP disk cloning
- Memory: LiME (Linux), WinPmem, Volatility 3
- Network: Zeek, Suricata, full packet capture (Arkime/Moloch)
- Cloud: CloudTrail Lake, GCP Audit Logs, Azure Activity Log export
- Container: runtime snapshots, image layer analysis, eBPF captures
- Triage: Velociraptor, GRR, osquery

## Phase 2: Identification

### Detection Sources
- SIEM correlation alerts (unusual patterns across multiple log sources)
- EDR behavioral detections (process injection, credential access)
- Network anomalies (beaconing, data exfiltration patterns)
- User reports (phishing emails, suspicious activity)
- Threat intelligence matches (known IOCs in environment)
- Cloud security posture alerts (unexpected API calls, role assumptions)

### Initial Triage
1. Validate alert -- is this a true positive?
2. Determine scope: single host, multiple hosts, cloud accounts?
3. Identify affected assets and data classification
4. Assess business impact and urgency
5. Classify severity (P1-P4) and activate appropriate response

### Severity Classification

| Level | Criteria | Response |
|-------|----------|----------|
| P1/Critical | Active data exfiltration, ransomware spreading, public breach | All-hands, exec notification, legal involved |
| P2/High | Confirmed compromise, lateral movement observed | DFIR team mobilized, containment priority |
| P3/Medium | Suspicious activity, unconfirmed compromise | Investigation in progress, monitoring enhanced |
| P4/Low | Policy violation, failed attack attempt | Documented, addressed in normal workflow |

## Phase 3: Evidence Collection

### Order of Volatility (collect most volatile first)
1. **CPU registers, cache** (lost immediately)
2. **Memory (RAM)** -- running processes, network connections, encryption keys
3. **Network state** -- active connections, routing tables, ARP cache
4. **Running processes** -- process tree, open files, loaded modules
5. **Disk** -- filesystem, deleted files, swap space
6. **Remote logs** -- centralized SIEM, cloud audit trails
7. **Physical evidence** -- hardware, media, physical access logs

### Cloud Evidence Collection

| Source | Method | Retention |
|--------|--------|-----------|
| CloudTrail | S3 export + Athena query | 90d default, extend to 365d |
| VPC Flow Logs | CloudWatch + S3 archive | Configure per compliance |
| EBS Volumes | Snapshot before termination | Keep until case closed |
| Container images | Registry tag preservation | Never auto-delete during incident |
| Lambda logs | CloudWatch export | 30d default, extend immediately |
| IAM actions | CloudTrail + Access Analyzer | 90d in CloudTrail Lake |

### Evidence Acquisition Rules
- Never modify original evidence -- work on copies
- Hash everything (SHA-256) before and after acquisition
- Document who collected what, when, where, how
- Use write blockers for physical media
- For cloud: snapshot, don't modify running instances
- For containers: capture running state, then image layers separately

## Phase 4: Chain of Custody

### Documentation Requirements
Every piece of evidence requires:
```
Evidence ID:        CASE-2026-001-E003
Description:        Memory dump from web-server-prod-01
Collected by:       [Name, Role]
Collection time:    2026-03-15T14:32:00Z
Collection method:  LiME via SSH (read-only mount)
Hash (SHA-256):     a3f2b8c9d4e5...
Storage location:   Evidence locker #3 / S3 evidence bucket
Access log:         [Append-only log of who accessed when]
```

### Transfer Protocol
1. Evidence sealed in tamper-evident container/encrypted archive
2. Transfer documented (from whom, to whom, when, why)
3. Recipient verifies hash integrity upon receipt
4. Gap in custody = evidence potentially inadmissible

## Phase 5: Analysis

### Memory Forensics
- Process list with full command lines and parent relationships
- Network connections (established, listening, recent)
- Loaded DLLs/shared libraries (detect injection)
- Registry hives in memory (malware persistence)
- Encryption keys and credentials in memory
- Timeline reconstruction from memory artifacts

### Disk Forensics
- Filesystem timeline (MAC times -- Modified, Accessed, Changed)
- Deleted file recovery (unallocated space analysis)
- Browser artifacts (history, downloads, cache)
- Log files (application, system, security)
- Persistence mechanisms (startup items, cron, scheduled tasks, systemd)
- Malware artifacts (dropper files, encrypted payloads)

### Cloud Forensics
- API call timeline (who did what when from where)
- IAM policy changes and role assumptions
- Resource creation/modification/deletion
- Network flow analysis (VPC flow logs)
- DNS query logs (Route53/Cloud DNS)
- Container runtime events (kubectl exec, pod creation)

## Phase 6: Containment & Eradication

### Containment Strategies

| Strategy | Use When | Risk |
|----------|----------|------|
| Network isolation | Active lateral movement | Business disruption |
| Credential rotation | Compromised credentials confirmed | Service interruption |
| Account suspension | Insider threat or account takeover | User impact |
| DNS sinkhole | C2 communication identified | May alert attacker |
| Image rollback | Container compromise confirmed | Data loss if not backed up |

### Eradication Checklist
- [ ] All persistence mechanisms removed
- [ ] Compromised credentials rotated (all of them, including service accounts)
- [ ] Vulnerable entry point patched or mitigated
- [ ] Lateral movement paths blocked
- [ ] Backdoors removed (verify with fresh scan)
- [ ] Affected systems rebuilt from known-good images (don't trust "cleaned" systems)

## Phase 7: Lessons Learned

### Post-Incident Review (within 5 business days)
- Timeline reconstruction (what happened, when)
- Root cause analysis (how did they get in)
- Detection gap analysis (why did it take X time to detect)
- Response effectiveness (what worked, what didn't)
- Control improvements (prevent recurrence)
- Process improvements (faster detection, better response)

### Deliverables
- Incident report (technical + executive summary)
- Updated runbooks based on findings
- New detection rules/signatures
- Architecture improvements (if systemic weakness found)
- Training updates (if human error contributed)

## 2026 Context

- Cloud-native forensics: eBPF-based runtime capture replaces traditional disk imaging for containers
- AI-assisted analysis: LLMs correlate log events and suggest investigation paths
- Encrypted evidence: memory forensics harder with confidential computing (SEV-SNP, TDX)
- Container ephemeral nature: evidence disappears on pod restart -- proactive capture essential
- Supply chain incidents: forensics now includes build pipeline analysis, not just runtime
- Cross-cloud investigations: incidents span multiple providers, requiring unified timeline
