# Runbook Structure

Template and guidelines for writing operational runbooks that work under pressure.

## Required Sections

Every runbook must contain these sections in this order:

### 1. Header

```markdown
# [Service/Component]: [Problem Description]

**Owner:** [team-name]
**Last reviewed:** YYYY-MM-DD
**Severity:** P1 (customer-impacting) | P2 (degraded) | P3 (internal-only)
**Estimated resolution time:** X-Y minutes
**Alert:** [alert-name that triggers this runbook]
```

### 2. Scope

One paragraph: what this runbook covers and what it does not.

### 3. Symptoms / Trigger

How the on-call engineer knows this runbook is relevant:
- What alert fired
- What error message or metric pattern indicates this problem
- What users report

### 4. Prerequisites

What the responder needs before starting:
- Access requirements (AWS console, database, kubectl context)
- Tools that must be installed
- Information to gather first (affected region, customer ID)

### 5. Diagnosis

Decision tree to identify the root cause variant:

```markdown
1. Check [metric/dashboard/log]
   - If [condition A]: proceed to Step 6 (Mitigation variant A)
   - If [condition B]: proceed to Step 7 (Mitigation variant B)
   - If neither: escalate to [team] with [information]
```

### 6. Mitigation Steps

Numbered, atomic steps:

```markdown
1. [Action description]
   ```bash
   [copy-paste command with ${VARIABLES} clearly marked]
   ```
   **Expected result:** [what you should see]
   **If this fails:** [what to do instead]
   **Estimated time:** X minutes

2. [Next action]
   ...
```

### 7. Verification

How to confirm the problem is resolved:
- Metric returns to normal range
- Alert clears
- Customer-facing test succeeds

### 8. Rollback

If the mitigation made things worse, how to undo it.

### 9. Communication

Templates for status updates:
- Internal: Slack channel, incident commander notification
- External: Status page update text
- All-clear: Message confirming resolution

### 10. Post-Incident

- Link to retrospective template
- Timeline format to fill in
- Data to preserve (logs, metrics snapshots)

## Step Writing Rules

1. One action per step -- never combine "check X and if Y then Z" into one step
2. Every command copy-paste ready with clear variable substitution
3. Expected result after every step (responder knows they are on track)
4. If-fails branch on every step (responder is never stuck)
5. Time estimate on steps that take >1 minute
6. Environment-specific values as variables: `${CLUSTER_NAME}`, `${REGION}`
7. Dangerous commands marked with warning: "This will restart all pods in the namespace"

## Decision Tree Format

For complex diagnosis, use structured branching:

```markdown
## Diagnosis

### Is the service responding at all?

Check: `curl -s -o /dev/null -w "%{http_code}" https://${SERVICE_URL}/health`

- **200**: Service is up. Go to "High Latency" below.
- **5xx**: Service is up but erroring. Go to "Error Response" below.
- **No response / timeout**: Service is down. Go to "Service Down" below.

### High Latency

Check: Grafana dashboard [link]

- **Database queries slow**: Go to "Database Issues" section
- **External dependency timeout**: Go to "Upstream Dependency" section
- **CPU/memory saturation**: Go to "Resource Exhaustion" section
```

## Variable Convention

All environment-specific values use `${UPPER_SNAKE_CASE}`:

```bash
kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME}
aws logs tail /ecs/${CLUSTER_NAME}/${SERVICE_NAME} --since 30m
```

Document where to find variable values:
```markdown
| Variable | Where to find it | Example |
|----------|-----------------|---------|
| ${CLUSTER_NAME} | Alert payload field `cluster` | prod-us-east-1 |
| ${NAMESPACE} | Service metadata in Backstage | orders-production |
| ${SERVICE_NAME} | Alert payload field `service` | order-api |
```

## Escalation Format

```markdown
## Escalation

**When to escalate:**
- After 15 minutes without progress on diagnosis
- If the problem affects >10% of requests
- If the root cause involves another team's service

**Who to contact:**
| Role | Team | Contact | When |
|------|------|---------|------|
| Database on-call | Platform | @platform-oncall in #incidents | DB issues |
| Security | AppSec | @security-oncall in #security-incidents | Data exposure |
| Leadership | Engineering | VP Eng via PagerDuty | P1 >30 minutes |

**What to provide when escalating:**
- Timeline so far
- What you have tried
- Current customer impact
- Relevant dashboards/logs (links, not screenshots)
```

## Review Cadence

- Runbooks reviewed when the service changes (deployment pipeline trigger)
- Mandatory quarterly review if no changes (review date in header)
- Game day or table-top exercise tests runbook accuracy
- Post-incident: update runbook if any step was wrong or missing
