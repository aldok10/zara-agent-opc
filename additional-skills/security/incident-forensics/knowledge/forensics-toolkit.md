---
type: fact
title: "Digital Forensics Toolkit"
---

# Digital Forensics Toolkit

## Memory Analysis

### Volatility 3
- Open source memory forensics framework (Python-based)
- Analyzes RAM dumps from Windows, Linux, macOS
- Key plugins:
  - `pslist` / `pstree`: running and hidden processes
  - `netscan`: network connections and listening ports
  - `malfind`: injected code and suspicious memory regions
  - `dlllist`: loaded libraries per process
  - `cmdline`: command line arguments for each process
  - `filescan`: file objects in memory (even deleted)
  - `hashdump`: extract password hashes (Windows)

### Memory Acquisition
- Live: LiME (Linux), WinPmem (Windows), MacPmem (macOS)
- Virtual: snapshot VMware/Hyper-V, export from hypervisor
- Cloud: EBS snapshot → mount → memory capture tools
- Priority: always capture memory BEFORE disk (volatile evidence lost on shutdown)

### Analysis Workflow
1. Identify rogue processes (unexpected names, unusual parents)
2. Check network connections for C2 communication
3. Examine injected code regions (RWX memory pages)
4. Extract strings and indicators from suspicious processes
5. Timeline process creation events
6. Cross-reference with disk artifacts

## Disk Imaging

### Tools
- `dd` / `dc3dd`: bit-for-bit disk copy with hashing
- FTK Imager: GUI-based, supports multiple formats (E01, raw)
- `ewfacquire`: Expert Witness Format with compression + metadata
- Cloud: snapshot EBS/disk → copy to forensic account

### Best Practices
- Write-blocker required for physical media
- Generate hash (SHA-256) before and after imaging
- Store original evidence separately from working copies
- Document: serial numbers, timestamps, personnel involved
- Create at least two copies: working + archive

### Filesystem Analysis
- Autopsy / Sleuth Kit: open source, file recovery, timeline
- Plaso (log2timeline): super-timeline from all artifacts
- RegRipper: Windows registry analysis
- KAPE: automated artifact collection (triage imaging)

## Log Timeline Analysis

### Super-Timeline Construction
- Combine: filesystem timestamps, event logs, browser history, registry
- Tools: Plaso/log2timeline outputs CSV or Elasticsearch-compatible
- Normalize timestamps to UTC across all sources
- Identify: first known compromise, lateral movement, data access

### Key Log Sources

#### Windows
- Security.evtx: logon events (4624, 4625), privilege use (4672)
- System.evtx: service installations, driver loads
- PowerShell/Operational: script block logging, command history
- Sysmon: process creation with hashes, network connections, file creates
- Prefetch: evidence of program execution (timestamps + run count)

#### Linux
- auth.log / secure: authentication events
- audit.log: system calls, file access (if auditd configured)
- journal: systemd service events
- wtmp/btmp: successful and failed logins
- .bash_history: command history per user

#### Cloud
- AWS CloudTrail: API calls with identity, source IP, timestamp
- Azure Activity Log: management plane operations
- GCP Audit Logs: admin activity and data access
- VPC Flow Logs: network traffic metadata

### Timeline Analysis Technique
1. Anchor point: known-bad indicator with timestamp
2. Expand backward: how did attacker get here?
3. Expand forward: what did they do after?
4. Identify gaps: missing logs indicate anti-forensics or log rotation
5. Correlate across sources: same timestamp, different perspectives

## Chain of Custody

### Requirements
- Document every transfer of evidence between persons
- Record: who, what, when, where, why for each handoff
- Tamper-evident storage (sealed bags for physical, hash verification for digital)
- Unbroken chain from acquisition to courtroom/report

### Digital Evidence Handling
- Hash everything at acquisition (SHA-256 minimum)
- Log all analysis actions performed on evidence
- Work on copies, never originals
- Timestamps in analysis notes (analyst + timezone)
- Tool versions recorded (reproducibility)

### Documentation Template
```
Evidence ID: [unique identifier]
Description: [what is it]
Acquired by: [name, role]
Date/Time: [UTC]
Method: [tool, version, parameters]
Hash (SHA-256): [value]
Storage location: [physical/logical]
Chain: [date] [from] → [to] [reason]
```

## Incident Forensics Workflow

### Phase 1: Triage (First 30 Minutes)
- Scope: what systems are affected?
- Preserve: memory capture on live systems
- Contain: isolate without destroying evidence
- Document: initial observations, timeline of discovery

### Phase 2: Collection (Hours 1-4)
- Full disk images of affected systems
- Log exports from SIEM, cloud, network devices
- Network captures if attack ongoing
- Credential rotation for confirmed compromised accounts

### Phase 3: Analysis (Days 1-5)
- Build super-timeline from all evidence sources
- Identify initial access vector
- Map lateral movement path
- Determine data accessed or exfiltrated
- Extract IOCs (IPs, domains, hashes, tools used)

### Phase 4: Reporting
- Executive summary: what happened, impact, timeline
- Technical details: evidence, IOCs, attack path
- Recommendations: remediation steps, prevention measures
- Lessons learned: detection gaps, response improvements

## Anti-Forensics Awareness
- Timestomping: modified timestamps (check $MFN vs $FILENAME in NTFS)
- Log clearing: gaps in event IDs, cleared event log entries (Event ID 1102)
- Fileless malware: lives in memory/registry, minimal disk artifacts
- Encrypted payloads: look for decryption stubs, staging directories
- Living off the land: legitimate tools (PowerShell, certutil) used maliciously
