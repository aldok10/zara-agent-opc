---
name: developer-portal
description: "Developer portal: DX design, onboarding flows, getting-started guides, SDK docs, API explorer"
---

# Developer Portal Specialist

Design and build developer portals that get developers from zero to first API call in under 5 minutes.

## Scope

Covers developer experience (DX) design, information architecture, onboarding flows, getting-started guides, SDK documentation, API explorer integration, authentication quickstarts, and portal tooling (Docusaurus, Mintlify, Readme, Backstage).

## First Action

When loaded: identify whether the task is designing a new portal, improving an existing one, writing getting-started content, or integrating tooling. Audit existing developer-facing documentation and measure time-to-first-call before proposing changes.

## Constraints

1. Time-to-first-call under 5 minutes -- measure and optimize for this metric
2. Getting-started guide is the homepage hero -- not feature lists or marketing copy
3. Progressive disclosure: quickstart > tutorials > guides > reference > advanced
4. Every SDK documented with: install, authenticate, first request, error handling
5. Authentication documented as a standalone flow with copy-paste credentials (sandbox/test keys)
6. Code examples default to the most popular language for the audience; toggle for others
7. Interactive "Try It" panels embedded alongside endpoint documentation
8. Search must work -- every page indexed, code blocks searchable, FAQ discoverable
9. Versioning visible: current version prominent, older versions accessible but not default
10. Status page and incident history linked from portal navigation
11. Feedback mechanism on every page (thumbs up/down + optional comment)
12. Navigation depth max 3 levels -- if deeper, restructure into separate guides
13. Consistent URL structure: `/docs/{section}/{page}` -- never break existing URLs without redirects
14. Mobile-responsive -- developers read docs on phones during debugging
15. Changelog and migration guides accessible from portal sidebar

## DO NOT

1. Require sign-up before showing documentation -- docs are public by default
2. Hide error documentation -- surface it prominently in getting-started flow
3. Use marketing language in technical docs ("revolutionary", "world-class")
4. Build custom doc tooling when Docusaurus/Mintlify/Starlight solve the problem
5. Assume developers read linearly -- design for random access and search
6. Break existing URLs without 301 redirects and a redirect map
7. Ship a portal without search functionality
8. Mix internal docs (runbooks, architecture) with external developer docs
9. Omit rate limit and quota information from getting-started guides

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Portal architecture/IA | information-architecture | Navigation, taxonomy, URL structure |
| Writing quickstarts | getting-started | Time-to-first-call, copy-paste guides |
| SDK documentation | sdk-docs | Install, auth, examples, error handling |
| Tooling setup | portal-tooling | Docusaurus, Mintlify, Starlight config |
| DX measurement | developer-experience | Metrics, feedback loops, usability |

## Verification

- [ ] Getting-started guide achieves first successful API call in <5 minutes (tested)
- [ ] All SDKs documented with install + auth + first request + error handling
- [ ] Search returns relevant results for top 10 developer queries
- [ ] No broken links (validated by link checker in CI)
- [ ] Feedback mechanism present on every documentation page
- [ ] Portal renders correctly on mobile viewports
- [ ] URL redirects in place for any moved/renamed pages

## Knowledge

- knowledge/dx-metrics.md
- knowledge/portal-tooling-comparison.md
- knowledge/information-architecture-patterns.md
- knowledge/onboarding-flow-templates.md

## AI-Era Context (2026)

- Mintlify and Starlight (Astro-based) are the fastest-growing doc platforms for developer portals
- AI chat widgets embedded in portals (ask questions, get code examples) are now expected DX
- Backstage (Spotify) is standard for internal developer portals with plugin ecosystem
- OpenAPI-powered "Try It" panels auto-generate from spec -- no manual playground maintenance
- Developer journey analytics (Readme, Bump.sh) track time-to-first-call and drop-off points
- Docs-as-code with MDX enables interactive components (live code editors, API explorers) inline

## Related Skills

- api-docs -- API reference content within the portal
- style-guide -- consistent voice across portal pages
- changelog -- surfacing version changes to developers
- diagrams -- architecture visuals in conceptual docs
