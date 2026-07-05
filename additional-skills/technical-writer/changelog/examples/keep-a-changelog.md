---
type: example
title: "Keep a Changelog Format"
---

# Keep a Changelog Format Example

## Context
When maintaining a human-readable changelog that helps users understand what changed between versions. Follows the keepachangelog.com convention. Write for users (what they care about), not developers (implementation details).

## Code/Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Support for webhook event filtering by type (closes #342)
- `--dry-run` flag to CLI deploy command

### Fixed
- Dashboard loading spinner stuck when API returns empty dataset

## [2.4.0] - 2024-03-15

### Added
- Team-based access controls for project resources
- Export dashboard data to CSV format
- Dark mode support across all pages
- Rate limit headers in API responses (`X-RateLimit-Remaining`, `X-RateLimit-Reset`)

### Changed
- Upgraded authentication to use PKCE flow (affects OAuth integrations)
- Minimum password length increased from 8 to 12 characters
- API pagination now defaults to 50 items (previously 20)

### Deprecated
- `GET /api/v1/users/search` - use `GET /api/v2/users?q=` instead (removal in v3.0)
- `webhook_url` field in project settings - migrate to Webhook Endpoints page

### Fixed
- PDF export truncating tables wider than 3 columns
- Timezone offset not applied to scheduled reports
- Memory leak in WebSocket connection handler after 10k+ messages

### Security
- Patched XSS vulnerability in markdown preview (reported by @researcher, CVE-2024-1234)
- API keys now hashed at rest (existing keys automatically migrated)

## [2.3.1] - 2024-02-28

### Fixed
- Critical: Login failing for users with `+` in email address
- Billing page showing incorrect currency for EUR accounts

## [2.3.0] - 2024-02-15

### Added
- Audit log for all admin actions with 90-day retention
- Two-factor authentication via TOTP (Google Authenticator, Authy)
- Bulk import users from CSV

### Changed
- Node.js runtime upgraded from 18 to 20 LTS
- Docker image base changed from Debian to Alpine (60% smaller)

### Removed
- Legacy v1 API endpoints (deprecated since v2.0.0)
- Internet Explorer 11 support

## [2.2.0] - 2024-01-20

### Added
- Webhook retry with exponential backoff (max 5 attempts)
- Custom fields on user profiles

### Fixed
- Search indexing delay reduced from 30s to under 2s
- File upload failing for names containing unicode characters

[Unreleased]: https://github.com/org/project/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/org/project/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/org/project/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/org/project/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/org/project/releases/tag/v2.2.0
```

### Category Definitions

| Category | When to use |
|----------|-------------|
| **Added** | New features visible to users |
| **Changed** | Changes to existing functionality |
| **Deprecated** | Features being removed in future (include migration path) |
| **Removed** | Features removed in this release |
| **Fixed** | Bug fixes |
| **Security** | Vulnerability patches (include CVE if available) |

## Key Points
- Write entries from the user's perspective ("PDF export truncating tables") not the developer's ("fixed overflow in PdfRenderer.renderTable()")
- Always include compare links at the bottom so users can see the full diff between versions
- Put security fixes in their own section with CVE references; users scanning for patches need to find them quickly
