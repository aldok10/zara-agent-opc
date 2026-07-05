# Subskill: Knowledge File Writing

How to write effective knowledge files -- deep reference material that loads on demand.

## Purpose

Knowledge files are REFERENCE material: specs, comparisons, decision tables, deep facts. They answer "what is X?" and "how does X compare to Y?" -- NOT "how do I do X?" (that belongs in subskills).

## When to Create Knowledge vs Subskill vs Example

| Content Type | Goes In |
|-------------|---------|
| Step-by-step workflow, how-to | subskill |
| Deep reference, spec, comparison | knowledge |
| Working code/config to copy | example |
| Prompt template, checklist | tool |

Rule of thumb: if it has numbered steps the agent follows, it's a subskill. If it's facts the agent references while working, it's knowledge.

## File Format

```markdown
---
type: fact
title: "{Descriptive Title}"
---

# {Title}

{1-2 sentence overview: what this file covers and why it matters}

## {Section 1}
{content}

## {Section 2}
{content}
```

Frontmatter is required for knowledge files. `type` is always `fact`. `title` is human-readable.

## Structure Principles

1. Start with the mental model or core concept (orient the reader).
2. Use H2 sections to organize by topic, not by importance.
3. Include comparison tables when multiple options exist.
4. Code examples should be minimal but complete -- show the pattern, not boilerplate.
5. End with gotchas, edge cases, or common mistakes.

## Depth Guidelines

- Line budget: 100-150 lines per file.
- Go deep on ONE topic. If covering two topics, split into two files.
- Include specifics: version numbers, config keys, exact syntax.
- Avoid generalities that any developer already knows.
- Senior-level content: assume the reader knows the basics.

## Code Examples in Knowledge

```markdown
## Pattern: {name}

{1 sentence explaining when to use this}

\```{language}
{minimal working example}
\```

Why this works: {1 sentence}
```

Keep examples to 10-20 lines. Longer examples belong in the `examples/` directory.

## Comparison Tables

Effective for "which tool/approach should I use?" decisions:

```markdown
| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Use case | {when} | {when} | {when} |
| Tradeoff | {cost} | {cost} | {cost} |
| Verdict | {recommendation} |
```

## Common Mistakes

- Writing workflow instructions (belongs in subskills)
- Being too shallow (just restating docs)
- Missing code examples (knowledge needs concrete proof)
- Covering too many topics in one file
- Forgetting frontmatter
- Exceeding 150 lines (split the file)
