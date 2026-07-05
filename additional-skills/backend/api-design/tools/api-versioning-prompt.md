---
type: tool
title: "API Versioning Strategy"
---

# API Versioning Strategy

## Purpose

Design a versioning strategy for APIs that balances backward compatibility, consumer migration effort, and operational complexity. Covers URL path, header, and content-type approaches with deprecation planning.

## When to Use

- Starting a new API that will evolve over time
- Introducing a breaking change to an existing API
- Planning deprecation and sunset of old API versions
- Evaluating trade-offs between versioning schemes
- Setting up migration paths for API consumers

## Prompt Template

```
CONTEXT:
- API style: [REST | gRPC | GraphQL]
- Current version scheme: [none | URL path /v1 | header | content-type]
- Consumer types: [internal services | public third-party | mobile apps | mixed]
- Number of active consumers: [approximate]
- Breaking change type: [field removal | type change | endpoint restructure | auth change]
- Deployment model: [single deployment | blue-green | canary | multi-region]

EVALUATE STRATEGIES:
1. URL path (/v1, /v2): explicit, cacheable, simple routing
2. Custom header (API-Version: 2): cleaner URLs, harder to test in browser
3. Content-type (Accept: application/vnd.api+json;version=2): REST-pure, complex
4. Query param (?version=2): easy testing, pollutes cache keys

DESIGN:
1. Version granularity: [per-API | per-resource | per-field]
2. Compatibility rules: additive-only within major, semver for contracts
3. Deprecation timeline: announcement -> sunset header -> removal
4. Migration support: dual-write period, response transformation layer
5. Discovery: version listing endpoint, documentation strategy
6. Default version policy: latest | oldest-supported | explicit-required
7. Sunset headers: Sunset HTTP header, Deprecation header (RFC 8594)

CONSTRAINTS:
- Maximum concurrent supported versions: [2-3 recommended]
- Consumer notification channels: [changelog | webhook | email]
- Breaking change approval process: [who decides, lead time]
```

## Output Format

```
## Versioning Strategy: [API name]

### Recommended Approach
[Strategy choice with rationale]

### Version Lifecycle
| Phase | Duration | Actions | Consumer Impact |
|-------|----------|---------|-----------------|
| Active | ... | ... | ... |
| Deprecated | ... | ... | ... |
| Sunset | ... | ... | ... |

### Migration Plan
1. [Step with timeline]
2. ...

### Implementation Notes
- Routing: [how requests are routed to version handlers]
- Compatibility layer: [transformation/adapter approach]
- Monitoring: [version usage metrics to track migration progress]

### Risks
- [Risk and mitigation]
```
