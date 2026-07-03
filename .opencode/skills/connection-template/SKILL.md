---
name: connection-template
description: Template for external service integration skills
trigger: creating integration skill, connecting external service, building API connection
---

# Connection Skill Template

Template for creating a new skill that integrates Zara with an external service (Slack, GitHub, Linear, Notion, any SaaS API).

## Scope

- HANDLES: structure for a new connection skill, required sections, minimal example.
- DEFERS: actual service-specific logic to the skill you create; MCP call masking to `zara-privacy-mcp`.

## First Action

Confirm the target service, auth type (API key / OAuth / token), and primary actions before writing the skill.

## Constraints

1. Frontmatter: name `<service>-connection`, description "Integrate Zara with <Service> for <actions>", trigger on service mention.
2. Include all 6 required sections (below).
3. Document auth via env var, never hardcode credentials.
4. State rate limits and pagination behavior explicitly.

## DO NOT

- Hardcode API keys or tokens in the skill.
- Omit rate-limit or pagination handling.
- Skip the error recovery table.

## Required Sections

1. Authentication - how to connect (API key/OAuth/token), env var, setup.
2. Available Actions - table of what Zara can do.
3. Tool Sequences - step-by-step for common workflows.
4. Parameter Reference - required vs optional params per action.
5. Known Pitfalls - rate limits, auth quirks, gotchas.
6. Error Recovery - common errors + how to handle.

## Minimal Example

```markdown
---
name: <service>-connection
description: Connect Zara to <Service> for <actions>
---
# <Service> Connection
## Auth
- Type: API Key / OAuth / Token · Env var: <SERVICE>_API_KEY · Setup: <steps>
## Actions
| Action | Method | Endpoint | Auth |
|--------|--------|----------|------|
| List items | GET | /api/items | Yes |
## Common Workflows
### Create and assign
1. POST /api/items with { title, assignee }
2. Verify 201, return item URL
## Pitfalls
- Rate limit: 100 req/min, exponential backoff. Pagination: max 100/page, check `has_more`.
## Errors
| Code | Meaning | Recovery |
|------|---------|----------|
| 401 | Token expired | Re-authenticate |
| 429 | Rate limited | Wait + retry |
```

## Verification

- New skill includes all 6 required sections.
- Auth uses env var; no hardcoded secrets.
- Error recovery table present.

## When to Load

User says "connect Zara to [service]" · building a new integration · creating MCP tool wrappers for external APIs.
