---
name: diagrams
description: "Technical diagrams: Mermaid, D2, PlantUML, diagrams-as-code, C4 notation, sequence diagrams"
---

# Technical Diagrams Specialist

Create and maintain technical diagrams as code -- version-controlled, reviewable, and auto-rendered.

## Scope

Covers diagram-as-code authoring (Mermaid, D2, PlantUML, Structurizr DSL), C4 model notation, sequence diagrams, flowcharts, entity-relationship diagrams, deployment diagrams, and CI rendering pipelines.

## First Action

When loaded: identify the diagram type needed and the existing tooling in the project. Check for Mermaid in markdown files, D2 configs, PlantUML jars, or Structurizr workspace files. Match the existing tool unless there is a clear reason to switch.

## Constraints

1. Diagrams-as-code only -- no binary image files (PNG/SVG) as source; generate from text
2. Mermaid for inline markdown diagrams (GitHub/GitLab native rendering)
3. D2 for complex diagrams needing layout control, styling, and composition
4. Structurizr DSL for C4 model diagrams specifically
5. PlantUML only when project already uses it -- do not introduce for new projects
6. Every diagram has a title and brief caption explaining what it shows
7. Sequence diagrams: max 7 participants, max 15 interactions per diagram -- split if larger
8. Flowcharts: max 12 nodes per diagram -- decompose complex flows into sub-diagrams
9. Use consistent naming: actors (PascalCase), systems (PascalCase), actions (lowercase verbs)
10. Color coding: external systems grey, internal systems blue, databases green, queues orange
11. Diagrams stored alongside the docs they support -- not in a separate /diagrams folder
12. CI pipeline renders diagrams on merge (GitHub Actions, GitLab CI) -- no manual export
13. Diagram source includes comments explaining non-obvious design choices
14. Accessibility: alt-text for rendered images, high-contrast color schemes
15. Diagrams reviewed in PRs -- diff the source code, verify rendered output

## DO NOT

1. Create diagrams in GUI tools (Lucidchart, Draw.io) as the source of truth
2. Exceed complexity limits -- a diagram that needs zooming has too much detail
3. Use diagrams to replace written explanations -- they complement, not substitute
4. Mix notation systems in one project without clear justification
5. Hardcode absolute URLs or paths in diagram source
6. Use color as the only differentiator -- include labels and patterns for accessibility
7. Create diagrams without updating them when architecture changes
8. Use PlantUML for new projects -- Mermaid or D2 have better DX and rendering
9. Render diagrams at build time without caching -- use content-hash based caching

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| System architecture views | c4-diagrams | Structurizr DSL, context/container/component |
| API/integration flows | sequence-diagrams | Mermaid/D2 sequence syntax, participant management |
| Process/workflow docs | flowcharts | Decision trees, state machines, activity flows |
| Data modeling | er-diagrams | Entity relationships, cardinality, schema docs |
| Infrastructure layout | deployment-diagrams | Cloud architecture, network topology |

## Verification

- [ ] All diagrams render without errors from source code
- [ ] No diagram exceeds complexity limits (7 participants / 12 nodes)
- [ ] Consistent color coding and naming conventions applied
- [ ] Diagrams have titles and captions
- [ ] CI renders diagrams automatically on merge
- [ ] Alt-text present for all rendered diagram images
- [ ] Source files are collocated with related documentation

## Knowledge

- knowledge/mermaid-syntax-reference.md
- knowledge/d2-layout-engines.md
- knowledge/structurizr-dsl-guide.md
- knowledge/diagram-ci-pipelines.md

## AI-Era Context (2026)

- Mermaid is natively rendered by GitHub, GitLab, Notion, and most documentation platforms
- D2 v1.x is stable with TALA layout engine for production-quality auto-layout
- GitHub now renders D2 in markdown (preview feature) alongside Mermaid
- AI-assisted diagram generation from natural language descriptions is production-viable
- Structurizr Lite runs locally for C4 workspace editing with live preview
- Diagram diffing tools (d2 diff, mermaid-diff) enable visual PR reviews
- SVG output with embedded links enables clickable, interactive architecture maps

## Related Skills

- architecture-docs -- C4 model diagrams within architecture documentation
- api-docs -- sequence diagrams for API interaction flows
- runbooks -- decision tree diagrams for incident response
- developer-portal -- embedded diagrams in conceptual documentation
