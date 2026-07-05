---
type: subskill
title: "Deployment Strategies"
---

# Deployment Strategies

## Core Concepts
- Deployment strategy determines how new versions replace old ones in production
- Rolling update: gradual replacement of instances; zero-downtime but mixed versions coexist
- Blue-green: two identical environments; switch traffic atomically; instant rollback
- Canary: route small percentage of traffic to new version; promote or rollback based on metrics
- Feature flags: decouple deployment from release; code ships dark, activated independently

## Key Practices
- Define rollback criteria upfront: error rate threshold, latency p99, business metric regression
- Automate rollback triggers using deployment health checks and observability signals
- Use progressive delivery (canary → 5% → 25% → 50% → 100%) with bake time between steps
- Ensure database migrations are backward-compatible (expand/contract pattern)
- Test deployment procedures in staging with realistic traffic patterns

## Common Mistakes
- Running blue-green without database compatibility, causing state divergence
- Canary deployments without sufficient traffic to generate statistically significant signals
- Skipping rollback testing—first rollback attempt should not be during an incident

## When to Apply
- Choosing deployment approach for a new service or platform
- Reducing deployment risk for critical, high-traffic services
- Migrating from manual deployments to automated progressive delivery
