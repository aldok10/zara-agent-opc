---
type: subskill
title: "Breaking Changes"
---

# Breaking Changes

Migration guides, deprecation notices, and sunset policies for managing breaking changes responsibly.

## When to Load

- Planning a breaking change in a public API
- Writing migration documentation
- Defining deprecation timelines
- Communicating changes to consumers

## Key Concepts

**Breaking Change** -- Any change that requires consumers to modify their code. Removed endpoints, changed response shapes, renamed fields, altered behavior, authentication changes.

**Deprecation Notice** -- Advance warning before removal. Include: what is deprecated, what replaces it, when it will be removed. Minimum lead time: 1-2 minor versions or a calendar period.

**Migration Guide** -- Step-by-step instructions to move from old to new. Include: before/after code examples, automated codemods if possible, timeline, and support channels.

**Sunset** -- The actual removal. Must follow the announced timeline. Communicate via changelog, API response headers (Sunset, Deprecation), email, and status pages.

## Patterns

```markdown
# Migration Guide: v1 to v2

## Timeline
- v1.9.0 (2024-01): Deprecation warnings added
- v2.0.0 (2024-04): Breaking changes applied
- v1.x EOL (2024-07): No more security patches

## Authentication: API Keys to OAuth 2.0

### Before (v1)
```
curl -H "X-API-Key: sk_live_xxx" https://api.example.com/users
```

### After (v2)
```
curl -H "Authorization: Bearer <access_token>" https://api.example.com/users
```

### Steps
1. Register an OAuth application at dashboard.example.com/apps
2. Implement client_credentials flow to obtain access tokens
3. Replace X-API-Key header with Authorization: Bearer
4. Test with the v2 sandbox environment
5. Remove API key from your secrets manager

## Response Envelope Change

| Field | v1 | v2 |
|-------|----|----|
| Data wrapper | `result` | `data` |
| Pagination | `meta.page` | `pagination.cursor` |

### Codemod (optional)
```bash
npx @example/v2-codemod --path ./src
```
```

```http
// Deprecation headers in API responses
HTTP/1.1 200 OK
Deprecation: Sun, 01 Jan 2024 00:00:00 GMT
Sunset: Mon, 01 Apr 2024 00:00:00 GMT
Link: <https://docs.example.com/migration>; rel="deprecation"
```

## Gotchas

- Breaking changes without deprecation period destroy trust -- always give advance notice
- "Technically not breaking" changes (adding required fields, changing defaults) still break consumers
- Codemods that are 90% accurate cause more confusion than manual migration
- Sunset dates that slip repeatedly train consumers to ignore your announcements
- API versioning via URL (/v1, /v2) is simpler to communicate than header-based versioning

## Verification

- Deprecation notices include: what, why, replacement, and timeline
- Migration guide has runnable before/after examples
- Sunset headers appear in responses for deprecated endpoints
- Consumer-facing changelog clearly marks BREAKING entries
- Support channels are staffed during migration window
