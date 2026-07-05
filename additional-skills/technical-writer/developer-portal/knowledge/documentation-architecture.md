---
type: fact
title: "Documentation Architecture"
---

# Documentation Architecture

Information architecture patterns for developer portals and documentation sites.

## Navigation Structure

### Top-Level Categories

Standard developer portal navigation:

```
Home / Quickstart
  Getting Started (one page, 5-minute path)

Guides
  Authentication
  Pagination
  Error Handling
  Webhooks
  Rate Limits

API Reference
  Endpoints (auto-generated from spec)
  Schemas
  Error Codes

SDKs
  JavaScript
  Python
  Go
  (per-language: install, quickstart, reference)

Changelog
  Latest release
  Migration guides

Support
  Status page
  FAQ
  Contact
```

### Navigation Depth Rule

Maximum 3 levels of nesting. If a section needs deeper hierarchy, split into a separate guide.

```
Good: Guides > Authentication > OAuth2 Setup
Bad:  Guides > Authentication > OAuth2 > Authorization Code > PKCE > Mobile
```

The deep version becomes: "Guides > Mobile OAuth2 Setup" (flat with descriptive title).

## Content Types and Templates

### Landing Page

Purpose: orient the developer and route them to the right content.

Structure:
1. One-sentence description of what the API does
2. "Get Started" CTA (links to quickstart)
3. Three most common use cases with links
4. Quick code example (simplest possible request)

### Quickstart Page

Purpose: first successful API call.

Structure:
1. Prerequisites (language, tools needed)
2. Install SDK (one command)
3. Get credentials (link to dashboard or use sandbox key)
4. Make first request (copy-paste code block)
5. Understand the response
6. "What's next?" links

### Guide Page

Purpose: teach how to accomplish a specific task.

Structure:
1. Brief context (what and why -- 1-2 sentences)
2. Prerequisites
3. Step-by-step instructions
4. Complete code example
5. Common gotchas / troubleshooting
6. Related guides

### Reference Page

Purpose: complete technical detail for one endpoint or resource.

Structure:
1. Endpoint signature: `GET /tasks/{task_id}`
2. Description (what it does, when to use it)
3. Authentication requirements
4. Parameters (table with name, type, required, description)
5. Request body schema (if applicable)
6. Response codes and schemas
7. Code examples (3+ languages)
8. Rate limit information

## URL Structure

Predictable, stable URLs:

```
/docs/                        # Landing page
/docs/quickstart              # Getting started
/docs/guides/{topic}          # Guides by topic
/docs/api/{resource}          # API reference by resource
/docs/api/{resource}/{action} # Specific endpoint
/docs/sdks/{language}         # SDK documentation
/docs/changelog               # Changelog
```

Rules:
- Lowercase, hyphenated slugs: `/docs/guides/error-handling`
- No version in URL path for "latest" (use `/docs/v1/` only for old versions)
- Never change URLs without 301 redirect and redirect map
- No file extensions in URLs

## Versioning Strategy

| Approach | When to use |
|----------|-------------|
| URL-based (`/docs/v2/`) | Major breaking changes with long migration period |
| Banner + selector | Minor version differences, same content structure |
| Single version + changelog | API rarely breaks, most users on latest |

Default: single version with a version selector for previous majors.

## Content Relationships

### Cross-Linking Pattern

Every page links to:
- The next logical step ("Now set up webhooks")
- The prerequisite ("First, complete authentication")
- The deeper reference (quickstart links to full API reference)
- Related concepts (pagination links to filtering)

### Breadcrumbs

Always show: `Home > Section > Current Page`

### Sidebar

- Current section expanded
- Other sections collapsed
- Active page highlighted
- "On this page" table of contents for long pages

## Search Implementation

Requirements for documentation search:
1. Indexes all content including code blocks
2. Returns highlighted snippets showing match context
3. Filters by content type (guides, reference, changelog)
4. Handles common misspellings and synonyms
5. Shows "did you mean?" for zero-result queries
6. Tracks popular queries and "no results" queries for gap analysis

## Mobile Considerations

Developers read docs on phones (debugging, on-call):
- Responsive layout with readable font sizes
- Code blocks horizontally scrollable (not wrapped)
- Collapsible sections for long parameter lists
- Touch-friendly navigation and code copy buttons
- Skip unnecessary images on narrow viewports
