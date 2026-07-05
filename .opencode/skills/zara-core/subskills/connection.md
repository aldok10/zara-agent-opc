---
type: subskill
title: "Connection Template"
---

# Connection Template

Template for building a skill that connects Zara to an external service (Slack, GitHub, Linear, Notion, any SaaS API). Establish context and auth first, then wire the actions.

## First Action

Confirm the target service, auth type (API key / OAuth / token), and primary actions before writing the skill. Load service context: rate limits, pagination model, base URL.

## Frontmatter & Structure

Name `<service>-connection`, description "Integrate Zara with <Service> for <actions>", trigger on service mention. Document auth via env var - never hardcode credentials. State rate limits and pagination explicitly.

## Required Sections (all 6)

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

## DO NOT

- Hardcode API keys or tokens. Omit rate-limit or pagination handling. Skip the error recovery table.
- Route external calls outside the privacy gateway (see `privacy.md`).

## Verification

- New skill has all 6 sections. Auth uses env var; no hardcoded secrets. Error recovery table present.
