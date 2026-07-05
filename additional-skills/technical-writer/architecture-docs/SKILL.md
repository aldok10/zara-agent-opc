---
name: architecture-docs
description: "Architecture documentation: C4 model, ADRs, system context diagrams, component maps, tech radar"
---

# Architecture Documentation Specialist

Document system architecture so teams can reason about, evolve, and onboard to complex systems.

## Scope

Covers C4 model (context, container, component, code), Architecture Decision Records (ADRs), system context diagrams, component interaction maps, tech radar maintenance, and architectural fitness functions documentation.

## First Action

When loaded: determine whether the task is creating a new ADR, documenting existing architecture, updating C4 diagrams, or maintaining a tech radar. Read existing docs in `docs/architecture/` or `docs/adr/` before proposing new structure.

## Constraints

1. C4 model as primary framework -- system context, container, component, code levels (top-down)
2. ADRs follow Michael Nygard format: Title, Status, Context, Decision, Consequences
3. ADR numbering sequential with zero-padded prefix (e.g., `0001-use-postgres.md`)
4. Every ADR must have Status field: proposed, accepted, deprecated, superseded
5. Superseded ADRs link to replacement; deprecated ADRs state migration path
6. System context diagram required for every bounded context or service boundary
7. Container diagrams show deployment units, data stores, and communication protocols
8. Component diagrams reserved for complex containers -- do not over-document simple services
9. Tech radar uses four rings: Adopt, Trial, Assess, Hold -- with movement justification
10. All diagrams rendered from code (Mermaid, D2, Structurizr DSL) -- no opaque image files
11. Non-functional requirements (NFRs) documented per component: latency, throughput, availability
12. Failure modes documented for every inter-service communication path
13. Data flow diagrams required for PII/sensitive data paths
14. Architecture docs live in version control alongside code -- never in external wikis alone
15. Review cadence: ADRs at decision time, C4 diagrams quarterly, tech radar bi-annually

## DO NOT

1. Create ADRs for trivial decisions (library minor version bumps, formatting choices)
2. Use C4 code-level diagrams for everything -- reserve for genuinely complex internals
3. Store diagrams as binary images without source -- always keep diagram-as-code source
4. Write ADRs after the fact without noting "retroactive" in context
5. Mix architectural concerns with operational runbooks -- keep separate
6. Document aspirational architecture without marking it clearly as "target state"
7. Skip consequences section in ADRs -- both positive and negative tradeoffs required
8. Let tech radar entries stagnate -- every entry needs a review date
9. Use proprietary tools (Confluence-only diagrams) as single source of truth

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Recording a design decision | adr-writing | Nygard format, context framing, consequences |
| Creating system diagrams | c4-modeling | Context/container/component views |
| Technology evaluation | tech-radar | Ring placement, movement justification |
| Documenting data flows | data-architecture | PII paths, storage decisions, flow diagrams |
| Fitness functions | quality-attributes | NFRs, SLOs, architectural tests |

## Verification

- [ ] ADRs follow Nygard format with all five sections populated
- [ ] C4 system context diagram exists and matches current service boundaries
- [ ] All diagrams render from version-controlled source code
- [ ] Tech radar entries have review dates and ring justification
- [ ] NFRs documented per container with measurable targets
- [ ] Superseded/deprecated ADRs link to successors
- [ ] Architecture docs are discoverable from project README

## Knowledge

- knowledge/c4-model-guide.md
- knowledge/adr-templates.md
- knowledge/tech-radar-management.md
- knowledge/structurizr-dsl.md

## AI-Era Context (2026)

- Structurizr DSL and Lite are the standard for C4-as-code with auto-rendered diagrams
- ADR tools (adr-tools, Log4brains) integrate with CI to enforce ADR creation on architectural PRs
- AI-assisted architecture review can validate diagrams against running infrastructure (drift detection)
- Architecture-as-code movement treats docs as testable artifacts with fitness function CI checks
- Tech radar tools (Thoughtworks, Backstage plugin) auto-surface adoption metrics from dependency graphs
- LLM-powered search over ADR corpus enables "why did we choose X?" queries for onboarding

## Related Skills

- diagrams -- rendering engine choice and syntax
- api-docs -- API contracts within architecture boundaries
- runbooks -- operational procedures for documented components
- style-guide -- consistent terminology across architecture docs
