# Incident Playbook

Step-by-step framework for handling production incidents from detection to resolution.

## Incident Lifecycle

```
Detection -> Triage -> Mitigation -> Resolution -> Post-Incident
```

### Phase 1: Detection (0-5 minutes)

**Goal:** Confirm the incident is real and assess initial impact.

Steps:
1. Acknowledge the alert (stops escalation timer)
2. Open the linked dashboard -- is the metric actually breaching threshold?
3. Check if there are related alerts firing simultaneously
4. Open the incident channel (automated or manual)
5. Declare initial severity based on impact assessment

**Severity classification:**

| Severity | Criteria | Response time |
|----------|----------|---------------|
| P1 | Customer-facing outage, data loss risk | Immediate, all hands |
| P2 | Degraded performance, partial outage | 15 minutes, primary on-call |
| P3 | Internal impact only, no customer effect | 1 hour, next business day OK |

### Phase 2: Triage (5-15 minutes)

**Goal:** Identify the affected component and likely root cause category.

Steps:
1. Identify affected service(s) from alert metadata
2. Check recent deployments (last 2 hours) for the affected service
3. Check for upstream/downstream dependency failures
4. Check for infrastructure events (cloud provider status, network changes)
5. Assign root cause category:
   - **Deploy-related** -- recent code/config change
   - **Load-related** -- traffic spike, resource exhaustion
   - **Dependency-related** -- external service failure
   - **Data-related** -- corruption, migration issue
   - **Infrastructure-related** -- hardware, network, cloud provider

### Phase 3: Mitigation (15-60 minutes)

**Goal:** Restore service for customers. Root cause analysis comes later.

Priority order for mitigation:
1. **Rollback** -- if deploy-related, revert immediately
2. **Scale** -- if load-related, add capacity
3. **Failover** -- if dependency-related, switch to backup
4. **Isolate** -- if data-related, stop writes to affected partition
5. **Circuit break** -- if cascading, cut the failing dependency

Each mitigation action:
- Execute the action
- Wait for metric recovery (define timeout: 5 minutes typical)
- If no improvement, revert the mitigation and try next option
- If improvement, continue monitoring for 15 minutes

### Phase 4: Resolution (ongoing)

**Goal:** Confirm the incident is fully resolved.

Checklist:
- [ ] All metrics returned to normal baseline
- [ ] Alert has cleared (not been silenced)
- [ ] Spot-check customer-facing flows manually
- [ ] No error spikes in logs for last 15 minutes
- [ ] Dependent services recovered
- [ ] Temporary mitigations documented for proper fix

### Phase 5: Post-Incident (within 48 hours)

**Goal:** Learn from the incident and prevent recurrence.

Steps:
1. Create retrospective document from template
2. Build timeline from chat history and alert data
3. Identify contributing factors (not root cause -- incidents are multi-causal)
4. Propose action items with owners and due dates
5. Conduct blameless review meeting
6. Update runbooks with any corrections
7. Close incident with summary in the channel

## Communication During Incidents

### Status Update Cadence

| Severity | Internal update | External update |
|----------|----------------|-----------------|
| P1 | Every 15 minutes | Every 30 minutes |
| P2 | Every 30 minutes | Every 60 minutes |
| P3 | At resolution | Not required |

### Communication Templates

**Initial notification (internal):**
```
INCIDENT: [Service] - [Brief description]
Severity: P[1/2/3]
Impact: [What customers experience]
Status: Investigating
Responder: @[name]
Channel: #incident-YYYY-MM-DD-[name]
```

**Status page update:**
```
[Component]: [Investigating/Identified/Monitoring/Resolved]
We are aware of [impact description]. Our team is actively working
on resolution. Next update in [time].
```

**All-clear:**
```
RESOLVED: [Service] - [Brief description]
Duration: [start] to [end] ([total minutes])
Impact: [summary of customer impact]
Root cause: [one sentence]
Retrospective: [link] (scheduled for [date])
```

## Roles During Incidents

| Role | Responsibility |
|------|---------------|
| Incident Commander (IC) | Coordinates response, makes decisions, delegates |
| Technical Lead | Drives diagnosis and mitigation |
| Communications Lead | Updates status page, stakeholders, customers |
| Scribe | Records timeline, decisions, actions |

For P3: one person handles all roles.
For P2: IC + Technical Lead (same person OK).
For P1: all four roles filled by different people.

## Common Mitigation Patterns

| Pattern | When to use | Command pattern |
|---------|-------------|-----------------|
| Rollback deploy | After recent change | `deploy rollback ${SERVICE} ${PREVIOUS_VERSION}` |
| Scale horizontally | CPU/memory saturation | `scale ${SERVICE} --replicas=${N}` |
| Toggle feature flag | New feature causing issues | `flag disable ${FLAG_NAME}` |
| Circuit breaker | Dependency cascading | `circuit-break ${DEPENDENCY} --duration=5m` |
| Traffic shift | Regional failure | `route traffic --from=${REGION_A} --to=${REGION_B}` |
| Cache bypass | Stale/corrupted cache | `cache invalidate ${KEY_PATTERN}` |
