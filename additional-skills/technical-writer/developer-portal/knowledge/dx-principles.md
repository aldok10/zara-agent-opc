---
type: fact
title: "Developer Experience Principles"
---

# Developer Experience Principles

Core principles for designing developer portals that minimize friction and maximize productivity.

## The 5-Minute Rule

A developer should be able to go from "I have never seen this API" to "I made my first successful request" in under 5 minutes. Every design decision in the portal should be evaluated against this metric.

Measure time-to-first-call:
1. Start timer when developer lands on docs homepage
2. Stop timer when they receive a successful API response
3. Target: under 5 minutes for the primary use case

## Progressive Disclosure

Layer information by expertise level:

```
Level 1: Quickstart (everyone starts here)
  - Install SDK
  - Get credentials
  - Make first request
  - See result

Level 2: Tutorials (guided learning)
  - Common use cases end-to-end
  - Building a real thing (not toy examples)
  - Error handling patterns

Level 3: Guides (task-oriented reference)
  - How to paginate
  - How to handle webhooks
  - How to authenticate with OAuth2

Level 4: Reference (complete technical detail)
  - Every endpoint, every parameter
  - Schema definitions
  - SDK API reference

Level 5: Advanced (power users)
  - Performance optimization
  - Batch operations
  - Custom integrations
```

Never front-load Level 4-5 content. Developers discover depth as they need it.

## Onboarding Flow Design

### Zero-Friction Principles

1. No sign-up required to read documentation
2. Sandbox/test credentials available without approval
3. First code example runs with copy-paste (no setup beyond install)
4. Authentication is one step, not five
5. Error messages link to documentation

### Onboarding Stages

| Stage | Goal | Portal support |
|-------|------|----------------|
| Discovery | "Can this API do what I need?" | Clear use cases, feature matrix |
| Evaluation | "How hard is it to integrate?" | Quickstart, try-it playground |
| Integration | "How do I build my feature?" | Tutorials, code examples, SDKs |
| Production | "How do I operate this at scale?" | Rate limits, best practices, SLOs |
| Mastery | "How do I optimize?" | Advanced guides, community, changelog |

### Friction Points to Eliminate

- Account creation before seeing any docs
- Email verification before getting API keys
- Complex OAuth flows for sandbox access (use static test keys)
- SDKs that require >3 lines to initialize
- Examples that require external services to run

## Content Types

| Type | Purpose | Format |
|------|---------|--------|
| Quickstart | First successful call | Numbered steps with copy-paste code |
| Tutorial | Build something real | Narrative + code, progressive complexity |
| How-to guide | Accomplish specific task | Prerequisites + steps + verification |
| Reference | Complete API detail | Generated from spec + examples |
| Conceptual | Explain architecture/design | Prose + diagrams |
| Troubleshooting | Fix common problems | Symptom > cause > fix tables |

## Search and Discovery

Good documentation search:
- Indexes code blocks (developers search for method names)
- Handles typos and partial matches
- Shows code snippets in results (not paragraph excerpts)
- Weights recent content higher
- Tracks "no results" queries to find documentation gaps

## Feedback Loops

Every documentation page needs:
- Was this helpful? (thumbs up/down)
- Optional comment field for "what was missing?"
- "Edit this page" link to source repository
- Last updated date (stale docs erode trust)

Aggregate feedback weekly to prioritize doc improvements.

## Measuring DX

| Metric | Target | How to measure |
|--------|--------|----------------|
| Time-to-first-call | <5 min | User testing, analytics |
| First-week API calls | >100 | API analytics |
| Support ticket rate | <5% of new users | Support system |
| Doc search success | >80% queries find result | Search analytics |
| Page helpfulness | >70% thumbs up | Feedback widget |
| SDK adoption | >60% use SDK over raw HTTP | API analytics |

## Anti-Patterns

1. Feature-oriented navigation ("Products > Webhooks > Configuration") instead of task-oriented ("Set up webhooks")
2. Marketing language in technical docs ("next-generation", "powerful")
3. Outdated examples that no longer work
4. Login walls before docs access
5. Separate "API docs" and "developer docs" sites with different search
6. No versioning -- developers on v1 cannot find v1 docs after v2 launches
7. PDFs or Word docs as "documentation"
