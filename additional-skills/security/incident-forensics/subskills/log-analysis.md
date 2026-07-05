---
type: subskill
title: "Log Analysis for Incident Response"
---

# Log Analysis for Incident Response

Timeline reconstruction, indicator of compromise identification, log correlation, and SIEM techniques.

## When to Load

- Investigating a security incident through log analysis
- Building timelines from multiple log sources
- Identifying indicators of compromise (IOCs) in log data
- Correlating events across systems and time zones

## Key Concepts

**Log Sources (Priority Order)**
- Authentication logs: who accessed what, when, from where
- Network logs: flow logs, DNS queries, proxy logs, firewall logs
- Application logs: errors, access patterns, API calls
- System logs: process creation, file access, scheduled tasks
- Cloud audit logs: CloudTrail, Azure Activity Log, GCP Audit Log
- Endpoint detection: EDR telemetry, process trees

**Timeline Reconstruction**
- Normalize all timestamps to UTC
- Merge events from multiple sources into single timeline
- Identify pivot points: initial access, lateral movement, data access
- Look for anti-forensics: log gaps, timestomping, cleared event logs
- Correlate by: IP, user, session ID, process ID, request ID

**Indicators of Compromise (IOCs)**
- Network: unusual outbound IPs/ports, DNS to DGA domains, beaconing patterns
- Host: unexpected processes, modified system binaries, new scheduled tasks
- Authentication: impossible travel, multiple failed logins, privilege escalation
- Application: SQL injection patterns, path traversal attempts, unusual API usage
- File: known malware hashes, modified system files, unexpected scripts

## Patterns

```sql
-- CloudTrail: find unusual API calls from compromised credentials
SELECT
    eventTime,
    eventSource,
    eventName,
    sourceIPAddress,
    userIdentity.arn,
    errorCode
FROM cloudtrail_logs
WHERE userIdentity.arn LIKE '%compromised-role%'
AND eventTime BETWEEN '2024-01-15T00:00:00Z' AND '2024-01-16T00:00:00Z'
ORDER BY eventTime ASC;
```

```python
# Beaconing detection: find regular interval connections
from collections import Counter
import statistics

def detect_beaconing(connections, threshold_cv=0.1):
    by_dest = {}
    for conn in connections:
        key = (conn["src_ip"], conn["dst_ip"], conn["dst_port"])
        by_dest.setdefault(key, []).append(conn["timestamp"])

    suspects = []
    for key, timestamps in by_dest.items():
        if len(timestamps) < 10:
            continue
        intervals = [
            timestamps[i+1] - timestamps[i]
            for i in range(len(timestamps)-1)
        ]
        mean = statistics.mean(intervals)
        if mean == 0:
            continue
        cv = statistics.stdev(intervals) / mean
        if cv < threshold_cv:
            suspects.append({"connection": key, "interval": mean, "cv": cv})
    return suspects
```

**Correlation Techniques**
- Time-based: events within N seconds across sources
- Entity-based: same user/IP/host appearing in multiple log types
- Behavioral: sequence of actions matching known attack patterns (MITRE ATT&CK)
- Statistical: deviations from baseline (volume spikes, new user-agent strings)

## Gotchas

- Log timestamps may differ by seconds between systems -- allow fuzzy matching
- Attackers clear logs -- gaps ARE evidence (compare expected vs actual log volume)
- CloudTrail has 15-minute delivery delay; real-time requires CloudWatch integration
- VPC Flow Logs don't capture packet content -- only metadata
- Compressed/rotated logs may need decompression before analysis
- UTC conversion errors are the most common timeline mistakes

## Verification

- Timeline covers full incident window with no unexplained gaps
- All IOCs documented with confidence level (confirmed/suspected)
- Findings corroborated by at least two independent log sources
- Attack narrative maps to MITRE ATT&CK techniques
- Root cause identified with evidence (not speculation)
