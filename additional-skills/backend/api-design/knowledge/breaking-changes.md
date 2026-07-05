# Breaking Changes

## What Constitutes a Breaking Change

### Always Breaking

| Change | Why |
|--------|-----|
| Remove field from response | Clients reading it will break |
| Rename field | Wire name change = removal + addition |
| Change field type (`string` → `integer`) | Deserialization fails |
| Add required field to request | Existing clients don't send it |
| Remove endpoint | Clients calling it get 404 |
| Change URL path | Same as removal |
| Narrow enum (remove value) | Clients sending removed value get rejected |
| Change authentication scheme | Existing credentials stop working |
| Reduce rate limits | Working clients start getting 429 |
| Tighten validation (shorter maxLength) | Previously-valid requests rejected |

### Never Breaking (Additive)

| Change | Why |
|--------|-----|
| Add optional field to response | Clients ignore unknown fields |
| Add optional query parameter | Clients don't send it, default applies |
| Add new endpoint | No existing client uses it |
| Widen enum (add value) | Existing values still work |
| Increase rate limits | More permissive |
| Relax validation (longer maxLength) | Previously-valid still valid |
| Add new HTTP method to resource | Existing methods unchanged |

### Conditionally Breaking

| Change | Breaking When |
|--------|--------------|
| Add enum value to response | Client does exhaustive switch/match |
| Change default value | Client relies on implicit default |
| Change error response format | Client parses error bodies |
| Add pagination to previously-unpaginated endpoint | Client expects full list |

## Detection Strategies

### Automated (CI)

| Tool | Protocol | Command |
|------|----------|---------|
| oasdiff | OpenAPI | `oasdiff breaking base.yaml head.yaml` |
| buf | Protobuf | `buf breaking --against .git#branch=main` |
| graphql-inspector | GraphQL | `graphql-inspector diff old.graphql new.graphql` |

### Manual Checklist

1. Diff the spec file  -  any removed/renamed/retyped fields?
2. Check request schemas  -  any new required fields?
3. Check enums  -  any removed values?
4. Check URL paths  -  any renamed/removed?
5. Check auth  -  any scheme changes?
6. Run contract tests against old client expectations

## Sunset Headers

```http
Sunset: Sat, 01 Jun 2025 00:00:00 GMT
Deprecation: true
Link: <https://api.example.com/v2/docs>; rel="successor-version"
Warning: 299 - "This API version will be removed on 2025-06-01. Migrate to v2."
```

## Sunset Timeline

| Phase | Duration | Action |
|-------|----------|--------|
| Announce | Day 0 | Blog post, email, changelog |
| Deprecation headers | Day 0+ | Add headers to all responses |
| Usage monitoring | Ongoing | Track consumers, reach out |
| Warning escalation | T-30 days | Add Warning header |
| Hard sunset | T+0 | Return 410 Gone |
| Decommission | T+30 days | Remove infrastructure |

Minimum windows: Internal APIs 3 months, Partner APIs 6 months, Public APIs 12 months.
