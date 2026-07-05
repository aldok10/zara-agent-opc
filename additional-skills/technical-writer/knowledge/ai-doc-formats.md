# AI Documentation Formats Reference

Specifications for documentation consumed by AI agents, LLMs, and coding assistants.

## OKF / SKILL.md Specification

### Structure

```
[frontmatter]    -- YAML between --- delimiters (machine metadata)
[body]           -- Markdown sections in fixed order (agent instructions)
[file refs]      -- Relative paths to subskills/knowledge (depth on demand)
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| name | yes | Skill identifier, kebab-case |
| description | yes | One-line routing description (< 120 chars) |
| version | no | Semver if skill is versioned |
| depends | no | List of prerequisite skills |

### Body Sections (fixed order)

1. `# Title` -- skill name in natural language
2. Scope statement (1-2 sentences)
3. `## When to Use` -- activation triggers
4. `## Principles` -- numbered decision rules
5. `## Route to Expert` -- signal-to-subskill table
6. `## DO NOT` -- hard constraints
7. `## Verify` -- quality gate checklist

### File Organization

- Subskills: `subskills/[name].md` -- workflows, loaded on demand
- Knowledge: `knowledge/[topic].md` -- reference facts
- Templates: `templates/[name].md` -- fill-in scaffolds
- SKILL.md under 100 lines; subskills under 150; knowledge under 200

## llms.txt Format

Plain-text index helping AI agents discover documentation.

```markdown
# [Project Name]

> [One-sentence description]

## Docs

- [Page Title](relative/path.md): What question this page answers
- [Page Title](relative/path.md): Brief content description

## Optional

- [Page Title](relative/path.md): Supplementary content
```

Rules:
- Lives at project root: `/llms.txt`
- Max 50 entries; group by priority (essential first)
- Paths relative to project root, no external URLs
- Update on every doc addition/removal

Extended variant (`llms-full.txt`): full content inlined, for projects under 100K tokens total.

## AGENTS.md Format

Project context loaded by AI coding assistants at session start.

### Purpose

Tell the agent everything needed to work in this codebase without questions. Prevent wrong assumptions.

### Canonical Sections

`# Project Instructions` with subsections: Stack, Conventions, Architecture, Workflow, Constraints, Dispatch (if multi-agent).

### Rules

- Under 500 lines (agent reads every session)
- Imperative voice: "Use ESM" not "We prefer ESM"
- Commands copy-pasteable, document current state only
- `AGENTS.md` (generic) or `CLAUDE.md` (Claude Code) -- both can coexist

## Docs-as-Code for AI Consumers

### Principles

1. Structured > narrative (tables and lists parse faster than prose)
2. Consistent formatting (same structure enables pattern matching)
3. Explicit metadata (state audience, purpose, freshness)
4. Cross-references via paths ("see `docs/arch.md`" not "see the architecture doc")
5. Versioned with code (same repo, same PR, same review)

### Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Long prose paragraphs | Poor extraction | Headed sections + lists |
| Implicit assumptions | AI cannot infer | State in AGENTS.md |
| External-only docs | AI can't fetch URLs | Mirror locally |
| Stale docs | Wrong instructions | Date stamp + review cadence |
| Deep nesting | Context loss | Max 2 levels deep |

### Token Budget Guidelines

| Document Type | Target | Max |
|--------------|--------|-----|
| AGENTS.md | 200 lines | 500 lines |
| README.md | 100 lines | 300 lines |
| SKILL.md | 50 lines | 100 lines |
| Subskill | 80 lines | 150 lines |
| Knowledge file | 100 lines | 200 lines |
| llms.txt | 30 entries | 50 entries |
