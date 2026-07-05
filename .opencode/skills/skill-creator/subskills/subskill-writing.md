---
type: subskill
title: "Subskill: Subskill File Writing"
---

# Subskill: Subskill File Writing

How to write focused subskill files that teach the agent ONE specific topic.

## Purpose

Subskills are workflow/instruction files. They load when the routing table in SKILL.md detects relevant signals. Each subskill answers "how do I handle {specific situation}?"

## File Format

```markdown
# Subskill: {Topic Name}

{1-2 sentence overview}

## When to Load

{Signals/keywords that trigger this subskill}

## Key Concepts

{Core ideas the agent needs before acting}

## Patterns

{The actual how-to: approaches, code, examples}

## Gotchas

{Common mistakes, edge cases, things that surprise people}

## Verification

{How to confirm the work using this subskill is correct}
```

No frontmatter in subskill files (unlike knowledge files).

## Scope Rule

ONE topic per file. If you find yourself writing "and also..." -- split it.

Good scope:
- "How to write boundary validation in TypeScript"
- "Git branching strategies for feature work"
- "Rate limiting middleware patterns"

Bad scope (too broad):
- "TypeScript patterns" (which patterns?)
- "Git operations" (too many topics)
- "API design" (could be a whole skill)

## Line Budget

Target: 60-100 lines. If approaching 100, ask: can anything move to a knowledge file?

## Writing Style for Subskills

1. Imperative voice: "Do X", "Use Y", "Avoid Z"
2. Show, don't just tell: include code examples for patterns
3. Start with WHY briefly, then HOW in detail
4. End with verification -- the agent should know when it's done
5. Use tables for decision matrices
6. Numbered lists for sequences, bullets for unordered items

## Code Examples in Subskills

Include 1-3 focused examples showing the pattern in action. Examples should be:
- Minimal (remove everything unrelated to the point)
- Correct (they will be copied)
- Commented only if the logic is non-obvious
- Language-appropriate for the skill's domain

## Connecting to SKILL.md

Every subskill must be referenced in the SKILL.md routing table:

```markdown
| Signal | Load |
|--------|------|
| {keywords that trigger loading this} | `subskills/{this-file}.md` |
```

If a subskill exists but has no route, it will never load.

## Common Mistakes

- Covering multiple topics (split them)
- Being too abstract (include concrete examples)
- Duplicating content from SKILL.md (reference it, don't repeat)
- Missing the verification section (agent doesn't know when done)
- Adding frontmatter (subskills don't use it)
- Writing reference material instead of instructions (that's knowledge)
