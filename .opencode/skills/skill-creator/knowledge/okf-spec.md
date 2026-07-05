---
type: fact
title: "OKF Agent Skills Specification"
---

# OKF Agent Skills Specification

The rules governing how agent skills are defined, discovered, and loaded. This is the contract between the skill author and the skill loader.

## Frontmatter Rules

SKILL.md and knowledge files require YAML frontmatter between `---` fences:

```yaml
---
name: skill-name
description: "Domain: specifics. Use when trigger condition."
---
```

For knowledge files:
```yaml
---
type: fact
title: "Human-Readable Title"
---
```

Subskill files do NOT use frontmatter.

## Name Constraints

- Lowercase only
- Hyphens as word separators (no underscores, no spaces)
- Max 64 characters
- Must match the directory name exactly
- Must be unique across all skill directories

Valid: `typescript-expert`, `ai-engineering`, `skill-creator`
Invalid: `TypeScript_Expert`, `ai engineering`, `sk` (too vague)

## Description Best Practices

Max 1024 characters. Must answer two questions:
1. WHAT does this skill do?
2. WHEN should it load?

Format: `"{domain}: {specifics}. Use when {trigger}."`

Good: `"TypeScript 5.9+: strict-first, type-safety, Node 24+/ESM"`
Good: `"Create and maintain agent skills: SKILL.md authoring, subskills, knowledge files. Use when asked to create a new skill or improve existing skills."`
Bad: `"Helps with TypeScript stuff"` (too vague, no trigger)
Bad: `"A skill for various programming tasks"` (says nothing)

## Progressive Disclosure (3 Levels)

The skill system is designed for minimal token usage:

**Level 1 -- SKILL.md (always loaded)**
Contains: identity, scope, constraints, routing table, verification.
Handles: 80% of queries within this domain.

**Level 2 -- Subskills (loaded on signal match)**
Contains: focused how-to for specific sub-topics.
Handles: the 15% that need more depth than SKILL.md provides.

**Level 3 -- Knowledge (loaded on explicit need)**
Contains: deep reference, specs, comparisons.
Handles: the 5% that need authoritative detail.

The loader reads SKILL.md, checks the routing table against the user's query, and loads matching subskills. Knowledge loads only when the agent explicitly requests it.

## File References

Within SKILL.md, reference other files using relative paths in backticks:
- `subskills/topic.md`
- `knowledge/spec.md`
- `examples/template/`
- `tools/prompt.md`

These paths are relative to the skill's root directory.

## Discovery

Skills are discovered by scanning skill directories for `SKILL.md` files with valid frontmatter. The `description` field is used for routing -- the skill loader matches user queries against descriptions to determine which skill to activate.

## Validation Checklist

A valid skill passes all of these:
1. Directory name matches `name` in frontmatter
2. `name` is lowercase, hyphens, max 64 chars
3. `description` is non-empty, max 1024 chars
4. SKILL.md has all required sections (Scope, First Action, Constraints, DO NOT, Verification)
5. All files referenced in routing tables exist on disk
6. No file exceeds 500 lines
7. SKILL.md is under 150 lines (target 80-100)
8. Knowledge files have `type` and `title` frontmatter
9. No banned words in any file
10. No em dashes in prose
