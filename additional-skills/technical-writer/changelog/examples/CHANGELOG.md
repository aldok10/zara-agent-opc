---
type: example
title: "Changelog"
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Webhook retry configuration with exponential backoff settings
- Bulk task import endpoint (`POST /tasks/import`)

### Fixed
- Rate limit headers missing on 204 No Content responses

## [2.1.0] - 2026-06-20

### Added
- Task dependency tracking -- tasks can now block and be blocked by other tasks
- CSV export for task lists with configurable column selection
- `due_before` and `due_after` query parameters on `GET /tasks`

### Changed
- Default page size increased from 10 to 20 items
- Error responses now include `request_id` field for support correlation

### Fixed
- Cursor pagination returning duplicate results when tasks are reordered during traversal
- Webhook delivery retrying indefinitely on 410 Gone responses (now stops after first 410)

## [2.0.0] - 2026-04-01

### Breaking Changes
- Removed `GET /v1/tasks` endpoint. Use `GET /v2/tasks` with cursor pagination.
  Migration: replace `?page=N&per_page=M` with `?limit=M&cursor=<value>`
- Authentication now requires `X-Client-ID` header alongside Bearer token.
  Migration: register your application at the developer portal to obtain a client ID.
- Error response format changed from `{"error": "message"}` to RFC 9457 Problem Details.
  Migration: parse `type`, `title`, `status`, `detail` fields instead of `error` string.

### Added
- RFC 9457 Problem Details error format with machine-readable `type` URIs
- Cursor-based pagination replacing offset pagination
- `X-Request-ID` header on all responses for support troubleshooting
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)

### Removed
- `GET /v1/tasks` -- replaced by `GET /v2/tasks` (deprecated since v1.8.0)
- `page` and `per_page` query parameters -- replaced by `cursor` and `limit`

### Security
- Fixed IDOR vulnerability allowing users to view tasks in other organizations (CVE-2026-1234)

## [1.9.1] - 2026-03-10

### Fixed
- Task creation returning 500 when `labels` array contains more than 10 items (now returns 400 with validation error)
- Webhook signature verification failing for payloads larger than 1MB

### Security
- Updated jwt-decode dependency to patch prototype pollution vulnerability (CVE-2026-0987)

## [1.9.0] - 2026-02-15

### Added
- Webhook event filtering -- subscribe to specific event types per webhook endpoint
- Task labels (up to 10 per task) with label-based filtering on list endpoint

### Deprecated
- `GET /v1/tasks` endpoint -- use `GET /v2/tasks` instead (removal in v2.0.0)
- `page`/`per_page` pagination parameters -- cursor pagination coming in v2.0.0

## [1.8.0] - 2026-01-20

### Added
- Task assignment (`assignee_id` field) with assignment notification events
- `PATCH /tasks/{id}` for partial updates (previously only `PUT` for full replacement)

### Changed
- Task `status` field now allows `cancelled` in addition to `open`, `in_progress`, `done`

### Fixed
- `due_at` field accepting past dates on task creation (now returns 400)

[Unreleased]: https://github.com/example/task-api/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/example/task-api/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/example/task-api/compare/v1.9.1...v2.0.0
[1.9.1]: https://github.com/example/task-api/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/example/task-api/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/example/task-api/releases/tag/v1.8.0
