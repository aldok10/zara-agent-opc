# Skill Maintenance

Guidelines for keeping skills current, detecting drift, and managing knowledge freshness.

---

## When to Update Skills

### Technology Drift Indicators

| Signal | Action | Priority |
|---|---|---|
| Major version release (framework/language) | Review all examples, update deprecated APIs | High |
| New paradigm emerges (e.g., RSC, server actions) | Add new patterns, keep old for migration | Medium |
| Security advisory on recommended pattern | Immediate update, add pitfall warning | Critical |
| Community consensus shifts (e.g., Zustand over Redux) | Evaluate, update recommendations if warranted | Low |
| Tool sunset/deprecation announced | Add migration path, mark deprecated | Medium |
| Performance characteristics change (new runtime, engine) | Re-benchmark, update guidance | Low |

### Detection Methods

```yaml
automated_checks:
  - npm outdated / cargo outdated (weekly)
  - GitHub release RSS for tracked frameworks
  - Security advisory feeds (GitHub, NVD)
  - Changelog monitoring for breaking changes

manual_review:
  - Quarterly skill audit (all skills)
  - Post-incident review (if skill gave wrong advice)
  - User feedback signals (corrections, overrides)
```

---

## Version Tracking

### Framework/Tool Versions in Skills

Each skill should declare the versions it covers:

```markdown
<!-- In SKILL.md header -->
## Versions
- TypeScript: 5.9+
- Node.js: 24+
- React: 19+
- Next.js: 15+
Last reviewed: 2025-06-15
```

### Version Update Checklist

1. Read the changelog/migration guide for the new version
2. Identify breaking changes that affect skill content
3. Update code examples to use new APIs
4. Remove references to removed/deprecated features
5. Add migration notes if users might have old code
6. Test all code examples compile/run
7. Update the version declaration and review date

---

## Deprecation Patterns

### Graceful Deprecation in Knowledge Files

```markdown
## Connection Pooling

### Current (pg 8.x+)
Pool configuration uses `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`.

### Deprecated (pg < 8.x)
> [DEPRECATED] The `poolSize` parameter was removed in pg 8.0.
> Migration: replace `poolSize: 20` with `max: 20`.
```

### Removal Policy

- Mark deprecated on first detection
- Keep deprecated content for 2 review cycles (6 months)
- Remove after 6 months if no user queries reference it
- Archive removed content in git history (never truly lost)

---

## Self-Audit Cycle

### Quarterly Review Process

```
For each skill:
  1. Check version declarations against current releases
  2. Run code examples (do they still compile/work?)
  3. Check for new best practices in official docs
  4. Review user correction history (memory episodes with outcome: failure)
  5. Cross-reference with security advisories
  6. Score freshness (see metrics below)
  7. Update or flag for update
```

### Audit Scoring

| Score | Meaning | Action |
|---|---|---|
| Fresh (0-3 months since review) | Current | None |
| Aging (3-6 months) | Likely current | Spot-check key sections |
| Stale (6-12 months) | Possibly outdated | Full review needed |
| Expired (12+ months) | Unreliable | Major revision or replacement |

---

## Knowledge Freshness Metrics

### Tracking Schema

```yaml
skill: typescript-expert
last_full_review: 2025-06-15
sections:
  - name: type-patterns
    last_updated: 2025-06-15
    covers_version: "5.9"
    current_version: "5.9"
    freshness: fresh
  - name: node-apis
    last_updated: 2025-03-01
    covers_version: "22"
    current_version: "24"
    freshness: stale
    drift_notes: "Node 24 changed permissions API, added SQLite built-in"
```

### Freshness Calculation

```python
from datetime import datetime, timedelta

def calculate_freshness(last_review: datetime, version_gap: int) -> str:
    age_days = (datetime.now() - last_review).days
    if version_gap >= 2 or age_days > 365:
        return "expired"
    if version_gap >= 1 or age_days > 180:
        return "stale"
    if age_days > 90:
        return "aging"
    return "fresh"
```

### Automated Freshness Monitoring

Set up alerts:
- Weekly: check if any tracked framework released a major version
- Monthly: calculate freshness scores, flag stale/expired
- On user correction: mark affected section for review
- On security advisory: immediate review of affected patterns

---

## Update Workflow

1. Detect drift (automated or manual)
2. Assess impact (breaking change? security issue? minor improvement?)
3. Create task: "Update [skill]/[section] for [framework] v[X]"
4. Research: read official migration guide, changelog, new docs
5. Update: modify knowledge files with new patterns
6. Verify: test code examples
7. Record: update version tracking, set new review date
8. Reflect: log the update as a memory episode for audit trail
