---
type: subskill
title: "Versioning Strategies"
---

# Versioning Strategies

## When to Load

Deciding how to version APIs, managing breaking changes, planning migrations, implementing sunset policies, or evolving published contracts.

## Rules

1. Version the entire API surface together  -  never version individual endpoints independently
2. URL path versioning (`/v1/`, `/v2/`) for REST public APIs  -  explicit, cacheable, no client tooling required
3. Header versioning (`API-Version: 2024-01-15`) for partner APIs with controlled client populations
4. Protobuf package versioning (`service.v1`, `service.v2`) for gRPC  -  run both versions simultaneously
5. Date-based versions (`2024-01-15`) for APIs with frequent minor changes (Stripe model)
6. Never remove a version without 6-month minimum sunset window (12 months for public APIs)
7. Sunset header (`Sunset: Sat, 01 Jun 2025 00:00:00 GMT`) on every response from deprecated version
8. New version only when breaking changes accumulate  -  don't version for additive changes
9. Support N-1 versions minimum in production (current + previous)
10. Migration guide published BEFORE sunset countdown begins  -  not after

## Version Strategy Decision

| Context | Strategy | Rationale |
|---------|----------|-----------|
| Public API, diverse clients | URL path `/v1/` | Zero client config, explicit in docs |
| Partner API, managed clients | Header `API-Version` | Cleaner URLs, negotiable |
| Internal microservice | Protobuf package version | Wire-compatible evolution preferred |
| Rapid iteration, SaaS | Date-based (`2024-01-15`) | Fine-grained, Stripe-proven |
| GraphQL | Schema evolution (no versioning) | Deprecate fields, add new ones |

## Breaking vs Non-Breaking Changes

| Change Type | Breaking? | Action |
|-------------|-----------|--------|
| Add optional field to response | No | Ship it |
| Add optional query parameter | No | Ship it |
| Add new endpoint | No | Ship it |
| Add new enum value | ⚠️ Maybe | Breaking if client exhaustively matches |
| Remove field from response | Yes | New version |
| Rename field | Yes | New version |
| Change field type | Yes | New version |
| Add required field to request | Yes | New version |
| Change URL path | Yes | New version |
| Narrow validation (shorter max) | Yes | New version |
| Change error response shape | Yes | New version |

## Sunset Process

1. Announce deprecation (blog, changelog, email to API key owners)
2. Add `Deprecation: true` + `Sunset: <date>` headers to all responses
3. Add `Link: <migration-guide-url>; rel="successor-version"` header
4. Log usage metrics  -  identify remaining consumers, reach out directly
5. 30 days before sunset: return `Warning: 299 - "API version sunset on 2025-06-01"` header
6. On sunset date: return 410 Gone with migration guide link in body
7. After 30 more days: decommission infrastructure

## Anti-Patterns

- Versioning every minor change  -  creates maintenance nightmare
- "V2" with 95% same code duplicated  -  use routing layer, share internals
- No sunset date announced  -  consumers never migrate
- Breaking changes hidden in "minor" version  -  erodes trust
- Maintaining 4+ active versions  -  consolidate or force migration

## Verification

- Breaking change detection automated in CI (`oasdiff breaking`, `buf breaking`)
- Sunset headers present on all deprecated version responses
- Migration guide exists and links to new version equivalents
- Usage telemetry tracks consumers per version
- N-1 version integration tests still passing
