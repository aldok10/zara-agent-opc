# Log Analysis Patterns

Threat hunting, IOC detection, and timeline reconstruction from security logs.

## Log Sources and Value

### High-Value Sources (prioritize ingestion)

| Source | Detects | Format |
|--------|---------|--------|
| Authentication logs | Brute force, credential stuffing, impossible travel | Syslog, JSON |
| Cloud audit trails | Privilege escalation, persistence, data exfiltration | JSON (CloudTrail, GCP Audit) |
| DNS query logs | C2 communication, DGA domains, data tunneling | DNS wire format, JSON |
| Network flow logs | Lateral movement, beaconing, exfiltration | NetFlow/IPFIX, VPC Flow |
| EDR telemetry | Process injection, credential access, persistence | Vendor-specific JSON |
| Web server/ALB logs | SQLi, path traversal, scanning, credential abuse | CLF/JSON |
| Kubernetes audit logs | Container escape, RBAC bypass, secrets access | JSON |

### Normalization Requirements
- Consistent timestamp format (ISO 8601, UTC)
- Unified actor identification (user, service account, IP, device)
- Action taxonomy (authenticate, authorize, create, read, update, delete)
- Resource identification (ARN, GCP resource name, K8s resource path)
- Outcome (success, failure, denied)

## Threat Hunting Methodology

### Hypothesis-Driven Hunting

```
1. Form hypothesis: "Attacker may have established persistence via IAM role creation"
2. Identify data sources: CloudTrail CreateRole/AttachPolicy events
3. Build query: filter for role creation by non-automation principals
4. Analyze results: correlate with known-good baselines
5. Confirm/refute: validate findings with additional evidence
6. Document: whether positive or negative, record the hunt
```

### Hunt Categories

**Known-Threat Hunting**: Search for specific IOCs (IPs, domains, hashes, TTPs)
- Use threat intel feeds mapped to MITRE ATT&CK
- Search historical logs for retroactive detection
- Correlate across multiple data sources

**Anomaly-Based Hunting**: Detect deviations from baseline
- First-time events: new process, new login source, new API call
- Statistical outliers: volume spikes, unusual timing, rare combinations
- Behavioral changes: different working hours, new data access patterns

**TTP-Based Hunting**: Search for attacker techniques regardless of specific tools
- Map MITRE ATT&CK techniques to log signatures
- Focus on post-exploitation: discovery, lateral movement, collection
- Look for technique chains (e.g., discovery followed by lateral movement)

## Common Attack Patterns in Logs

### Credential Stuffing / Brute Force
```
Pattern: High volume auth failures from multiple IPs targeting multiple accounts
Indicators:
- auth.outcome == "failure" grouped by target_user, high cardinality source_ip
- Success after many failures (compromised account)
- User-agent strings consistent with automation tools
- Geographic distribution inconsistent with user base
```

### Lateral Movement
```
Pattern: Authenticated sessions originating from internal hosts to many internal targets
Indicators:
- RDP/SSH/WinRM connections between workstations (not server-to-server)
- Service account used from unexpected source hosts
- SMB access to multiple hosts in short timeframe
- PsExec/WMI execution from non-admin workstations
```

### Data Exfiltration
```
Pattern: Unusual data volume leaving network or cloud to external destinations
Indicators:
- S3/GCS downloads exceeding baseline by >2 standard deviations
- DNS TXT queries with high entropy (DNS tunneling)
- HTTPS connections to new domains with large upload volume
- Database queries returning abnormally large result sets
- Zip/archive creation followed by external transfer
```

### Privilege Escalation
```
Pattern: Low-privilege actor gaining high-privilege access
Indicators:
- AssumeRole to admin roles from non-admin users
- Policy attachment granting broad permissions
- Group membership changes adding admin groups
- sudo/runas usage from unexpected accounts
- Token creation for higher-privilege service accounts
```

### Persistence
```
Pattern: Mechanisms installed to maintain access across reboots/rotations
Indicators:
- New cron jobs, systemd services, scheduled tasks
- IAM user/role/key creation by non-automation
- Lambda functions created with unusual triggers
- Container images modified in registry
- SSH authorized_keys modifications
- Webhook registrations to external endpoints
```

## Timeline Reconstruction

### Building the Timeline
1. Collect timestamps from all relevant sources
2. Normalize to UTC (handle timezone discrepancies)
3. Sort chronologically
4. Identify causal chains (event A enabled event B)
5. Mark gaps (periods with no visibility)
6. Correlate with external threat intel

### Timeline Format
```
TIMESTAMP           SOURCE          ACTOR             ACTION              TARGET              OUTCOME
2026-03-15T08:12Z  CloudTrail      user:attacker     AssumeRole          admin-role          SUCCESS
2026-03-15T08:13Z  CloudTrail      role:admin-role   CreateAccessKey     service-account     SUCCESS
2026-03-15T08:15Z  CloudTrail      role:admin-role   DescribeInstances   ec2:*               SUCCESS
2026-03-15T08:18Z  VPC Flow        10.0.1.50         TCP/22              10.0.2.30           ACCEPT
2026-03-15T08:19Z  auth.log        service-account   SSH login           web-server-02       SUCCESS
2026-03-15T08:22Z  CloudTrail      role:admin-role   GetObject           s3:customer-data/*  SUCCESS
```

## Detection Engineering

### Rule Quality Criteria
- **True positive rate**: >80% (tune until noise is manageable)
- **Detection latency**: <5 minutes for critical threats
- **Context enrichment**: rule output includes all data needed for triage
- **Suppression**: documented exceptions that don't mask threats
- **Testing**: detection rules tested against simulated attacks

### Alert Triage Priority

| Signal Combination | Priority | Response |
|-------------------|----------|----------|
| Known IOC + high-value asset | P1 | Immediate investigation |
| Anomaly + sensitive data access | P2 | Investigate within 1 hour |
| TTP match + low-value asset | P3 | Investigate within 4 hours |
| Single anomaly, no context | P4 | Batch review next business day |

## 2026 Context

- AI copilots for analysts: natural language queries over log data, automated correlation
- eBPF observability: kernel-level visibility without agent overhead
- Cloud-native SIEM: serverless architectures (AWS Security Lake, Chronicle SOAR)
- OCSF (Open Cybersecurity Schema Framework): vendor-neutral log normalization standard
- Detection-as-code: rules in version control, tested in CI, deployed like software
- Purple team automation: continuous attack simulation generating ground-truth detections
