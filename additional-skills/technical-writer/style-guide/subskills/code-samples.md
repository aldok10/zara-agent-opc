---
type: subskill
title: "Code Samples in Documentation"
---

# Code Samples in Documentation

## Core Concepts
- Code samples are the most-read part of technical documentation - readers scan for them first
- Types: inline snippets (single concept), complete examples (full working program), partial (relevant excerpt)
- Code samples are a contract: if it's in the docs, it must work
- Language coverage: provide examples in languages your audience uses, prioritized by adoption
- Samples teach patterns and idioms, not just syntax

## Key Practices
- Make every code sample copy-paste runnable - no hidden setup, no missing imports
- Include comments explaining "why" for non-obvious lines, not restating "what"
- Show output/response alongside the code so readers can verify their result
- Test code samples in CI - broken examples erode trust in all documentation
- Use realistic but simple data (real-looking names, plausible IDs) not "foo/bar/baz"

## Common Mistakes
- Pseudo-code presented as real code (readers try to run it, it fails, they lose trust)
- Samples that work only with specific versions but don't state version requirements
- Overly complex examples that demonstrate multiple concepts at once (hard to extract the lesson)

## When to Apply
- Writing API documentation, SDK guides, or library references
- Creating tutorials and getting-started guides
- Documenting configuration formats, CLI usage, or infrastructure-as-code patterns
