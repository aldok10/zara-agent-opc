---
type: fact
title: "Information Architecture for Documentation"
---

# Information Architecture for Documentation

Structuring technical documentation for findability, usability, and maintainability.

## Diataxis Framework

Four modes of documentation, each serving a different user need:

### The Four Quadrants

| Type | User Need | Orientation | Example |
|------|-----------|-------------|---------|
| Tutorial | Learning | Practical (doing) | "Build your first API" |
| How-to Guide | Accomplishing a task | Practical (doing) | "How to configure SSO" |
| Reference | Looking up information | Theoretical (knowing) | "API endpoint reference" |
| Explanation | Understanding concepts | Theoretical (knowing) | "How authentication works" |

### Tutorial

- Learning-oriented: takes the reader on a journey
- Structured as a series of steps the reader follows
- Guarantees success if followed correctly
- Minimal explanation  -  just enough to proceed
- Never assumes prior knowledge

### How-to Guide

- Task-oriented: solves a specific problem
- Assumes competence (reader knows the basics)
- Focuses on achieving a goal, not learning
- Multiple paths for different scenarios
- Names the problem in the title ("How to migrate from v2 to v3")

### Reference

- Information-oriented: describes the machinery
- Structured consistently (every endpoint, every parameter)
- Accurate and complete (generated from code when possible)
- No tutorials or opinions  -  just facts
- Organized by structure of the codebase/API, not by user tasks

### Explanation

- Understanding-oriented: provides context and reasoning
- Discusses alternatives, trade-offs, design decisions
- Connects concepts to broader context
- Not tied to specific tasks or steps
- Useful for "why" questions

## Navigation Patterns

### Hierarchy Design

```
docs/
├── getting-started/        # Tutorials (onboarding)
│   ├── quickstart.md
│   └── first-project.md
├── guides/                 # How-to guides (task-based)
│   ├── authentication.md
│   ├── deployment.md
│   └── migration-v3.md
├── reference/              # Reference (structured)
│   ├── api/
│   ├── configuration/
│   └── cli/
├── concepts/               # Explanation (understanding)
│   ├── architecture.md
│   └── security-model.md
└── changelog.md
```

### Navigation Principles

- Max 3 levels deep in sidebar (deeper = lost users)
- Group by user task, not by internal code structure
- Progressive disclosure: show overview first, detail on demand
- Every page reachable within 3 clicks from home
- Consistent naming: match terms users actually search for

## Search Optimization

### How Users Search Documentation

| Pattern | Example | Strategy |
|---------|---------|----------|
| Exact term | "rate limit" | Use exact terminology in headings |
| Error message | "ECONNREFUSED" | Include common error strings |
| Task phrasing | "how to deploy" | Match how-to guide titles |
| Concept | "authentication flow" | Explanation pages with clear titles |

### Improving Search Results

- Front-load key terms in headings and first paragraphs
- Add metadata/tags for synonyms (deploy, ship, release)
- Include exact error messages in troubleshooting pages
- Use consistent terminology (pick one term, use it everywhere)
- Short, descriptive page titles (not "Overview" or "Introduction")

## Versioning Documentation

### When to Version

- Breaking API changes between major versions
- Multiple supported versions running simultaneously
- Users cannot always upgrade immediately

### Strategies

| Strategy | Tool Support | Trade-off |
|----------|-------------|-----------|
| URL prefix (`/v2/docs/...`) | Docusaurus, ReadMe | Clear but duplicates content |
| Version selector dropdown | Most doc platforms | User picks version, content switches |
| Inline annotations | None (manual) | Minimal, but confusing for multiple versions |
| Separate sites | Any | Complete isolation, expensive to maintain |

### Best Practices

- Default to latest stable version
- Show clear "you're viewing docs for v2" banner on old versions
- Link migration guides prominently from version selectors
- Sunset old versions: archive (read-only) after support window ends
- Share content across versions where behavior is identical (DRY via includes)

## Content Types and Templates

### Standard Page Template

```markdown
# [Action Verb] + [Object]  (e.g., "Configure Rate Limiting")

Brief description of what this page covers and who it's for.

## Prerequisites
- What the reader needs before starting

## Steps / Content
- The actual information

## Next Steps
- Where to go after this page

## Related
- Links to related guides, reference, or concepts
```

### Cross-References

- Link from tutorials → relevant reference (for readers who want detail)
- Link from reference → relevant how-to guides (for readers who want context)
- Link from explanations → how-to guides (for readers ready to act)
- Never link forward in tutorials (keep reader on the path)

## Maintenance Patterns

### Ownership Model

| Model | Works When | Risk |
|-------|-----------|------|
| Distributed (team owns their docs) | Strong writing culture | Inconsistency, staleness |
| Centralized (tech writers own all) | Dedicated writing team | Bottleneck, context loss |
| Hybrid (teams write, writers review) | Medium-large organizations | Process overhead |

### Freshness Signals

- Last-reviewed date in frontmatter (visible to readers)
- Automated stale-page detection (no edits in N months)
- Link checker in CI (catch broken references)
- Analytics: pages with zero traffic may be candidates for removal

### Content Lifecycle

1. **Create**: written when feature ships, reviewed before publish
2. **Maintain**: updated when feature changes, reviewed on schedule
3. **Deprecate**: marked with banner, redirected to successor
4. **Archive**: removed from navigation, still accessible via direct URL

## Measuring Documentation Quality

### Quantitative Metrics

| Metric | Meaning | Tool |
|--------|---------|------|
| Page views | Popularity / findability | Analytics |
| Time on page | Engagement (or confusion) | Analytics |
| Search → result click | Search effectiveness | Site search analytics |
| Support tickets per topic | Doc gaps | Support system |
| Bounce rate from search | Content didn't match query | Analytics |

### Qualitative Signals

- "Was this page helpful?" feedback widget (simple yes/no + optional comment)
- Support team tagging tickets with "docs-gap" label
- Developer survey: "How easy is it to find information?" (quarterly)
- New-hire onboarding feedback (fresh eyes catch stale assumptions)

## Anti-Patterns

- Organizing docs by internal team structure (users don't know your org chart)
- Single massive page instead of focused pages (overwhelming, poor search)
- "Overview" pages with no actionable content (filler that delays the reader)
- Versioned docs without version selector (readers land on wrong version)
- Writing only reference docs (users need tutorials and guides too)
- No ownership model (everyone's responsibility = nobody's responsibility)
