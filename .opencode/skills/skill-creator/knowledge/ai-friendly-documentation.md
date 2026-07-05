---
type: fact
title: "AI-Friendly Documentation - llms.txt, AGENTS.md, Context7"
---

# AI-Friendly Documentation

How to write documentation that AI agents can consume efficiently. Covers standards, conventions, and practical techniques for making content machine-readable without sacrificing human readability.

## llms.txt Standard

Proposed by Jeremy Howard (fast.ai). A convention for websites to provide LLM-friendly content at a well-known path.

### Core Concept

Place a file at `/llms.txt` on your domain that provides a structured summary of your site's content, optimized for LLM consumption.

### Format

```markdown
# Site Name

> Brief description of what this site/project does

## Docs

- [Getting Started](/docs/getting-started.md): Setup and installation
- [API Reference](/docs/api.md): Complete API documentation
- [Examples](/docs/examples.md): Working code examples

## Optional

- [Changelog](/CHANGELOG.md): Version history
- [Architecture](/docs/architecture.md): System design decisions
```

### Key Principles

- Markdown-native (not HTML with markup stripped)
- Hierarchical with clear section delineation
- Links point to markdown/plain-text versions where available
- Token-efficient: no boilerplate, navigation chrome, or repeated headers
- Progressive: summary first, details linked

### Extended: llms-full.txt

For sites with extensive docs, `llms-full.txt` provides the complete content inline rather than linking. Useful when you want LLMs to have full context without multiple fetches.

## AGENTS.md Convention

Project-level instructions for AI coding assistants. Placed at repository root.

### Purpose

- Define task routing (which agent handles what)
- Set constraints and coding standards
- Declare workflow expectations
- Specify file ownership and modification rules

### Structure Pattern

```markdown
# Project Instructions

[Brief project description]

## Stack
[Languages, frameworks, key dependencies]

## Conventions
[Coding style, naming, file organization]

## Workflow
[How to approach tasks: plan > execute > verify]

## Constraints
[What NOT to do, boundaries, protected files]
```

### Best Practices

- Keep under 500 lines (token budget matters)
- Front-load critical constraints (LLMs weight early content higher)
- Use imperative voice ("Use X" not "We prefer X")
- Reference file paths explicitly
- Avoid conditional logic trees (LLMs handle flat rules better than nested if/else)

## CLAUDE.md Convention

Anthropic's recommended project-level instructions for Claude-based tools.

### Differences from AGENTS.md

- More specific to Claude's behavior model
- Supports memory/persistence instructions
- Can include personality/voice directives
- Often paired with `.claude/` directory for additional config

### Pattern

```markdown
# Project Context

## Role
[What Claude should act as in this project]

## Key Files
[Critical files to read before making changes]

## Rules
[Non-negotiable constraints]

## Style
[Voice, tone, formatting preferences]
```

## Progressive Disclosure for LLMs

Apply UX progressive disclosure principles to AI documentation.

### Layer Model

1. **Surface** (always loaded): Project name, stack, critical constraints, file map
2. **Routing** (loaded on demand): Topic-specific instructions, workflow steps
3. **Deep** (loaded when needed): Full specifications, examples, edge cases

### Implementation

- SKILL.md = surface layer (< 200 lines)
- subskills/ = routing layer (topic files)
- knowledge/ = deep layer (reference material)
- examples/ = working code (copy-paste ready)

### Why It Works

LLMs have finite context windows. Loading everything upfront wastes tokens on irrelevant content. Progressive disclosure means the agent loads only what's needed for the current task.

## Context7 Documentation Format

Queryable documentation optimized for AI consumption via MCP.

### How It Works

- Documentation is indexed and chunked for semantic search
- AI agents query specific topics rather than loading full docs
- Returns relevant snippets with code examples
- Version-aware: can target specific library versions

### Writing for Context7

- Use clear, descriptive headings (they become search targets)
- Keep code examples self-contained (no cross-file dependencies)
- One concept per section (aids chunking)
- Include function signatures near usage examples

## Chunking Strategies

How to structure content so it chunks well for embedding and retrieval.

### Principles

1. **Semantic completeness**: Each chunk should make sense in isolation
2. **Heading boundaries**: Chunk at heading level, not arbitrary line counts
3. **Code-prose pairing**: Keep code and its explanation together
4. **Size targets**: 200-800 tokens per chunk works well for most retrievers

### Anti-patterns

- Long paragraphs without headings (forces awkward splits)
- Code examples that reference variables defined elsewhere
- Tables that span many pages (split into logical groups)
- Deeply nested lists (flatten or break into sections)

## Embedding-Friendly Writing

Optimize text for vector similarity search.

### Techniques

- Lead each section with a clear topic sentence
- Use specific nouns over pronouns (aids retrieval without context)
- Repeat key terms naturally (helps embedding models associate content)
- Avoid ambiguous references ("this", "it", "the above")
- Front-load the most important information in each paragraph

### Structural Patterns

```markdown
## [Topic Noun] - [Action/Purpose]

[Topic noun] does [specific thing]. Use it when [condition].

### Usage

[code example]

### Parameters

[table or list with specifics]
```

## Token-Efficient Formatting

Reduce token usage while preserving information density.

### Do

- Use tables for structured comparisons (fewer tokens than prose)
- Prefer lists over paragraphs for enumerations
- Use code blocks for structured data (parsed more reliably)
- Abbreviate consistently (define once, use throughout)
- Use headers as context anchors (cheaper than repeating context)

### Avoid

- Filler phrases ("It is important to note that...")
- Redundant introductions to sections
- Verbose error messages in examples (use `...` for irrelevant parts)
- Full file contents when a diff suffices
- Navigation breadcrumbs, "back to top" links, table of contents in short docs

### Token Cost Reference

| Format | Tokens (approx) |
|--------|-----------------|
| 1 word | 1-2 tokens |
| 1 line of code | 10-20 tokens |
| 1 paragraph (3 sentences) | 40-60 tokens |
| 1 markdown table row | 15-25 tokens |
| 1 heading + 1 paragraph | 50-80 tokens |

## Cross-Format Compatibility

Writing docs that work across multiple AI systems simultaneously.

### Universal Rules

- Markdown is the lingua franca (all systems parse it well)
- Heading hierarchy matters (H1 > H2 > H3, no skipping)
- Fenced code blocks with language tags (aids parsing and syntax highlighting)
- Explicit over implicit (spell out what you mean)
- No HTML within markdown (some systems strip it, causing content loss)

### Testing Your Docs

- Feed to multiple LLMs and ask "What does this project do?"
- Check if the AI can find specific instructions when asked
- Verify code examples are copy-paste functional
- Measure: can an AI complete a task using only your docs?
