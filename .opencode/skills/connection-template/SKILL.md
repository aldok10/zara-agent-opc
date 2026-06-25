---
name: connection-template
description: Template for creating external service integration skills. Load when building a new connection skill for Slack, GitHub, Linear, Notion, or any SaaS API.
trigger: creating integration skill, connecting external service, building API connection
---

# Connection Skill Template

Use this template when creating a new skill that integrates Zara with an external service.

## Skill Structure

Each connection skill should follow this format:

### Frontmatter
- name: <service>-connection (e.g., slack-connection)
- description: Integrate Zara with <Service> for <primary actions>
- trigger: when user mentions <service> or needs <actions>

### Sections Required

1. **Authentication** — How to connect (API key, OAuth, token)
2. **Available Actions** — Table of what Zara can do
3. **Tool Sequences** — Step-by-step for common workflows
4. **Parameter Reference** — Required vs optional params per action
5. **Known Pitfalls** — Rate limits, auth quirks, gotchas
6. **Error Recovery** — Common errors + how to handle

## Example: Minimal Connection Skill

```
---
name: <service>-connection
description: Connect Zara to <Service> for <actions>
---

# <Service> Connection

## Auth
- Type: API Key / OAuth / Token
- Env var: <SERVICE>_API_KEY
- Setup: <instructions>

## Actions

| Action | Method | Endpoint | Auth Required |
|--------|--------|----------|---------------|
| List items | GET | /api/items | Yes |
| Create item | POST | /api/items | Yes |

## Common Workflows

### Create and assign
1. POST /api/items with { title, assignee }
2. Verify 201 response
3. Return item URL

## Pitfalls
- Rate limit: 100 req/min. Use exponential backoff.
- Pagination: max 100 items per page. Always check `has_more`.

## Errors
| Code | Meaning | Recovery |
|------|---------|----------|
| 401 | Token expired | Re-authenticate |
| 429 | Rate limited | Wait + retry |
```

## When to Load This Skill

- User says "connect Zara to [service]"
- User wants to build a new integration
- Creating MCP tool wrappers for external APIs
