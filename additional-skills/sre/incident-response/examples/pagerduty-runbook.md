---
type: example
title: "PagerDuty Incident Runbook: High CPU Alert"
---

# PagerDuty Incident Runbook (High CPU Alert)

## Context
When on-call engineers receive alerts and need structured guidance for diagnosis and resolution. A runbook reduces MTTR by removing guesswork. This example covers a sustained high CPU alert on a production web service.

## Code/Template

```yaml
# runbooks/high-cpu-web-service.yml
# This YAML can be imported into PagerDuty's Incident Workflows
# or rendered as HTML for the on-call handbook

metadata:
  id: RB-001
  title: "High CPU on Web Service"
  alert_source: "Datadog monitor: prod.web.cpu.percent > 85 for 5m"
  service: web-api-production
  escalation_policy: web-platform-oncall
  severity: P2 (upgrades to P1 if > 95% for 10m)
  last_updated: "2024-03-15"
  owner: platform-team

detection:
  condition: "CPU utilization > 85% sustained for 5 minutes"
  monitors:
    - datadog: "prod.web.cpu.high"
    - cloudwatch: "ECS/CPUUtilization > 85"
  false_positive_check: |
    Verify it's not a deploy-related spike (check last deploy time).
    If deploy happened < 10 min ago and CPU is declining, wait and observe.

impact_assessment:
  questions:
    - "Are users seeing increased latency? (Check p99 response time)"
    - "Are error rates elevated? (Check 5xx count)"
    - "Is this affecting all instances or a single task?"
  dashboards:
    - name: "Web Service Overview"
      url: "https://app.datadoghq.com/dashboard/abc-123"
    - name: "ECS Task Health"
      url: "https://console.aws.amazon.com/ecs/..."

diagnosis_steps:
  - step: 1
    action: "Identify the scope"
    commands:
      - description: "Check which tasks are affected"
        cmd: |
          aws ecs list-tasks --cluster prod --service-name web-api \
            --query 'taskArns' --output text | \
          xargs -I{} aws ecs describe-tasks --cluster prod --tasks {} \
            --query 'tasks[].{id:taskArn,cpu:cpu,status:lastStatus}'

      - description: "Check top processes inside container"
        cmd: |
          aws ecs execute-command --cluster prod --task $TASK_ID \
            --container web --interactive \
            --command "top -b -n 1 -o %CPU | head -20"

  - step: 2
    action: "Check for traffic spike"
    commands:
      - description: "Request rate last 30 minutes"
        cmd: |
          curl -s "https://api.datadoghq.com/api/v1/query?query=sum:nginx.requests{service:web-api}.as_rate()&from=$(date -d '-30min' +%s)&to=$(date +%s)" \
            -H "DD-API-KEY: ${DD_API_KEY}" | jq '.series[0].pointlist[-5:]'

  - step: 3
    action: "Check for runaway queries or goroutine leaks"
    commands:
      - description: "Application profiler (Go pprof)"
        cmd: |
          curl -s http://internal-lb:6060/debug/pprof/profile?seconds=30 > cpu.prof
          go tool pprof -top cpu.prof | head -20

      - description: "Goroutine count"
        cmd: |
          curl -s http://internal-lb:6060/debug/pprof/goroutine?debug=1 | head -5

  - step: 4
    action: "Check for downstream dependency issues"
    commands:
      - description: "Database connection pool saturation"
        cmd: |
          psql $DB_URL -c "SELECT count(*) as active, max_conn
            FROM pg_stat_activity
            CROSS JOIN (SELECT setting::int as max_conn FROM pg_settings WHERE name='max_connections') s
            GROUP BY max_conn;"

resolution_actions:
  immediate:
    - condition: "Traffic spike (legitimate)"
      action: "Scale out horizontally"
      command: |
        aws ecs update-service --cluster prod --service web-api \
          --desired-count $(( CURRENT_COUNT + 3 ))
      rollback: |
        aws ecs update-service --cluster prod --service web-api \
          --desired-count $ORIGINAL_COUNT

    - condition: "Single task stuck (goroutine/thread leak)"
      action: "Kill and replace the affected task"
      command: |
        aws ecs stop-task --cluster prod --task $TASK_ID \
          --reason "Runbook RB-001: stuck task recycled"

    - condition: "Bad deploy causing regression"
      action: "Rollback to previous task definition"
      command: |
        PREV_TD=$(aws ecs describe-services --cluster prod --services web-api \
          --query 'services[0].taskDefinition' --output text | sed 's/:.*/:/' )
        PREV_REV=$(( CURRENT_REV - 1 ))
        aws ecs update-service --cluster prod --service web-api \
          --task-definition "${PREV_TD}${PREV_REV}"

    - condition: "Database connection exhaustion"
      action: "Restart PgBouncer or kill idle connections"
      command: |
        psql $DB_URL -c "SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE state = 'idle' AND query_start < now() - interval '10 minutes';"

communication:
  if_user_impacting: |
    1. Post in #incidents: "Investigating high CPU on web-api. Elevated latency expected."
    2. Update status page if p99 > 2x baseline for > 5 minutes
    3. Escalate to P1 if not resolved within 15 minutes
  resolution_message: |
    "Resolved: High CPU on web-api caused by [ROOT_CAUSE]. Mitigated by [ACTION]. 
     Follow-up ticket: [JIRA_LINK]"

post_incident:
  - "Create post-mortem if user-facing impact > 5 minutes"
  - "File ticket for permanent fix if this is a recurring pattern"
  - "Update this runbook with any new diagnosis steps discovered"
```

## Key Points
- Structure runbooks as decision trees (condition -> action), not walls of text—on-call engineers at 3am need quick answers
- Include the exact commands to run, not just descriptions; copy-paste reduces errors under pressure
- Every action needs a rollback command; if the fix doesn't work, you need to undo it without thinking
