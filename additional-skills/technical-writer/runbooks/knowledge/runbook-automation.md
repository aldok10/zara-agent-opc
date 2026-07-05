---
type: fact
title: "Runbook Automation"
---

# Runbook Automation

Turning manual operational procedures into executable, auditable workflows.

## Spectrum of Automation

| Level | Description | Example |
|-------|-------------|---------|
| Manual | Written steps, human executes | Wiki page with CLI commands |
| Assisted | Script with prompts, human confirms each step | Interactive bash script |
| Semi-automated | Triggered by human, runs without intervention | PagerDuty runbook action |
| Fully automated | Triggered by alert, runs without human | Auto-remediation workflow |

Goal: move high-frequency, well-understood procedures toward full automation. Keep complex judgment calls at assisted/semi-automated.

## PagerDuty Automation Actions

Attach runbook steps directly to incident workflows:

### Capabilities

- Trigger scripts on infrastructure when alert fires
- Capture diagnostic output and attach to incident timeline
- Execute remediation steps with approval gates
- Track which actions were taken during incident response

### Pattern

```
Alert fires → PagerDuty incident created → Automation action triggered:
  1. Gather diagnostics (pod logs, metrics snapshot)
  2. Attach to incident
  3. If known pattern detected: offer remediation action
  4. On-call approves → execute remediation
  5. Verify fix → resolve or escalate
```

### Best For

- Incident response: first-responder actions (gather context before human decides)
- Known failure modes with proven remediation
- Teams already using PagerDuty for on-call

## Rundeck

Self-service operations platform:

### Core Concepts

- **Jobs**: defined sequences of steps (commands, scripts, API calls)
- **Nodes**: target infrastructure (filtered by attributes)
- **Access control**: RBAC determines who can run what on which nodes
- **Audit log**: every execution recorded with inputs, outputs, user

### Job Definition

```yaml
- name: restart-service
  description: Restart a service with health check verification
  sequence:
    steps:
      - script: |
          systemctl restart ${option.service_name}
          sleep 5
          systemctl is-active ${option.service_name}
      - script: |
          curl -sf http://localhost:${option.health_port}/health || exit 1
  options:
    service_name:
      required: true
      allowed: "payment-api,order-api,inventory-api"
    health_port:
      required: true
      default: "8080"
```

### Use Cases

- Self-service for developers (restart, scale, toggle feature flags)
- Scheduled maintenance tasks with logging
- Multi-step procedures across multiple nodes
- Bridge: give junior operators safe access to production actions

## Jupyter Notebooks as Runbooks

Interactive executable documentation:

### Why Notebooks for Operations

- Mix prose (context, decisions) with executable code (diagnostics, fixes)
- Output preserved alongside commands (evidence of execution)
- Can query APIs, databases, metrics inline
- Shareable: new team members run same notebook

### Structure

```python
# Cell 1: Context
"""
## Database Connection Pool Exhaustion

Symptoms: 5xx errors from payment-api, connection timeout logs
Expected duration: 5-10 minutes to diagnose and resolve
"""

# Cell 2: Diagnostics
import requests
metrics = requests.get("http://prometheus:9090/api/v1/query",
    params={"query": "pg_stat_activity_count{datname='payments'}"}).json()
current_connections = metrics['data']['result'][0]['value'][1]
print(f"Active connections: {current_connections}")

# Cell 3: Decision Point
"""
If active connections > 90% of max_connections (100):
- Proceed to Cell 4 (kill idle connections)
If active connections < 50%:
- Problem is elsewhere, check application logs
"""

# Cell 4: Remediation
# ONLY RUN IF CONFIRMED IN CELL 3
import psycopg2
conn = psycopg2.connect(dsn)
conn.execute("""
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE state = 'idle' AND query_start < now() - interval '10 minutes'
""")
```

### Limitations

- Requires notebook environment (JupyterHub, VS Code, Colab)
- State between cells can be confusing (run order matters)
- Not suitable for time-critical incidents (too slow to open and navigate)
- Security: notebooks with production credentials need access control

## Executable Runbooks (Modern Patterns)

### GitHub Actions as Runbooks

```yaml
name: Scale Service
on:
  workflow_dispatch:
    inputs:
      service:
        description: 'Service to scale'
        required: true
        type: choice
        options: [payment-api, order-api]
      replicas:
        description: 'Target replica count'
        required: true
        type: number

jobs:
  scale:
    runs-on: ubuntu-latest
    steps:
      - name: Scale deployment
        run: |
          kubectl scale deployment ${{ inputs.service }} \
            --replicas=${{ inputs.replicas }}
      - name: Verify
        run: |
          kubectl rollout status deployment/${{ inputs.service }} --timeout=120s
      - name: Health check
        run: |
          sleep 10
          kubectl exec deploy/${{ inputs.service }} -- curl -sf localhost:8080/health
```

### Infrastructure-as-Code Runbooks

Define remediation as Terraform/Crossplane changes:
- PR-based: create PR with fix, review, merge, auto-apply
- GitOps: push change to repo, ArgoCD/Flux applies
- Auditable: git history shows who changed what and when

## Design Principles

### When to Automate

Automate when:
- Procedure runs >1x per week
- Steps are deterministic (same input → same output)
- Human judgment is not required at each step
- Incorrect execution causes measurable harm (automation is more reliable)

Keep manual when:
- Procedure varies significantly each time
- Critical decision points require context not available to scripts
- Failure mode is novel (hasn't been seen before)
- Automation cost exceeds manual cost over expected lifetime

### Safety Controls

| Control | Purpose |
|---------|---------|
| Approval gates | Human confirms before destructive action |
| Blast radius limits | Max N instances affected per run |
| Dry-run mode | Show what would happen without executing |
| Timeout | Kill runbook if execution exceeds expected duration |
| Rollback step | Every change step has corresponding undo |
| Audit trail | Who triggered, what ran, what changed |

## Anti-Patterns

- Automating without understanding (script copied from Stack Overflow, nobody knows why it works)
- No dry-run option for destructive operations
- Runbooks that assume specific environment (hardcoded hostnames, paths)
- Full automation of procedures with edge cases that need human judgment
- No verification step after remediation (assuming the fix worked)
- Runbook succeeds silently when it should have failed (missing error handling)
