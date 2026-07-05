---
type: fact
title: "Feature Flag Management"
---

# Feature Flag Management

## Platform Comparison

| Platform | Open Source | Pricing | Differentiator |
|---|---|---|---|
| LaunchDarkly | No | Per-seat + MAU | Enterprise-grade, SDKs for everything |
| Unleash | Yes (self-host) | Free tier + enterprise | Open-source, self-hosted option |
| Flagsmith | Yes (self-host) | Free tier + cloud | Open-source, remote config |
| Split.io | No | Per-seat | Strong experimentation built-in |
| ConfigCat | No | Per-config | Simple, lightweight |
| OpenFeature | Yes (spec only) | Free | Vendor-neutral standard |

## Flag Lifecycle

### Stages
```
Draft → Development → Testing → Canary → Rollout → Permanent/Removed
```

### Lifecycle Rules
1. **Draft**: defined in flag system, not yet referenced in code
2. **Development**: code references flag, always evaluates to false in prod
3. **Testing**: enabled in staging/dev environments
4. **Canary**: enabled for 1-5% of prod traffic
5. **Rollout**: gradually increasing percentage
6. **Permanent**: operational/permission flag OR removed (release flags)

### Removal Process
- Flag fully rolled out → wait 1-2 weeks for stability
- Remove code references (dead code path for "off" variant)
- Archive flag in management system
- Automated lint rule: flag older than 90 days without removal = warning

## Targeting Rules

### User-Level Targeting
```json
{
  "flag": "new-checkout",
  "rules": [
    {
      "match": { "email": { "endsWith": "@company.com" } },
      "serve": true
    },
    {
      "match": { "plan": "enterprise" },
      "serve": true
    },
    {
      "match": { "country": { "in": ["US", "CA"] } },
      "percentage": 25
    }
  ],
  "default": false
}
```

### Targeting Strategies
- **Internal first**: enable for company emails before external users
- **Beta cohort**: specific user IDs opted into early access
- **Geographic**: rollout by region to limit blast radius
- **Plan-based**: premium users first (higher tolerance, direct support)
- **Percentage**: random sample for unbiased measurement
- **Device/platform**: mobile vs desktop separate rollouts

### Consistent Hashing
Percentage rollouts must be consistent — same user sees same variant across sessions:
```
hash(user_id + flag_key) % 100 < percentage → enabled
```

## Kill Switches

### Purpose
Instantly disable features that cause production issues without deploying code.

### Implementation Pattern
```typescript
// Kill switch = inverted feature flag
if (featureFlags.isEnabled('payments-v2')) {
  return processPaymentV2(order);
}
// Fallback to known-good path
return processPaymentV1(order);
```

### Kill Switch Checklist
- [ ] Fallback path is tested and maintained
- [ ] Switch can be toggled without deployment
- [ ] Toggle takes effect within seconds (no cache delay)
- [ ] On-call runbook documents when to flip each switch
- [ ] Alerting triggers review of kill switch candidates

### Operational Flags (permanent kill switches)
- Circuit breakers for external service dependencies
- Feature degradation under load (disable non-essential features)
- Maintenance mode (disable writes during migration)

## Architecture Patterns

### Client-Side vs Server-Side Evaluation

| Aspect | Client-side | Server-side |
|---|---|---|
| Latency | Initial load, then instant | Per-request evaluation |
| Targeting data | Limited to client context | Full user profile available |
| Security | Flag values visible | Rules hidden from client |
| Bandwidth | Downloads all flags on init | Only evaluated result sent |

### Recommended Approach
- Server-side for: sensitive features, complex targeting, A/B tests
- Client-side for: UI variations, simple toggles, performance-critical paths
- Edge evaluation for: latency-sensitive with complex rules (CDN workers)

### Caching Strategy
```
Server SDK: poll every 30s OR streaming (SSE/WebSocket) for instant updates
Client SDK: cache locally, refresh on app foreground
Kill switches: streaming always (seconds matter)
```

## Best Practices

### Naming Convention
```
release/new-checkout-flow    (temporary, remove after rollout)
ops/circuit-breaker-payments (permanent, operational)
experiment/pricing-page-v2   (temporary, remove after decision)
permission/enterprise-sso    (permanent, access control)
```

### Code Hygiene
- Never nest flags (`if flagA && flagB` creates combinatorial explosion)
- One code path per flag (true path = new, false path = old)
- Flag evaluation at entry points only (not deep in business logic)
- Unit tests cover both flag states

### Governance
- Flag owner assigned at creation (responsible for lifecycle)
- Maximum active flags per team: 10-15 (prevent sprawl)
- Quarterly cleanup review: remove stale flags
- Audit log: who changed what flag when (compliance)

## Anti-Patterns

- Flags without owners (nobody removes them)
- Flags as permanent configuration (use config service instead)
- Testing only the "on" path (fallback path breaks silently)
- Too many active flags (exponential test combinations)
- Flag state in database (deploy dependency, latency)
- No monitoring of flag evaluation errors
- Percentage rollout without consistent hashing (user flickering)
