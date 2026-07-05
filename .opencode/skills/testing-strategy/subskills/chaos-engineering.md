---
type: subskill
title: "Chaos Engineering"
---

# Chaos Engineering

Controlled experiments that deliberately break your system to find weaknesses before they cause outages. Principle: you don't actually know how your system fails until you break it on purpose.

## Start Simple

Chaos is not "randomly destroy production." It starts with small, controlled fault injection:

- Kill one pod / instance.
- Add 100ms latency to a dependency.
- Fill a disk to 90%.
- Drop a percentage of network packets.
- Return errors from a downstream call.

## Prerequisites (Non-Negotiable)

You cannot run useful chaos without:

- **Good observability** -- you need to SEE the impact (metrics, traces, logs).
- **SLOs** -- you need to MEASURE the impact against a defined acceptable threshold.
- **Runbooks** -- you need to RESPOND when the experiment reveals a real failure.

No observability = blind. No SLO = can't tell acceptable from catastrophic.

## Steady State Hypothesis

Define what "normal" looks like BEFORE injecting chaos: e.g. "p99 latency < 200ms and error rate < 0.1%." The experiment: inject a fault, then verify the system stays within steady state (graceful degradation) or measure how far it deviates.

## GameDays

Scheduled chaos sessions with the team observing together. Purpose: validate both the system's resilience AND the team's response (detection, diagnosis, runbook execution). Builds muscle memory for real incidents.

## Blast Radius

Expand gradually:

1. One service, staging environment.
2. Multiple services, staging.
3. Single service, production (off-peak, small % of traffic).
4. Regional / production at scale.

Always have an abort switch to stop the experiment instantly.

## Tools

- **Chaos Monkey** (Netflix) -- random instance termination.
- **Litmus** -- Kubernetes-native chaos.
- **Gremlin** -- SaaS, broad fault catalog, safety controls.
- **Toxiproxy** -- network fault injection (latency, bandwidth, connection drops).

## Anti-Patterns

- **Chaos without observability**: you break things and can't see the impact.
- **Chaos in prod without SLO**: you can't tell acceptable degradation from an outage.
- **Chaos without team buy-in**: surprise breakage creates distrust and blame.
- **No abort switch**: an experiment becomes a real incident.
