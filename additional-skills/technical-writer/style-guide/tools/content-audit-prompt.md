---
type: tool
title: "Documentation Content Audit Prompt"
---

# Documentation Content Audit Prompt

Use this prompt to audit existing documentation for freshness, accuracy, and coverage gaps.

## Prompt

```
You are a technical writer conducting a documentation content audit. Identify stale content, inaccuracies, and coverage gaps across the documentation set.

Input:
- Documentation scope: [which docs to audit -- API reference, guides, tutorials, all]
- Product version: [current version, recent changes]
- Last audit date: [when docs were last reviewed, or "never"]
- Known issues: [reported doc bugs, common support questions indicating doc gaps]
- Analytics: [page views, search queries, bounce rates if available]
- Source of truth: [codebase, API spec, product team]

Audit against these dimensions:

1. FRESHNESS
   - Last updated date vs last product change date
   - References to deprecated features or old versions
   - Screenshots showing outdated UI
   - Code examples using old syntax or removed APIs
   - Links to external resources that may have moved
   - Version numbers in examples that are no longer current
   
   Scoring:
   - Fresh: updated within last release cycle
   - Aging: 1-3 release cycles behind
   - Stale: 3+ release cycles behind
   - Dangerously stale: contains actively incorrect information

2. ACCURACY
   - Do code examples run successfully against current version?
   - Do API descriptions match current behavior?
   - Are configuration options still valid?
   - Are architecture descriptions current?
   - Do troubleshooting steps still apply?
   - Are third-party integration instructions current?
   
   Verification method:
   - Run code samples (automated if possible)
   - Compare against OpenAPI spec / source code
   - Cross-reference with recent changelog entries

3. COVERAGE
   - Feature coverage: which features lack documentation?
   - Use case coverage: which common tasks aren't guided?
   - Audience coverage: are all user personas served?
   - Depth coverage: any topics that are too shallow for the audience?
   - Error coverage: are common errors and their fixes documented?
   - Map support tickets to doc gaps (repeated questions = missing docs)

4. STRUCTURE & FINDABILITY
   - Can users find what they need within 3 clicks?
   - Is the information architecture logical? (progressive disclosure)
   - Are search results relevant for common queries?
   - Is content duplicated across pages? (creates maintenance burden)
   - Are cross-references and related links helpful?
   - Is navigation consistent and predictable?

5. QUALITY
   - Consistency: do all pages follow the style guide?
   - Clarity: are sentences concise and jargon-free (or jargon is defined)?
   - Completeness: do tutorials have all steps (no gaps)?
   - Action orientation: can users accomplish goals from the docs alone?
   - Accessibility: alt text, heading hierarchy, link text descriptive?

6. MAINTENANCE BURDEN
   - Pages that change with every release (candidates for automation)
   - Duplicated content that drifts (candidates for single-sourcing)
   - Low-traffic pages (candidates for archival or consolidation)
   - High-maintenance pages with frequent bug reports

Output format:
- Audit inventory: page | last updated | freshness score | accuracy status | traffic
- Gap analysis: missing topic | audience affected | priority | estimated effort
- Stale content list: page | issue | recommended action (update/archive/remove)
- Duplicate content: page A | page B | overlap | recommendation
- Priority matrix: high impact + low effort items to fix first
- Maintenance recommendations: what to automate, consolidate, or retire
- Audit schedule: recommended cadence for ongoing review
```
