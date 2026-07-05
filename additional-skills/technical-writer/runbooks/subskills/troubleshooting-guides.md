---
type: subskill
title: "Troubleshooting Guides"
---

# Troubleshooting Guides

## Core Concepts
- Troubleshooting guides help operators diagnose and resolve known issues systematically
- Structure: symptom → diagnosis steps → root cause identification → resolution → verification
- Organized by observable symptom, not by internal cause (operators see symptoms first)
- Progressive narrowing: start broad (is it network? is it application? is it data?) then drill down
- Include "if this didn't work" branches for when the obvious fix isn't the answer

## Key Practices
- Title with the symptom the operator observes ("API returns 503 during peak traffic")
- List diagnostic commands with expected vs problematic output for comparison
- Provide copy-paste commands; operators under pressure shouldn't construct queries from scratch
- Include severity assessment: is this a page-worthy emergency or a low-priority investigation
- Link to related alerts, dashboards, and escalation contacts

## Common Mistakes
- Organizing by system component instead of by symptom (operators don't know the cause yet)
- Assuming operator has deep system knowledge (write for the 2am on-call responder)
- Stale guides referencing commands, paths, or configurations that no longer exist

## When to Apply
- After resolving a production incident—capture the diagnosis path while fresh
- Building operational documentation for services entering production readiness
- Reducing repeat pages for known issues that have documented resolutions
