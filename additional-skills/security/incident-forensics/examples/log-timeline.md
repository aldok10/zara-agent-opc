---
type: example
title: "Incident Log Timeline Correlation"
---

# Incident Log Timeline Correlation

## Context
When investigating a security incident and you need to correlate events across multiple log sources (CloudTrail, VPC Flow Logs, application logs) into a single timeline. This script pulls events from different sources and aligns them by timestamp to reconstruct attacker activity.

## Code/Template

```python
#!/usr/bin/env python3
"""
Incident timeline correlation tool.
Pulls events from multiple sources and builds a unified chronological view.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

import boto3


class Severity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class TimelineEvent:
    timestamp: datetime
    source: str
    severity: Severity
    actor: str
    action: str
    target: str
    details: dict[str, Any] = field(default_factory=dict)
    ioc_match: bool = False

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "source": self.source,
            "severity": self.severity.value,
            "actor": self.actor,
            "action": self.action,
            "target": self.target,
            "details": self.details,
            "ioc_match": self.ioc_match,
        }


def collect_cloudtrail_events(
    start: datetime, end: datetime, suspect_ips: set[str]
) -> list[TimelineEvent]:
    """Pull CloudTrail events and flag suspicious sources."""
    client = boto3.client("cloudtrail")
    events: list[TimelineEvent] = []

    paginator = client.get_paginator("lookup_events")
    for page in paginator.paginate(StartTime=start, EndTime=end):
        for event in page.get("Events", []):
            raw = json.loads(event.get("CloudTrailEvent", "{}"))
            source_ip = raw.get("sourceIPAddress", "unknown")
            is_suspicious = source_ip in suspect_ips

            severity = Severity.CRITICAL if is_suspicious else Severity.INFO
            if raw.get("eventName", "").startswith("Delete"):
                severity = Severity.WARNING

            events.append(
                TimelineEvent(
                    timestamp=event["EventTime"],
                    source="cloudtrail",
                    severity=severity,
                    actor=raw.get("userIdentity", {}).get("arn", "unknown"),
                    action=raw.get("eventName", "unknown"),
                    target=raw.get("requestParameters", {}).get(
                        "bucketName",
                        raw.get("requestParameters", {}).get("instanceId", "N/A"),
                    ),
                    details={
                        "source_ip": source_ip,
                        "user_agent": raw.get("userAgent", ""),
                        "region": raw.get("awsRegion", ""),
                        "error": raw.get("errorCode"),
                    },
                    ioc_match=is_suspicious,
                )
            )

    return events


def collect_vpc_flow_logs(
    log_group: str, start: datetime, end: datetime, suspect_ips: set[str]
) -> list[TimelineEvent]:
    """Parse VPC Flow Logs for lateral movement indicators."""
    logs_client = boto3.client("logs")
    events: list[TimelineEvent] = []

    query = f"""
    fields @timestamp, srcAddr, dstAddr, srcPort, dstPort, action, protocol, bytes
    | filter action = "ACCEPT"
    | filter (srcAddr in {list(suspect_ips)} or dstAddr in {list(suspect_ips)})
    | sort @timestamp asc
    """

    response = logs_client.start_query(
        logGroupName=log_group,
        startTime=int(start.timestamp()),
        endTime=int(end.timestamp()),
        queryString=query,
    )

    # Poll for results (simplified)
    import time
    query_id = response["queryId"]
    while True:
        result = logs_client.get_query_results(queryId=query_id)
        if result["status"] == "Complete":
            break
        time.sleep(1)

    for row in result.get("results", []):
        fields = {f["field"]: f["value"] for f in row}
        events.append(
            TimelineEvent(
                timestamp=datetime.fromisoformat(fields["@timestamp"]),
                source="vpc_flow",
                severity=Severity.WARNING,
                actor=fields.get("srcAddr", "unknown"),
                action=f"{fields.get('protocol', '?')}:{fields.get('dstPort', '?')}",
                target=fields.get("dstAddr", "unknown"),
                details={"bytes": fields.get("bytes", "0")},
                ioc_match=True,
            )
        )

    return events


def build_timeline(
    start: datetime,
    end: datetime,
    suspect_ips: set[str],
    vpc_log_group: str,
) -> list[TimelineEvent]:
    """Merge all sources into a single sorted timeline."""
    all_events: list[TimelineEvent] = []

    all_events.extend(collect_cloudtrail_events(start, end, suspect_ips))
    all_events.extend(
        collect_vpc_flow_logs(vpc_log_group, start, end, suspect_ips)
    )

    # Sort by timestamp
    all_events.sort(key=lambda e: e.timestamp)

    return all_events


def print_timeline(events: list[TimelineEvent]) -> None:
    """Print formatted timeline for incident report."""
    print(f"\n{'='*80}")
    print(f"INCIDENT TIMELINE ({len(events)} events)")
    print(f"{'='*80}\n")

    for event in events:
        flag = " [IOC]" if event.ioc_match else ""
        sev = event.severity.value.upper().ljust(8)
        ts = event.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        print(f"  {ts} | {sev} | [{event.source}]{flag}")
        print(f"    Actor:  {event.actor}")
        print(f"    Action: {event.action} -> {event.target}")
        if event.details.get("error"):
            print(f"    Error:  {event.details['error']}")
        print()


if __name__ == "__main__":
    # Incident parameters
    incident_start = datetime(2024, 3, 15, 2, 0, tzinfo=timezone.utc)
    incident_end = incident_start + timedelta(hours=6)
    suspect_ips = {"198.51.100.42", "203.0.113.99"}

    timeline = build_timeline(
        start=incident_start,
        end=incident_end,
        suspect_ips=suspect_ips,
        vpc_log_group="/aws/vpc/flow-logs-prod",
    )

    print_timeline(timeline)

    # Export for report
    with open("incident-timeline.json", "w") as f:
        json.dump([e.to_dict() for e in timeline], f, indent=2, default=str)
```

## Key Points
- Always define IOCs (indicators of compromise) upfront—suspect IPs, user agents, API keys—and flag matches in the timeline automatically
- Correlate across at least 3 log sources (identity, network, application) to catch lateral movement that no single source reveals
- Export as structured JSON for handoff to legal/compliance; human-readable for the war room, machine-readable for the report
