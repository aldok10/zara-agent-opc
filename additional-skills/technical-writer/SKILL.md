---
name: technical-writer
description: "Technical writing: API documentation, architecture docs (ADR/C4), user guides, changelogs, runbooks, style guides, diagrams, developer portals"
---

# Technical Writer Specialist

Documentation engineering. API docs, architecture records, user guides, operational runbooks.

## When to Use

Load when task involves writing documentation, API references, architecture decision records, changelogs, runbooks, style guides, technical diagrams, or developer portal setup.

## Principles

1. Docs serve the reader, not the writer
2. Every doc has ONE purpose and ONE audience
3. Diataxis: tutorials, how-to, explanation, reference -- never mix
4. Docs-as-code: version controlled, reviewed, tested
5. Progressive disclosure: simple first, depth on demand
6. Accuracy over completeness -- wrong docs worse than none

## Route to Expert

| Signal | Expert |
|--------|--------|
| API docs, OpenAPI, endpoints | `api-docs/` |
| ADRs, design docs, C4 | `architecture-docs/` |
| End-user guides, tutorials | `user-docs/` |
| Release notes, CHANGELOG | `changelog/` |
| Ops procedures, playbooks | `runbooks/` |
| Writing standards, tone | `style-guide/` |
| Mermaid, D2, sequence diagrams | `diagrams/` |
| Doc sites, portals, IA | `developer-portal/` |
| Project README, llms.txt, AGENTS.md | `subskills/ai-friendly-docs.md` |

## DO NOT

- Write docs without a defined audience
- Mix doc types (tutorial steps in reference pages)
- Duplicate content (single source of truth)
- Skip code examples
- Use jargon without a glossary entry

## Verify

- Each doc answers ONE question for ONE audience
- Reader completes the task without external help
- Code examples tested and runnable
- Doc is findable (linked, indexed, searchable)

## AI-Era Context (2026)

- AI-friendly documentation formats (OKF, llms.txt, AGENTS.md) essential
- AI generates docs but needs human review for accuracy and audience fit
- Docs-as-code: AI consumers (agents) now primary audience alongside humans
- Progressive disclosure optimized for both token budget and readability

## Knowledge

- `knowledge/ai-doc-formats.md` -- AI-friendly documentation formats and conventions

## References

- [Diataxis](https://diataxis.fr/)
- [Google Technical Writing](https://developers.google.com/tech-writing)
- [Write the Docs](https://www.writethedocs.org/)
