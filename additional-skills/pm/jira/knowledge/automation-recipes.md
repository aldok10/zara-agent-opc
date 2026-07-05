---
type: fact
title: "Automation Recipes"
---

# Automation Recipes

Format: Trigger > Condition > Action > Use Case

1. Issue created > type=Bug, component=payments > priority=High, notify #oncall > Critical path protection
2. Status→Done > all sub-tasks resolved > set resolution=Done, clear flag > Clean closure
3. PR merged (dev trigger) > status=In Review > transition→Done > Dev-to-done automation
4. Scheduled daily 9am > `priority=Highest AND status="To Do" AND created<=-2d` > notify PM channel > SLA breach warning
5. Sprint completed > status!=Done > move to next sprint, comment "rolled" > Sprint rollover
6. All sub-tasks Done > parent type=Story > transition parent→In Review > Bottom-up completion
7. Issue flagged > - > notify assignee + PM, add "blocked" label > Visibility on blockers
8. Version released > issues in version > create Confluence page with summaries > Release notes
9. Scheduled weekly > `updated<=-30d AND status!="Done" AND type!=Epic` > comment "stale warning" > Hygiene
10. Issue assigned > assignee changed > notify new assignee, add watcher > Handoff awareness
11. Due date approaching > due<=2d AND status!="Done" > notify assignee, add flag > Deadline reminder
12. Comment added > comment contains "blocked" > add flag, notify PM > Keyword-triggered escalation
13. Issue moved to "Ready" > story points EMPTY > reject transition, comment "estimate required" > Quality gate
14. Label added "urgent" > - > set priority=Highest, notify channel > Fast-track escalation
15. Issue created > reporter external (customer) > add "customer-reported" label, assign triage queue > Support routing

## AI-Powered Triage (Atlassian Intelligence / Rovo, 2025)

> Note: Atlassian Intelligence = underlying AI engine. Rovo = standalone AI product (search, chat, agents) built on top of it.

16. Issue created > AI classifies type+priority from summary/description > auto-set fields, route to team > Zero-touch triage
17. Issue created > Rovo agent suggests component+assignee based on historical patterns > pre-fill fields for human approval > Smart routing
18. Issue updated > AI detects duplicate via semantic similarity > link as duplicate, notify reporter > Dedup automation

## GitHub/GitLab Bidirectional Sync

19. Branch created matching `PROJ-\d+` > link branch to issue, transition→In Progress > Auto-start on dev
20. PR merged (GitHub/GitLab webhook) > status=In Review OR In Progress > transition→Done, add merge commit link > PR-merge auto-close
21. PR review requested > linked issue exists > transition→In Review, add reviewer as watcher > Review-state sync
22. CI build failed > linked issue exists > add "build-failed" label, comment with build URL > Pipeline visibility

## SLA Breach & Notification

23. Scheduled hourly > `priority=Highest AND status!="Done" AND created<=-4h` > escalate to manager, add "sla-breach" label > Time-based SLA
24. Due date passed > status!="Done" > notify assignee+PM, set flag, add "overdue" label > Deadline enforcement
25. Issue in status>3d > status="In Review" AND updated<=-3d > notify reviewer, comment "review stale" > Review bottleneck alert

## Playbook Templates (Atlassian 2025)

26. Incident created (type=Incident) > create sub-tasks from playbook (investigate, mitigate, RCA, comms) > assign roles > Incident response
27. New hire onboarded > create checklist Epic from template (access, setup, intro meetings) > assign to buddy > Onboarding playbook
28. Release planned > create tasks from release checklist template (freeze, QA, staging, prod, rollback plan) > Release management
