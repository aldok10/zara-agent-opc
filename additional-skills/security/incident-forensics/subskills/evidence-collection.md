---
type: subskill
title: "Digital Evidence Collection"
---

# Digital Evidence Collection

Chain of custody, disk imaging, volatile data capture, and forensic preservation best practices.

## When to Load

- Responding to a security incident requiring evidence preservation
- Setting up forensic readiness for cloud or on-premise environments
- Documenting chain of custody for legal or regulatory purposes
- Capturing volatile data before system shutdown or remediation

## Key Concepts

**Order of Volatility**
Capture in this order -- most volatile first:
1. CPU registers, cache (milliseconds)
2. Memory (RAM) -- processes, network connections, encryption keys
3. Network state -- active connections, routing tables, ARP cache
4. Running processes -- open files, handles, loaded modules
5. Disk -- filesystem, swap, deleted files
6. Remote logging -- centralized logs, SIEM data
7. Physical configuration -- hardware, network topology

**Chain of Custody Requirements**
- WHO collected the evidence
- WHAT was collected (description, serial numbers, hashes)
- WHEN it was collected (timestamps in UTC)
- WHERE it was stored and how it was transported
- WHY it was collected (incident reference)
- Every transfer between custodians is documented and signed

**Forensic Imaging**
- Bit-for-bit copy (dd, FTK Imager, AVML for memory)
- Write-blockers for physical media
- Hash verification: SHA-256 of source and image must match
- Image the entire disk, not just partitions
- Store original and working copy separately
- Cloud: EBS snapshot, then create volume from snapshot for analysis

**Volatile Data Capture (Linux)**
```bash
# Memory dump (cloud: use AVML or LiME)
# Network connections
ss -tunaep > /evidence/netstat_$(date +%s).txt
# Running processes with full command line
ps auxwww > /evidence/processes_$(date +%s).txt
# Open files
lsof > /evidence/open_files_$(date +%s).txt
# Loaded kernel modules
lsmod > /evidence/modules_$(date +%s).txt
# Network interfaces and routes
ip addr show > /evidence/network_$(date +%s).txt
ip route show >> /evidence/network_$(date +%s).txt
# DNS cache (if systemd-resolved)
resolvectl statistics > /evidence/dns_$(date +%s).txt
# User sessions
w > /evidence/sessions_$(date +%s).txt
last -a > /evidence/logins_$(date +%s).txt
```

## Patterns

**Cloud Forensics Workflow (AWS)**
1. Isolate: modify security group to deny all ingress/egress
2. Tag: mark instance as under investigation (prevent termination)
3. Snapshot: create EBS snapshots of all attached volumes
4. Memory: SSM Run Command to capture memory (or AVML via user data)
5. Logs: export CloudTrail, VPC Flow Logs, GuardDuty findings
6. Metadata: capture instance metadata, IAM role, security groups
7. Image: create AMI for full system preservation

**Evidence Storage**
- Dedicated forensics S3 bucket with Object Lock (WORM)
- Separate AWS account with restricted access
- Versioning enabled, no lifecycle deletion policies
- Access logged via CloudTrail with alerting on access

## Gotchas

- Powering off a system destroys memory evidence -- image first if possible
- Cloud instances may be terminated by auto-scaling before you respond
- EBS snapshots are eventual -- verify snapshot completion before proceeding
- Time synchronization issues between systems complicate timeline analysis
- Legal hold notification: preserve relevant communications and documents
- Anti-forensics: attackers may clear logs, timestomp files, or use encrypted channels

## Verification

- Hash verification: SHA-256 of image matches source
- Chain of custody log has no gaps (every transfer documented)
- Evidence storage integrity: verify Object Lock prevents modification
- Memory image loads in Volatility without corruption errors
- Timeline reconstruction covers the full incident window
