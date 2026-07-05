---
type: example
title: "Threat Hunt Queries"
---

# Threat Hunt Queries

KQL and SPL queries for detecting common threat patterns. Organized by MITRE ATT&CK tactic.

## Initial Access (TA0001)

### Credential Stuffing Detection (KQL -- Microsoft Sentinel)
```kql
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType != "0"
| summarize
    FailureCount = count(),
    DistinctUsers = dcount(UserPrincipalName),
    DistinctIPs = dcount(IPAddress),
    Users = make_set(UserPrincipalName, 10)
    by IPAddress, bin(TimeGenerated, 5m)
| where FailureCount > 50 and DistinctUsers > 10
| project TimeGenerated, IPAddress, FailureCount, DistinctUsers, Users
```

### Impossible Travel (KQL)
```kql
SigninLogs
| where ResultType == "0"
| project UserPrincipalName, TimeGenerated, IPAddress, Location
| sort by UserPrincipalName, TimeGenerated asc
| extend PrevLocation = prev(Location), PrevTime = prev(TimeGenerated), PrevUser = prev(UserPrincipalName)
| where UserPrincipalName == PrevUser
| extend TimeDiffMinutes = datetime_diff("minute", TimeGenerated, PrevTime)
| where TimeDiffMinutes < 60 and Location != PrevLocation
| where Location != "" and PrevLocation != ""
```

### Phishing Link Clicks Followed by MFA Push (SPL -- Splunk)
```spl
index=proxy sourcetype=web_proxy
| eval click_time=_time
| join user [
    search index=auth sourcetype=mfa_logs action="push_sent"
    | eval mfa_time=_time
    | table user, mfa_time
]
| where mfa_time - click_time < 300 AND mfa_time - click_time > 0
| where match(url, "(?i)(login|verify|account|secure)")
| stats count by user, url, click_time, mfa_time
```

## Persistence (TA0003)

### Unexpected IAM Key Creation (KQL -- AWS CloudTrail via Sentinel)
```kql
AWSCloudTrail
| where EventName == "CreateAccessKey"
| where UserIdentityType != "AssumedRole" or UserIdentityArn !contains "automation"
| where UserIdentityArn !contains "terraform" and UserIdentityArn !contains "github-actions"
| project TimeGenerated, UserIdentityArn, RequestParameters, SourceIpAddress, UserAgent
| where UserAgent !contains "aws-sdk" or SourceIpAddress !startswith "10."
```

### New Scheduled Task / Cron Job (SPL)
```spl
index=endpoint sourcetype=sysmon EventCode=1
| where (CommandLine="*schtasks*" AND CommandLine="*/create*")
    OR (CommandLine="*crontab*" AND CommandLine="*-e*")
    OR (process_name="at.exe")
| where user!="SYSTEM" AND user!="root"
| stats count by host, user, CommandLine, ParentCommandLine
| where count < 3
```

### Lambda/Cloud Function Backdoor (KQL)
```kql
AWSCloudTrail
| where EventName in ("CreateFunction20150331", "UpdateFunctionCode20150331v2")
| where UserIdentityArn !contains "deploy-pipeline"
| extend FunctionName = tostring(parse_json(RequestParameters).functionName)
| extend Runtime = tostring(parse_json(RequestParameters).runtime)
| project TimeGenerated, UserIdentityArn, FunctionName, Runtime, SourceIpAddress
```

## Privilege Escalation (TA0004)

### Role Assumption from Unusual Source (KQL)
```kql
AWSCloudTrail
| where EventName == "AssumeRole"
| extend AssumedRole = tostring(parse_json(RequestParameters).roleArn)
| where AssumedRole contains "admin" or AssumedRole contains "privileged"
| summarize
    FirstSeen = min(TimeGenerated),
    Count = count()
    by UserIdentityArn, AssumedRole, SourceIpAddress
| join kind=leftanti (
    AWSCloudTrail
    | where TimeGenerated between (ago(30d) .. ago(1d))
    | where EventName == "AssumeRole"
    | distinct UserIdentityArn, SourceIpAddress
) on UserIdentityArn, SourceIpAddress
```

### Kubernetes RBAC Escalation (KQL)
```kql
KubeAuditLogs
| where Verb in ("create", "update", "patch")
| where ObjectRef_Resource in ("clusterroles", "clusterrolebindings", "roles", "rolebindings")
| where User_Username !in ("system:controller-manager", "system:kube-scheduler")
| project TimeGenerated, User_Username, Verb, ObjectRef_Resource, ObjectRef_Name, SourceIPs
```

### Sudo/Admin Escalation Anomaly (SPL)
```spl
index=linux sourcetype=syslog sudo
| rex "(?<user>\w+)\s+:\s+TTY=\S+\s+;\s+PWD=\S+\s+;\s+USER=(?<target_user>\w+)\s+;\s+COMMAND=(?<command>.+)"
| where target_user="root"
| stats count dc(command) as unique_commands values(command) as commands by user, host
| where unique_commands > 5
| sort - unique_commands
```

## Lateral Movement (TA0008)

### RDP Between Workstations (KQL)
```kql
SecurityEvent
| where EventID == 4624
| where LogonType == 10
| where TargetUserName !endswith "$"
| extend SourceHost = IpAddress
| where SourceHost startswith "10.0.1."
| where Computer startswith "WS-"
| summarize
    Count = count(),
    TargetHosts = make_set(Computer, 20)
    by SourceHost, TargetUserName, bin(TimeGenerated, 1h)
| where Count > 3
```

### SSH Lateral with Key Reuse (SPL)
```spl
index=linux sourcetype=syslog "Accepted publickey"
| rex "Accepted publickey for (?<user>\w+) from (?<src_ip>\S+)"
| stats dc(host) as target_count values(host) as targets by user, src_ip
| where target_count > 5
| sort - target_count
```

## Exfiltration (TA0010)

### Unusual S3 Download Volume (KQL)
```kql
AWSCloudTrail
| where EventName == "GetObject"
| extend BucketName = tostring(parse_json(RequestParameters).bucketName)
| where BucketName contains "customer" or BucketName contains "sensitive" or BucketName contains "backup"
| summarize
    ObjectCount = count(),
    TotalBytes = sum(tolong(parse_json(AdditionalEventData).bytesTransferredOut))
    by UserIdentityArn, BucketName, bin(TimeGenerated, 1h)
| where ObjectCount > 100 or TotalBytes > 1073741824
```

### DNS Tunneling Detection (SPL)
```spl
index=dns sourcetype=dns
| eval query_length=len(query)
| eval subdomain=mvindex(split(query, "."), 0)
| eval entropy=0
| foreach mode [eval entropy=entropy + if(match(subdomain, "[a-z]"), 1, 0)]
| where query_length > 50
| stats count avg(query_length) as avg_len dc(query) as unique_queries by src_ip, query_domain
| where unique_queries > 100 AND avg_len > 40
```

### Large Upload to External (KQL)
```kql
CommonSecurityLog
| where DeviceAction == "allowed"
| where DestinationIP !startswith "10." and DestinationIP !startswith "172.16." and DestinationIP !startswith "192.168."
| where SentBytes > 104857600
| where DestinationPort in (443, 80, 8443)
| summarize
    TotalSent = sum(SentBytes),
    SessionCount = count()
    by SourceIP, DestinationIP, bin(TimeGenerated, 15m)
| where TotalSent > 524288000
```

## Defense Evasion (TA0005)

### CloudTrail Logging Disabled (KQL)
```kql
AWSCloudTrail
| where EventName in ("StopLogging", "DeleteTrail", "UpdateTrail")
| project TimeGenerated, UserIdentityArn, EventName, SourceIpAddress, RequestParameters
```

### Security Group Opened Wide (KQL)
```kql
AWSCloudTrail
| where EventName == "AuthorizeSecurityGroupIngress"
| extend Rules = parse_json(RequestParameters)
| where tostring(Rules) contains "0.0.0.0/0"
| where tostring(Rules) !contains "\"toPort\":443" or tostring(Rules) contains "\"toPort\":22"
| project TimeGenerated, UserIdentityArn, Rules, SourceIpAddress
```

### Log Deletion (SPL)
```spl
index=* sourcetype=wineventlog EventCode=1102
| append [search index=linux sourcetype=syslog "rm -rf /var/log" OR "truncate -s 0" OR "> /var/log"]
| append [search index=aws sourcetype=aws:cloudtrail eventName="DeleteLogGroup" OR eventName="DeleteLogStream"]
| stats count by host, user, _time, sourcetype
```

## Usage Notes

- Adapt thresholds to your environment's baseline (50 failures might be normal for large org)
- Run hunts against 7-30 day windows for historical detection
- Correlate findings across multiple queries (e.g., credential stuffing + privilege escalation)
- Track hunt results: document whether hypothesis confirmed or refuted
- Automate successful hunts as detection rules
- Review and update quarterly as attacker TTPs evolve
