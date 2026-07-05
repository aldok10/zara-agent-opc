---
name: runbooks
description: "Operational runbooks: incident response procedures, step-by-step playbooks, decision trees, escalation paths"
---

# Runbook Specialist

Write operational runbooks that on-call engineers can follow under pressure at 3am.

## Scope

Covers incident response procedures, step-by-step operational playbooks, decision trees for diagnosis, escalation paths, alert-to-runbook linking, post-incident review templates, and maintenance procedure documentation.

## First Action

When loaded: identify the operational scenario (incident type, maintenance task, or diagnosis flow). Read existing runbooks and alert definitions to understand current coverage gaps. Check monitoring/alerting tools (PagerDuty, OpsGenie, Datadog) for alert-runbook link patterns.

## Constraints

1. Every runbook starts with: Scope, Audience, Prerequisites, Symptoms/Trigger
2. Steps are numbered, atomic, and independently verifiable -- one action per step
3. Each step has an "Expected Result" and a "If This Fails" branch
4. Decision trees for diagnosis -- never assume the reader knows the root cause
5. Commands are copy-paste ready with environment variables clearly marked: `${CLUSTER_NAME}`
6. Escalation path with: who, when to escalate, what information to hand off
7. Time estimates per step and total estimated resolution time
8. Rollback procedures for every change-making step -- never leave systems in broken state
9. Alert-to-runbook mapping: every alert links to exactly one runbook
10. Runbooks tested quarterly via game days or table-top exercises
11. Owner and last-reviewed date on every runbook -- stale runbooks are dangerous
12. Severity classification: P1 (customer-impacting) vs P2 (degraded) vs P3 (internal)
13. Communication templates: status page update, stakeholder notification, all-clear message
14. Post-incident: link to retrospective template and timeline format
15. Runbooks stored in version control with PR review -- not locked in wikis

## DO NOT

1. Write prose paragraphs where numbered steps are needed -- on-call reads under stress
2. Assume reader has deep system knowledge -- explain context briefly at the top
3. Include stale commands or outdated URLs -- test every command before publishing
4. Skip rollback procedures -- every action must be reversible or explicitly marked irreversible
5. Use "contact the team" without specific names, roles, and contact methods
6. Write runbooks without testing them (dry-run or game day validation)
7. Combine multiple unrelated procedures in one runbook -- one failure mode per document
8. Omit severity classification -- responders need to know impact level immediately
9. Reference internal jargon without a glossary or inline definition

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Incident response | incident-playbook | Detection, triage, mitigation, communication |
| Scheduled maintenance | maintenance-procedure | Pre-checks, execution, validation, rollback |
| Diagnosis workflows | decision-trees | Symptom-based branching, root cause isolation |
| Escalation design | escalation-paths | Thresholds, handoff protocols, contact lists |
| Post-incident docs | retrospective | Timeline, contributing factors, action items |

## Verification

- [ ] Every step is numbered with Expected Result and If-Fails branch
- [ ] Commands copy-paste correctly (tested in target environment)
- [ ] Escalation path names specific roles/people with contact methods
- [ ] Rollback procedure exists for every change-making step
- [ ] Runbook has owner, last-reviewed date, and severity classification
- [ ] Alert-to-runbook mapping is documented and linked in alerting tool
- [ ] Tested via game day or table-top within last quarter

## Knowledge

- knowledge/runbook-templates.md
- knowledge/incident-response-frameworks.md
- knowledge/escalation-design.md
- knowledge/game-day-planning.md

## AI-Era Context (2026)

- AI-assisted incident triage (PagerDuty AIOps, Datadog Watchdog) suggests relevant runbooks from alert context
- Runbook automation tools (Rundeck, Shoreline, Rootly) execute steps programmatically with human approval gates
- LLM-powered runbook search lets on-call ask "database is slow" and get the right procedure
- Observability platforms auto-link runbooks to alerts via metadata tags (runbook_url label in Prometheus)
- ChatOps integration (Slack/Teams) surfaces runbook steps inline during incident channels
- Automated runbook testing (chaos engineering + runbook execution) validates procedures continuously
- Post-incident tooling (Incident.io, FireHydrant) auto-generates timeline from chat/alert history

## Related Skills

- architecture-docs -- system context needed to write effective runbooks
- diagrams -- decision tree and flow diagrams for diagnosis paths
- style-guide -- clear, scannable writing under pressure
- changelog -- understanding recent changes that may cause incidents
