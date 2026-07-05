# Terminology List

Consistent terminology for the Task Management Platform documentation.

## Usage Rules

- Use the **Preferred Term** in all documentation
- Never use **Rejected Variants** -- Vale linter will flag them
- **Context** indicates where the term appears most

## Terms

| Preferred Term | Rejected Variants | Definition | Context |
|---------------|-------------------|------------|---------|
| API key | api-key, API Key, apikey | Authentication credential for API access | Auth docs |
| task | ticket, item, issue | A unit of work tracked in the system | Core domain |
| project | workspace, space, folder | A container for organizing related tasks | Core domain |
| endpoint | route, path, URL | A specific API operation (verb + path) | API reference |
| request body | payload, body, request data | JSON content sent with POST/PATCH/PUT | API reference |
| response | result, output, return value | Data returned from an API call | API reference |
| pagination | paging, page navigation | Iterating through large result sets | API reference |
| cursor | page token, continuation token | Opaque string for fetching next page | API reference |
| webhook | callback, hook, notification URL | HTTP endpoint receiving event notifications | Integration docs |
| SDK | client library, library, package | Language-specific API client | SDK docs |
| rate limit | throttle, quota, rate cap | Maximum requests allowed per time window | API reference |
| status code | HTTP code, response code | Numeric code indicating request result | API reference |
| authentication | auth, login, sign-in | Verifying identity to access the API | Auth docs |
| authorization | permissions, access control | Verifying permission for a specific action | Auth docs |
| sandbox | test environment, staging | Non-production environment for development | Getting started |
| breaking change | incompatible change, BC | Change requiring caller modification | Changelog |
| deprecated | legacy, old, obsolete | Scheduled for removal in future version | API reference |
| idempotent | safe to retry | Repeated calls produce same result | API reference |

## Abbreviations

| Abbreviation | Full Form | Usage Rule |
|-------------|-----------|-----------|
| API | Application Programming Interface | Use abbreviation always (well-known) |
| SDK | Software Development Kit | Use abbreviation always (well-known) |
| REST | Representational State Transfer | Use abbreviation always |
| HTTP | Hypertext Transfer Protocol | Use abbreviation always |
| JSON | JavaScript Object Notation | Use abbreviation always |
| JWT | JSON Web Token | Spell out on first use per page |
| OAuth | Open Authorization | Use abbreviation always |
| CRUD | Create, Read, Update, Delete | Spell out on first use per page |
| SLA | Service Level Agreement | Spell out on first use per page |
| SLO | Service Level Objective | Spell out on first use per page |
| TTL | Time to Live | Spell out on first use per page |

## Product Names

| Name | Variants to Avoid | Notes |
|------|-------------------|-------|
| Task API | Tasks API, task api, TaskAPI | Always capitalize "Task API" |
| Developer Dashboard | dev dashboard, admin panel | Full name in prose |
| Event Bus | event queue, message bus | Our specific implementation |

## Code Formatting

| Element | Format | Example |
|---------|--------|---------|
| API endpoint | backtick code | `GET /tasks/{task_id}` |
| Parameter name | backtick code | `cursor` |
| HTTP method | uppercase in code | `POST` |
| HTTP status code | numeric + name | 404 Not Found |
| JSON field | backtick code | `created_at` |
| Header name | backtick code | `Authorization` |
| Environment variable | backtick code, all caps | `API_KEY` |
| File path | backtick code | `~/.config/taskapi/credentials.json` |
| CLI command | code block with bash | ```bash\ntask list --status=open\n``` |
