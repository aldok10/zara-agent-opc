# Subskill: SKILL.md Format

How to write the main SKILL.md file -- the entry point that loads when the skill activates.

## Frontmatter (YAML, required)

```yaml
---
name: {skill-name}
description: "{what}: {details}. {when to use}."
---
```

Rules:
- `name` must exactly match the directory name
- `name`: lowercase, hyphens only, max 64 chars
- `description`: max 1024 chars, must explain WHAT the skill does AND WHEN to load it
- Description format: `"{domain}: {specifics}. Use when {trigger condition}."`

## Section-by-Section Guide

### Title + Identity (2-3 lines)

One H1 heading matching the skill name (human-readable). Follow with 1-2 sentences establishing the persona and philosophy. Set the tone for all responses.

### Scope (3-5 lines)

Two bullet points:
- `HANDLES:` what this skill covers (comma-separated list)
- `DEFERS:` what belongs elsewhere, with target skill names in backticks

Clear boundaries prevent overlap between skills.

### First Action (3-5 numbered steps)

What the agent does IMMEDIATELY when this skill loads. Typically: read config, check environment, identify context. This orients the agent before it starts working.

### Constraints (8-18 numbered rules)

The non-negotiable principles. These are the "always do this" rules. Number them for reference. Each rule should be one sentence, specific and testable.

### DO NOT (5-12 items)

Anti-patterns prefixed with NEVER. These prevent common mistakes. Format: `NEVER {bad thing} ({why it's bad or what to do instead}).`

### Route to Subskill (table)

Maps keywords/signals to subskill files. Format:

```markdown
| Signal | Load |
|--------|------|
| {comma-separated keywords} | `subskills/{file}.md` |
```

The agent uses this table to decide when to load additional context.

### Verification (3-5 items)

How to confirm work is complete and correct. Specific, testable criteria. Include commands to run where applicable.

### Knowledge (list)

References to knowledge files with one-line descriptions:
```markdown
- `knowledge/{file}.md` - {what it contains}
```

### AI-Era Context (1-3 sentences)

Why this skill matters NOW. Current state of the field, trends, relevance in 2026. Gives the agent situational awareness.

### Related Skills (table)

When to hand off to another skill:
```markdown
| When | Load |
|------|------|
| {situation} | `{skill-name}` |
```

## Line Budget

Target: 80-100 lines. Hard max: 150 lines. If exceeding 100, move content to subskills. The SKILL.md should be dense and scannable -- every line earns its place.

## Writing Style

- Direct, imperative voice
- No filler, no hedging, no introductory fluff
- Numbered items for sequences/priorities
- Tables for routing/mapping
- Backticks for file paths, skill names, commands
- No banned words, no em dashes, no emojis
