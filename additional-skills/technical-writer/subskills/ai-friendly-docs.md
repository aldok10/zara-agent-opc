# AI-Friendly Documentation Subskill

## When to Load

Activate when writing documentation consumed by AI agents or coding assistants:
- Project README.md as AI entry point
- llms.txt index files
- AGENTS.md / CLAUDE.md project context files
- OKF skill files (SKILL.md format)

## Core Principles

1. Frontload: most important information first (context windows are finite)
2. Structured over prose: tables, headers, lists parse better than paragraphs
3. Explicit over implicit: state assumptions, don't expect inference
4. Token-aware: every token must earn its place
5. Progressive disclosure: summary first, depth via file references

## OKF / SKILL.md Structure

```markdown
---
name: skill-name
description: "One-line for routing (< 120 chars)"
---
# Title
Scope (1-2 sentences).
## When to Use -- activation triggers
## Principles -- numbered decision rules
## Route to Expert -- signal-to-subskill table
## DO NOT -- hard constraints
## Verify -- quality gate checklist
```

Frontmatter is machine-parsed. Body follows fixed section order. Under 100 lines.

## llms.txt Structure

```markdown
# Project Name
> One-line description
## Docs
- [Page](path.md): What question this answers
## Optional
- [Page](path.md): Supplementary content
```

Max 50 entries. Descriptions after colon help AI route. Essential docs first.

## AGENTS.md Pattern

```markdown
# Project Instructions
## Stack -- language, framework, runtime, versions
## Conventions -- style, naming, organization
## Architecture -- layers, boundaries, data flow (brief)
## Workflow -- build, test, lint commands (copy-pasteable)
## Constraints -- anti-patterns, protected areas
```

Under 500 lines. Imperative voice. No aspirational content. Update when reality changes.

## README.md for AI Consumption

Priority order (AI may truncate from bottom):
1. Name + one-line description
2. Quick Start (numbered, copy-pasteable)
3. Key Concepts (domain terms)
4. Project Structure (directory tree with descriptions)
5. Development (build/test/lint)
6. Architecture overview

## Token-Aware Writing Rules

- Cut adjectives: "processes requests" not "efficiently processes incoming requests"
- Tables for structured data (3+ attributes = table)
- Code blocks over descriptions: show the command
- One concept per header (enables selective reading)
- No introductory paragraphs: start with content
- Avoid relative time: "added in v2.3" not "recently added"

## Markdown for LLM Parsing

- Headers as semantic boundaries, consistent hierarchy (no skipping levels)
- Tables for 2+ dimension data
- Code blocks with language annotation
- Bullet lists for unordered, numbered for sequences
- Bold only for terms being defined
- Blank line before/after every block element

## Verification

- [ ] Critical info appears in first 30 lines
- [ ] No section exceeds 50 lines without sub-headers
- [ ] All code blocks have language annotations
- [ ] No filler phrases or banned words
- [ ] README < 300 lines, AGENTS.md < 500, SKILL.md < 100
